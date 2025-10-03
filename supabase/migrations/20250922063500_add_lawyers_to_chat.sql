-- Add lawyers support to chat system

-- Update conversations select policy to include lawyers and lovepay
DROP POLICY IF EXISTS "Conversations select" ON conversations;
DROP POLICY IF EXISTS "Conversations select lovepay" ON conversations;
DROP POLICY IF EXISTS "Conversations select lawyers" ON conversations;

CREATE POLICY "Conversations select" ON conversations
FOR SELECT TO authenticated USING (
  -- Original participants (buyer, realtor)
  auth.uid() = buyer_id OR auth.uid() = realtor_id
  OR
  -- Love&Pay staff
  public.is_lovepay()
  OR
  -- Lawyers involved in sales requests for this conversation
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lawyer')
    AND EXISTS (
      SELECT 1 FROM sales_requests s
      WHERE s.property_id = conversations.property_id
        AND (s.buyer_id = conversations.buyer_id OR s.realtor_id = conversations.realtor_id)
        AND s.lawyer_id = auth.uid()
    )
  )
);

-- Update conversations insert and update policies
DROP POLICY IF EXISTS "Conversations insert" ON conversations;
DROP POLICY IF EXISTS "Conversations insert lovepay" ON conversations;

CREATE POLICY "Conversations insert" ON conversations
FOR INSERT TO authenticated WITH CHECK (
  -- Allow buyers and realtors to create conversations
  auth.uid() = buyer_id OR auth.uid() = realtor_id
  OR
  -- Allow Love&Pay to create conversations
  public.is_lovepay()
);

DROP POLICY IF EXISTS "Conversations update" ON conversations;

CREATE POLICY "Conversations update" ON conversations
FOR UPDATE TO authenticated USING (
  -- Original participants
  auth.uid() = buyer_id OR auth.uid() = realtor_id
  OR
  -- Love&Pay staff
  public.is_lovepay()
  OR
  -- Lawyers involved in sales requests
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lawyer')
    AND EXISTS (
      SELECT 1 FROM sales_requests s
      WHERE s.property_id = conversations.property_id
        AND (s.buyer_id = conversations.buyer_id OR s.realtor_id = conversations.realtor_id)
        AND s.lawyer_id = auth.uid()
    )
  )
) WITH CHECK (
  -- Same conditions for update
  auth.uid() = buyer_id OR auth.uid() = realtor_id
  OR
  public.is_lovepay()
  OR
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lawyer')
    AND EXISTS (
      SELECT 1 FROM sales_requests s
      WHERE s.property_id = conversations.property_id
        AND (s.buyer_id = conversations.buyer_id OR s.realtor_id = conversations.realtor_id)
        AND s.lawyer_id = auth.uid()
    )
  )
);

-- Update messages policies to include lawyers and lovepay
DROP POLICY IF EXISTS "Messages select" ON messages;
DROP POLICY IF EXISTS "Messages select lovepay" ON messages;
DROP POLICY IF EXISTS "Messages select lawyers" ON messages;

CREATE POLICY "Messages select" ON messages
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (
        -- Original participants
        c.buyer_id = auth.uid() OR c.realtor_id = auth.uid()
        OR
        -- Love&Pay staff
        public.is_lovepay()
        OR
        -- Lawyers involved in sales requests
        (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lawyer')
          AND EXISTS (
            SELECT 1 FROM sales_requests s
            WHERE s.property_id = c.property_id
              AND s.buyer_id = c.buyer_id
              AND s.realtor_id = c.realtor_id
              AND s.lawyer_id = auth.uid()
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Messages insert" ON messages;
DROP POLICY IF EXISTS "Messages insert lovepay" ON messages;
DROP POLICY IF EXISTS "Messages insert lawyers" ON messages;

CREATE POLICY "Messages insert" ON messages
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (
        -- Original participants
        c.buyer_id = auth.uid() OR c.realtor_id = auth.uid()
        OR
        -- Love&Pay staff
        public.is_lovepay()
        OR
        -- Lawyers involved in sales requests
        (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lawyer')
          AND EXISTS (
            SELECT 1 FROM sales_requests s
            WHERE s.property_id = c.property_id
              AND s.buyer_id = c.buyer_id
              AND s.realtor_id = c.realtor_id
              AND s.lawyer_id = auth.uid()
          )
        )
      )
  )
);

-- Add function to get conversation participants with roles
CREATE OR REPLACE FUNCTION get_conversation_participants(conversation_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as user_id,
    p.full_name,
    p.role,
    p.is_verified
  FROM profiles p
  WHERE p.id IN (
    -- Primary participants (buyer, realtor)
    SELECT unnest(ARRAY[c.buyer_id, c.realtor_id])
    FROM conversations c
    WHERE c.id = conversation_uuid

    UNION

    -- Lawyers involved in sales for this conversation
    SELECT s.lawyer_id
    FROM conversations c
    JOIN sales_requests s ON s.property_id = c.property_id
    WHERE c.id = conversation_uuid
      AND s.lawyer_id IS NOT NULL
      AND (s.buyer_id = c.buyer_id OR s.realtor_id = c.realtor_id)

    UNION

    -- Love&Pay staff who have sent messages in this conversation
    SELECT m.sender_id
    FROM messages m
    JOIN profiles p ON p.id = m.sender_id
    WHERE m.conversation_id = conversation_uuid
      AND p.role = 'lovepay'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversations for lawyers and Love&Pay staff
CREATE OR REPLACE FUNCTION get_lawyer_lovepay_conversations(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  buyer_id uuid,
  realtor_id uuid,
  created_at timestamptz,
  last_message_at timestamptz,
  property jsonb,
  buyer jsonb,
  realtor jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.property_id,
    c.buyer_id,
    c.realtor_id,
    c.created_at,
    c.last_message_at,
    row_to_json(p.*)::jsonb as property,
    row_to_json(b.*)::jsonb as buyer,
    row_to_json(r.*)::jsonb as realtor
  FROM conversations c
  LEFT JOIN properties p ON p.id = c.property_id
  LEFT JOIN profiles b ON b.id = c.buyer_id
  LEFT JOIN profiles r ON r.id = c.realtor_id
  WHERE
    -- For lawyers: conversations related to sales they handle
    (
      EXISTS (SELECT 1 FROM profiles WHERE id = user_uuid AND role = 'lawyer')
      AND EXISTS (
        SELECT 1 FROM sales_requests s
        WHERE s.property_id = c.property_id
          AND s.lawyer_id = user_uuid
          AND s.buyer_id = c.buyer_id
          AND s.realtor_id = c.realtor_id
      )
    )
    OR
    -- For Love&Pay: all conversations where property has sales requests
    (
      EXISTS (SELECT 1 FROM profiles WHERE id = user_uuid AND role = 'lovepay')
      AND EXISTS (
        SELECT 1 FROM sales_requests s
        WHERE s.property_id = c.property_id
      )
    )
  ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Debug function to check lawyer's sales requests
CREATE OR REPLACE FUNCTION debug_lawyer_sales(lawyer_uuid uuid)
RETURNS TABLE (
  sales_request_id uuid,
  property_id uuid,
  buyer_id uuid,
  realtor_id uuid,
  lawyer_id uuid,
  conversation_exists boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as sales_request_id,
    s.property_id,
    s.buyer_id,
    s.realtor_id,
    s.lawyer_id,
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.property_id = s.property_id
        AND c.buyer_id = s.buyer_id
        AND c.realtor_id = s.realtor_id
    ) as conversation_exists
  FROM sales_requests s
  WHERE s.lawyer_id = lawyer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple test function to check if RPC works
CREATE OR REPLACE FUNCTION test_lawyer_access(user_uuid uuid)
RETURNS TEXT AS $$
BEGIN
  RETURN 'RPC access works for user: ' || user_uuid::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
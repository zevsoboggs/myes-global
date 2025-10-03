-- Fix lawyer access to messages by aligning RLS policies with function logic

-- Update conversations select policy
DROP POLICY IF EXISTS "Conversations select" ON conversations;

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
        AND s.buyer_id = conversations.buyer_id
        AND s.realtor_id = conversations.realtor_id
        AND s.lawyer_id = auth.uid()
    )
  )
);

-- Update conversations update policy
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
        AND s.buyer_id = conversations.buyer_id
        AND s.realtor_id = conversations.realtor_id
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
        AND s.buyer_id = conversations.buyer_id
        AND s.realtor_id = conversations.realtor_id
        AND s.lawyer_id = auth.uid()
    )
  )
);

-- Update messages select policy
DROP POLICY IF EXISTS "Messages select" ON messages;

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

-- Update messages insert policy
DROP POLICY IF EXISTS "Messages insert" ON messages;

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
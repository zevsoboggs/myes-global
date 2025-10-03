-- Conversations: lovepay can read conversations related to sales requests
DROP POLICY IF EXISTS "Conversations select lovepay" ON conversations;
CREATE POLICY "Conversations select lovepay" ON conversations
FOR SELECT TO authenticated USING (
  public.is_lovepay() AND EXISTS (
    SELECT 1 FROM sales_requests s WHERE s.property_id = conversations.property_id
  )
);

-- Conversations: lovepay can insert for pairs that match existing sale request
DROP POLICY IF EXISTS "Conversations insert lovepay" ON conversations;
CREATE POLICY "Conversations insert lovepay" ON conversations
FOR INSERT TO authenticated WITH CHECK (
  public.is_lovepay() AND EXISTS (
    SELECT 1 FROM sales_requests s
    WHERE s.property_id = conversations.property_id
      AND s.buyer_id = conversations.buyer_id
      AND s.realtor_id = conversations.realtor_id
  )
);

-- Messages: lovepay can read messages for conversations related to sales
DROP POLICY IF EXISTS "Messages select lovepay" ON messages;
CREATE POLICY "Messages select lovepay" ON messages
FOR SELECT TO authenticated USING (
  public.is_lovepay() AND EXISTS (
    SELECT 1 FROM conversations c JOIN sales_requests s ON s.property_id = c.property_id
    WHERE c.id = messages.conversation_id
  )
);

-- Messages: lovepay can insert messages into conversations related to sales
DROP POLICY IF EXISTS "Messages insert lovepay" ON messages;
CREATE POLICY "Messages insert lovepay" ON messages
FOR INSERT TO authenticated WITH CHECK (
  public.is_lovepay() AND EXISTS (
    SELECT 1 FROM conversations c JOIN sales_requests s ON s.property_id = c.property_id
    WHERE c.id = messages.conversation_id
  )
); 
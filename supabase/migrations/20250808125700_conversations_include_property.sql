ALTER TABLE conversations ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Conversations update" ON conversations;
CREATE POLICY "Conversations update" ON conversations
FOR UPDATE TO authenticated USING (
  auth.uid() = buyer_id OR auth.uid() = realtor_id
) WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = realtor_id
); 
-- Add role to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer','realtor'));

-- Update trigger function to set role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  realtor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies: only participants can access
DROP POLICY IF EXISTS "Conversations select" ON conversations;
CREATE POLICY "Conversations select" ON conversations
FOR SELECT TO authenticated USING (
  auth.uid() = buyer_id OR auth.uid() = realtor_id
);

DROP POLICY IF EXISTS "Conversations insert" ON conversations;
CREATE POLICY "Conversations insert" ON conversations
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = realtor_id
);

DROP POLICY IF EXISTS "Conversations update" ON conversations;
CREATE POLICY "Conversations update" ON conversations
FOR UPDATE TO authenticated USING (
  auth.uid() = buyer_id OR auth.uid() = realtor_id
) WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = realtor_id
);

DROP POLICY IF EXISTS "Messages select" ON messages;
CREATE POLICY "Messages select" ON messages
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.realtor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Messages insert" ON messages;
CREATE POLICY "Messages insert" ON messages
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.realtor_id = auth.uid())
  )
);

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(buyer_id, realtor_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at); 
-- Ensure buyer and realtor are different and roles correct
ALTER TABLE conversations
  ADD CONSTRAINT conversations_buyer_not_realtor CHECK (buyer_id <> realtor_id);

-- Function to enforce roles on insert
CREATE OR REPLACE FUNCTION public.conversations_check_roles()
RETURNS trigger AS $$
DECLARE
  buyer_role text;
  realtor_role text;
BEGIN
  SELECT role INTO buyer_role FROM profiles WHERE id = NEW.buyer_id;
  SELECT role INTO realtor_role FROM profiles WHERE id = NEW.realtor_id;
  IF buyer_role IS NULL OR realtor_role IS NULL THEN
    RAISE EXCEPTION 'participants not found';
  END IF;
  IF buyer_role <> 'buyer' THEN
    RAISE EXCEPTION 'only buyer can be buyer_id';
  END IF;
  IF realtor_role <> 'realtor' THEN
    RAISE EXCEPTION 'only realtor can be realtor_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_conversations_check_roles ON conversations;
CREATE TRIGGER trg_conversations_check_roles
BEFORE INSERT ON conversations
FOR EACH ROW EXECUTE PROCEDURE public.conversations_check_roles();

-- RLS: only buyers can insert conversations they participate in
DROP POLICY IF EXISTS "Conversations insert" ON conversations;
CREATE POLICY "Conversations insert" ON conversations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
); 
-- Unique conversation by buyer+realtor+property
ALTER TABLE conversations
  ADD CONSTRAINT conversations_buyer_realtor_property_unique
  UNIQUE (buyer_id, realtor_id, property_id);

-- Update last_message_at when a new message inserted
CREATE OR REPLACE FUNCTION public.on_message_insert_update_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_message_insert_update_conversation ON messages;
CREATE TRIGGER trg_message_insert_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE PROCEDURE public.on_message_insert_update_conversation(); 
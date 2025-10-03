-- TEMPORARY: Disable referral trigger until main migration is applied
-- This allows registration to work without referral system

-- Drop the existing trigger that's causing the error
DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;

-- Create a safe no-op trigger
CREATE OR REPLACE FUNCTION safe_profile_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Do nothing for now, just return the new row
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the safe trigger
CREATE TRIGGER safe_profile_creation_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION safe_profile_trigger();

-- Note: After applying main referral migration, run:
-- DROP TRIGGER IF EXISTS safe_profile_creation_trigger ON profiles;
-- Temporary fix: Make referral code creation safe for existing profiles table
-- This migration can be applied independently

-- Update the existing trigger to handle missing referral_codes table gracefully
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create for buyers and only if referral_codes table exists
  IF NEW.role = 'buyer' THEN
    -- Check if referral_codes table exists before inserting
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'referral_codes'
    ) THEN
      -- Generate referral code only if table exists
      INSERT INTO referral_codes (user_id, code)
      VALUES (NEW.id, generate_referral_code(NEW.id))
      ON CONFLICT DO NOTHING; -- Ignore if already exists
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE LOG 'Failed to create referral code for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- =============================================
-- TEST: Auto referral code creation for new users
-- Date: 2025-09-22
-- Description: Test and ensure auto creation works
-- =============================================

-- 1. Check current triggers
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'trigger_create_buyer_referral_code')
ORDER BY trigger_name;

-- 2. Check the profile trigger function
SELECT prosrc
FROM pg_proc
WHERE proname = 'create_buyer_referral_code';

-- 3. Make sure the trigger function is robust
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that trigger was called
  RAISE LOG 'Profile trigger called for user % with role %', NEW.id, NEW.role;

  -- Only for buyers
  IF NEW.role = 'buyer' THEN
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE user_id = NEW.id) THEN
      BEGIN
        INSERT INTO referral_codes (user_id, code, is_active, current_uses)
        VALUES (NEW.id, generate_referral_code(NEW.id), true, 0);

        RAISE LOG 'Successfully created referral code for buyer: %', NEW.id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'Failed to create referral code for user %: %', NEW.id, SQLERRM;
      END;
    ELSE
      RAISE LOG 'Referral code already exists for user: %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- 5. Show confirmation
DO $$
BEGIN
  RAISE NOTICE 'Auto referral code creation should now work for new registrations';
END $$;
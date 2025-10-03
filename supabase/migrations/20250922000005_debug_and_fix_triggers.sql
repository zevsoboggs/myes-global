-- =============================================
-- DEBUG AND FIX: Referral code creation triggers
-- Date: 2025-09-22
-- Description: Debug and fix automatic referral code creation
-- =============================================

-- 1. Check existing triggers
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_schema = 'public';

-- 2. Check if handle_new_user function exists and what it does
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('handle_new_user', 'create_buyer_referral_code');

-- 3. Update the handle_new_user function to include referral code creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile entry
  INSERT INTO public.profiles (id, email, full_name, role, phone, agency_name, license_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'agency_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'license_number', NULL)
  );

  -- Create referral code if user is a buyer
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN
    INSERT INTO referral_codes (user_id, code, is_active, current_uses)
    VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the registration
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Also ensure the profile-based trigger works
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create for buyers
  IF NEW.role = 'buyer' THEN
    INSERT INTO referral_codes (user_id, code, is_active, current_uses)
    VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE LOG 'Created referral code for buyer: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Failed to create referral code for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Ensure both triggers exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- 6. Test the function directly
DO $$
DECLARE
  test_code TEXT;
BEGIN
  -- Test generate_referral_code function
  SELECT generate_referral_code('00000000-0000-0000-0000-000000000000'::UUID) INTO test_code;
  RAISE NOTICE 'Test referral code generated: %', test_code;
END $$;

-- 7. Check if referral_codes table has the right constraints
ALTER TABLE referral_codes DROP CONSTRAINT IF EXISTS referral_codes_user_id_key;
ALTER TABLE referral_codes ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);

-- 8. Create a test function to manually trigger referral code creation
CREATE OR REPLACE FUNCTION create_missing_referral_codes()
RETURNS INTEGER AS $$
DECLARE
  codes_created INTEGER := 0;
  buyer_record RECORD;
BEGIN
  FOR buyer_record IN
    SELECT id, full_name FROM profiles
    WHERE role = 'buyer'
      AND NOT EXISTS (SELECT 1 FROM referral_codes WHERE user_id = profiles.id)
  LOOP
    INSERT INTO referral_codes (user_id, code, is_active, current_uses)
    VALUES (buyer_record.id, generate_referral_code(buyer_record.id), true, 0);

    codes_created := codes_created + 1;
    RAISE LOG 'Created referral code for buyer: % (%)', buyer_record.full_name, buyer_record.id;
  END LOOP;

  RETURN codes_created;
END;
$$ LANGUAGE plpgsql;

-- Run the function to create any missing codes
SELECT create_missing_referral_codes() as codes_created;
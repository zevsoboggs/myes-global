-- =============================================
-- FIX: Auto referral code creation for new registrations
-- Date: 2025-09-22
-- Description: Fix triggers to automatically create referral codes
-- =============================================

-- 1. First check current triggers
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('profiles', 'users')
AND trigger_schema IN ('public', 'auth');

-- 2. Update handle_new_user to ensure it creates referral codes
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

  -- ALWAYS create referral code for buyers (which is default role)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN
    INSERT INTO referral_codes (user_id, code, is_active, current_uses)
    VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE LOG 'Created referral code for new buyer: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Also update the profile-based trigger as backup
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Create referral code for buyers
  IF NEW.role = 'buyer' THEN
    INSERT INTO referral_codes (user_id, code, is_active, current_uses)
    VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE LOG 'Profile trigger: Created referral code for buyer: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Profile trigger: Failed to create referral code for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Ensure both triggers are active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- 5. Test that triggers are working
DO $$
BEGIN
  RAISE NOTICE 'Triggers updated successfully. New registrations should auto-create referral codes.';
END $$;
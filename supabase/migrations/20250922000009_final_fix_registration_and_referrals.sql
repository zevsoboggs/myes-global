-- =============================================
-- FINAL FIX: Registration + Auto Referral Codes
-- Date: 2025-09-22
-- Description: Fix registration while keeping auto referral code creation
-- =============================================

-- 1. Restore working handle_new_user function from migration 006
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile entry first (CRITICAL - this must work)
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

  -- Create referral code if user is a buyer (separate try-catch for this)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'buyer') = 'buyer' THEN
    BEGIN
      -- Check if referral_codes table exists and function exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'referral_codes'
      ) AND EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'generate_referral_code'
      ) THEN
        INSERT INTO referral_codes (user_id, code, is_active, current_uses)
        VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
        ON CONFLICT (user_id) DO NOTHING;

        RAISE LOG 'Created referral code for new buyer: %', NEW.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the profile creation
        RAISE LOG 'Error creating referral code for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise to fail the trigger if profile creation fails
    RAISE LOG 'Critical error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Keep the backup profile trigger simple and safe
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create for buyers and only if not already exists
  IF NEW.role = 'buyer' AND NOT EXISTS (
    SELECT 1 FROM referral_codes WHERE user_id = NEW.id
  ) THEN
    BEGIN
      INSERT INTO referral_codes (user_id, code, is_active, current_uses)
      VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
      ON CONFLICT (user_id) DO NOTHING;

      RAISE LOG 'Profile trigger: Created referral code for buyer: %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Profile trigger: Failed to create referral code for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure triggers are properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- 4. Test notification
DO $$
BEGIN
  RAISE NOTICE 'Registration and referral code creation should now work properly';
END $$;
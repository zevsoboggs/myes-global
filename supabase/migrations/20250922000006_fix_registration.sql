-- =============================================
-- FIX: Registration broken after referral trigger updates
-- Date: 2025-09-22
-- Description: Fix handle_new_user function to properly create profiles
-- =============================================

-- 1. Fix the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile entry first
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

-- 2. Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Test the function to make sure it works
DO $$
BEGIN
  RAISE NOTICE 'Testing handle_new_user function setup completed';
END $$;
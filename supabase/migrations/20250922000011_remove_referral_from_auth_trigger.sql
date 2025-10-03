-- =============================================
-- FIX: Remove referral code creation from auth trigger
-- Date: 2025-09-22
-- Description: Fix registration by removing referral logic from auth trigger
-- =============================================

-- 1. Simplify handle_new_user - ONLY create profile, NO referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- ONLY create profile entry - nothing else
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create referral codes ONLY through profile trigger
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for buyers and only if table exists
  IF NEW.role = 'buyer' THEN
    BEGIN
      INSERT INTO public.referral_codes (user_id, code, is_active, current_uses)
      VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
      ON CONFLICT (user_id) DO NOTHING;

      RAISE LOG 'Created referral code for buyer: %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Failed to create referral code: %', SQLERRM;
        -- Don't fail the trigger
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure auth trigger is clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Ensure profile trigger exists
DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- Success
DO $$
BEGIN
  RAISE NOTICE 'Registration fixed - referral codes will be created via profile trigger';
END $$;
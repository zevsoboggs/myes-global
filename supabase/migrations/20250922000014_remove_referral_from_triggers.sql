-- =============================================
-- FINAL FIX: Remove referral codes from ALL triggers
-- Date: 2025-09-22
-- Description: Remove referral logic from triggers completely
-- =============================================

-- 1. Clean auth trigger - ONLY create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- ONLY create profile - NO referral codes
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

-- 2. Remove profile trigger completely
DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
DROP FUNCTION IF EXISTS create_buyer_referral_code();

-- 3. Create a simple function to create referral codes manually
CREATE OR REPLACE FUNCTION create_referral_code_for_user(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Check if user is buyer
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_param AND role = 'buyer') THEN
    RETURN NULL;
  END IF;

  -- Check if code already exists
  IF EXISTS (SELECT 1 FROM referral_codes WHERE user_id = user_id_param) THEN
    SELECT code INTO new_code FROM referral_codes WHERE user_id = user_id_param;
    RETURN new_code;
  END IF;

  -- Create new code
  new_code := generate_referral_code(user_id_param);

  INSERT INTO referral_codes (user_id, code, is_active, current_uses)
  VALUES (user_id_param, new_code, true, 0);

  RETURN new_code;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating referral code: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create codes for all buyers without codes
SELECT create_referral_code_for_user(id) as created_code
FROM profiles
WHERE role = 'buyer'
  AND NOT EXISTS (SELECT 1 FROM referral_codes WHERE user_id = profiles.id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Triggers cleaned. Registration should work. Use create_referral_code_for_user() function manually.';
END $$;
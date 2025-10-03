-- =============================================
-- CREATE: Referral tables and fix registration
-- Date: 2025-09-22
-- Description: Create referral tables if missing and fix registration
-- =============================================

-- 1. Create referral_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code) WHERE is_active = true;

-- 3. Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view own referral codes" ON referral_codes;
CREATE POLICY "Users can view own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Create generate_referral_code function if it doesn't exist
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_full_name TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Get user's full name
  SELECT full_name INTO v_full_name FROM profiles WHERE id = p_user_id;

  -- Generate base code from name (first 3 chars + random)
  v_code := UPPER(LEFT(REGEXP_REPLACE(COALESCE(v_full_name, 'USR'), '[^A-Za-z]', '', 'g'), 3)) ||
            LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) LOOP
    v_counter := v_counter + 1;
    v_code := UPPER(LEFT(REGEXP_REPLACE(COALESCE(v_full_name, 'USR'), '[^A-Za-z]', '', 'g'), 3)) ||
              LPAD((FLOOR(RANDOM() * 10000) + v_counter)::TEXT, 4, '0');

    -- Prevent infinite loop
    IF v_counter > 100 THEN
      v_code := 'REF' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Simplify handle_new_user - NO referral code creation here
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- ONLY create profile - nothing else
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create referral code ONLY in profile trigger
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Create referral code for buyers
  IF NEW.role = 'buyer' THEN
    INSERT INTO referral_codes (user_id, code, is_active, current_uses)
    VALUES (NEW.id, generate_referral_code(NEW.id), true, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Failed to create referral code for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Set up triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;
CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- 9. Grant permissions
GRANT ALL ON referral_codes TO authenticated;

-- 10. Create missing codes for existing buyers
INSERT INTO referral_codes (user_id, code, is_active, current_uses)
SELECT
  p.id,
  generate_referral_code(p.id),
  true,
  0
FROM profiles p
WHERE p.role = 'buyer'
  AND NOT EXISTS (SELECT 1 FROM referral_codes rc WHERE rc.user_id = p.id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Referral system created successfully. Registration should work now.';
END $$;
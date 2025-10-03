-- =============================================
-- DEBUG: Why referral codes are not auto-created
-- Date: 2025-09-22
-- Description: Debug and fix referral code auto-creation
-- =============================================

-- 1. Check what triggers exist
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('profiles', 'users')
  AND trigger_schema IN ('public', 'auth');

-- 2. Check if functions exist
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('handle_new_user', 'create_buyer_referral_code', 'generate_referral_code');

-- 3. Check if referral_codes table exists and has data
SELECT COUNT(*) as total_codes FROM referral_codes;
SELECT COUNT(*) as total_buyers FROM profiles WHERE role = 'buyer';

-- 4. Test generate_referral_code function
DO $$
DECLARE
  test_code TEXT;
BEGIN
  SELECT generate_referral_code('00000000-0000-0000-0000-000000000001'::UUID) INTO test_code;
  RAISE NOTICE 'Test code generated: %', test_code;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error generating test code: %', SQLERRM;
END $$;

-- 5. Force create referral codes for all buyers without codes
INSERT INTO referral_codes (user_id, code, is_active, current_uses)
SELECT
  p.id,
  generate_referral_code(p.id),
  true,
  0
FROM profiles p
WHERE p.role = 'buyer'
  AND NOT EXISTS (SELECT 1 FROM referral_codes rc WHERE rc.user_id = p.id);

-- 6. Show final count
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'buyer') as buyers,
  (SELECT COUNT(*) FROM referral_codes) as codes;
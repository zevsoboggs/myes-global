-- =============================================
-- DEBUG: Check why profile trigger doesn't create referral codes
-- Date: 2025-09-22
-- Description: Debug profile trigger and manually create missing codes
-- =============================================

-- 1. Check if profile trigger is working
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_buyer_referral_code';

-- 2. Check if function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'create_buyer_referral_code';

-- 3. Check recent profiles without referral codes
SELECT
  p.id,
  p.full_name,
  p.role,
  p.created_at,
  CASE
    WHEN rc.id IS NULL THEN 'NO CODE'
    ELSE rc.code
  END as referral_code
FROM profiles p
LEFT JOIN referral_codes rc ON rc.user_id = p.id
WHERE p.role = 'buyer'
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Manually create missing referral codes for all buyers
INSERT INTO referral_codes (user_id, code, is_active, current_uses)
SELECT
  p.id,
  generate_referral_code(p.id),
  true,
  0
FROM profiles p
WHERE p.role = 'buyer'
  AND NOT EXISTS (SELECT 1 FROM referral_codes rc WHERE rc.user_id = p.id);

-- 5. Show final result
SELECT
  COUNT(*) as total_buyers,
  COUNT(rc.id) as buyers_with_codes
FROM profiles p
LEFT JOIN referral_codes rc ON rc.user_id = p.id
WHERE p.role = 'buyer';

-- 6. Test trigger manually
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Test if generate_referral_code works
  SELECT generate_referral_code('00000000-0000-0000-0000-000000000001'::UUID) INTO test_result;
  RAISE NOTICE 'Test referral code: %', test_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error testing referral code generation: %', SQLERRM;
END $$;
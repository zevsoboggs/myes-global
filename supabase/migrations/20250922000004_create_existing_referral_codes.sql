-- =============================================
-- MIGRATION: Create referral codes for existing buyers
-- Date: 2025-09-22
-- Description: Generate referral codes for all existing buyer accounts
-- =============================================

-- Create referral codes for all existing buyers who don't have one
INSERT INTO referral_codes (user_id, code, is_active, current_uses, created_at, updated_at)
SELECT
  p.id,
  generate_referral_code(p.id),
  true,
  0,
  NOW(),
  NOW()
FROM profiles p
WHERE p.role = 'buyer'
  AND NOT EXISTS (
    SELECT 1 FROM referral_codes rc WHERE rc.user_id = p.id
  );

-- Log how many codes were created
DO $$
DECLARE
  buyer_count INTEGER;
  code_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO buyer_count FROM profiles WHERE role = 'buyer';
  SELECT COUNT(*) INTO code_count FROM referral_codes;

  RAISE NOTICE 'Total buyers: %, Total referral codes: %', buyer_count, code_count;
END $$;
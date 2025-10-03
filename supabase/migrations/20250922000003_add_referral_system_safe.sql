-- =============================================
-- MIGRATION: Add Referral System for Buyers (SAFE VERSION)
-- Date: 2025-09-22
-- Description: Creates referral system with IF NOT EXISTS checks
-- =============================================

-- 1. Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-referral and duplicate referrals
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id),
  CONSTRAINT unique_referral UNIQUE (referred_id)
);

-- 3. Create referral_commissions table to track earnings
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales_requests(id) ON DELETE CASCADE,
  commission_rate DECIMAL(5,4) DEFAULT 0.0035, -- 0.35%
  sale_amount_usdt DECIMAL(15,2) NOT NULL,
  commission_amount_usdt DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(sale_id, referrer_id)
);

-- 4. Add referral tracking to profiles (safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_earnings_usdt'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_earnings_usdt DECIMAL(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_referrals'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_referrals INTEGER DEFAULT 0;
  END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- 6. Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- 7. Function to check if user is buyer (for RLS and triggers)
CREATE OR REPLACE FUNCTION is_buyer(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'buyer');
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. RLS Policies for referral_codes (safe creation)
DROP POLICY IF EXISTS "Users can view own referral codes" ON referral_codes;
CREATE POLICY "Users can view own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Buyers can create referral codes" ON referral_codes;
CREATE POLICY "Buyers can create referral codes" ON referral_codes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    is_buyer(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own referral codes" ON referral_codes;
CREATE POLICY "Users can update own referral codes" ON referral_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. RLS Policies for referrals
DROP POLICY IF EXISTS "Users can view related referrals" ON referrals;
CREATE POLICY "Users can view related referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Anyone can create referrals during signup" ON referrals;
CREATE POLICY "Anyone can create referrals during signup" ON referrals
  FOR INSERT WITH CHECK (true);

-- 10. RLS Policies for referral_commissions
DROP POLICY IF EXISTS "Users can view own commissions" ON referral_commissions;
CREATE POLICY "Users can view own commissions" ON referral_commissions
  FOR SELECT USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "System can manage commissions" ON referral_commissions;
CREATE POLICY "System can manage commissions" ON referral_commissions
  FOR ALL USING (true);

-- 11. Function to generate unique referral code
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
  v_code := UPPER(LEFT(REGEXP_REPLACE(v_full_name, '[^A-Za-z]', '', 'g'), 3)) ||
            LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) LOOP
    v_counter := v_counter + 1;
    v_code := UPPER(LEFT(REGEXP_REPLACE(v_full_name, '[^A-Za-z]', '', 'g'), 3)) ||
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

-- 12. Function to create referral code for new buyers
CREATE OR REPLACE FUNCTION create_buyer_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create for buyers and only if referral_codes table exists
  IF NEW.role = 'buyer' THEN
    -- Check if referral_codes table exists before inserting
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'referral_codes'
    ) THEN
      -- Generate referral code only if table exists
      INSERT INTO referral_codes (user_id, code)
      VALUES (NEW.id, generate_referral_code(NEW.id))
      ON CONFLICT (user_id) DO NOTHING; -- Ignore if already exists
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE LOG 'Failed to create referral code for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Replace the safe trigger with the proper one
DROP TRIGGER IF EXISTS safe_profile_creation_trigger ON profiles;
DROP TRIGGER IF EXISTS trigger_create_buyer_referral_code ON profiles;

CREATE TRIGGER trigger_create_buyer_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_buyer_referral_code();

-- 14. Function to process referral when user makes first purchase
CREATE OR REPLACE FUNCTION process_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_sale_amount DECIMAL(15,2);
  v_commission_amount DECIMAL(15,2);
  v_commission_rate DECIMAL(5,4) := 0.0035; -- 0.35%
BEGIN
  -- Only process when sale is completed (paid)
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN

    -- Get referrer and sale amount
    SELECT p.referred_by, i.amount_usdt
    INTO v_referrer_id, v_sale_amount
    FROM profiles p
    JOIN invoices i ON i.sales_request_id = NEW.id
    WHERE p.id = NEW.buyer_id;

    -- If buyer was referred and this is their first completed purchase
    IF v_referrer_id IS NOT NULL AND
       NOT EXISTS (
         SELECT 1 FROM referral_commissions
         WHERE referred_id = NEW.buyer_id AND status = 'paid'
       ) THEN

      v_commission_amount := v_sale_amount * v_commission_rate;

      -- Create commission record
      INSERT INTO referral_commissions (
        referrer_id,
        referred_id,
        sale_id,
        commission_rate,
        sale_amount_usdt,
        commission_amount_usdt,
        status
      ) VALUES (
        v_referrer_id,
        NEW.buyer_id,
        NEW.id,
        v_commission_rate,
        v_sale_amount,
        v_commission_amount,
        'pending'
      )
      ON CONFLICT (sale_id, referrer_id) DO NOTHING;

      -- Update referrer's earnings
      UPDATE profiles
      SET referral_earnings_usdt = referral_earnings_usdt + v_commission_amount
      WHERE id = v_referrer_id;

      -- Send notification to referrer
      INSERT INTO notifications (
        user_id,
        title,
        message,
        meta,
        created_at
      ) VALUES (
        v_referrer_id,
        'Referral Commission Earned!',
        'You earned ' || v_commission_amount || ' USDT from a successful referral',
        jsonb_build_object(
          'type', 'referral_commission',
          'commission_amount', v_commission_amount,
          'referred_user', NEW.buyer_id,
          'sale_id', NEW.id
        ),
        NOW()
      );

    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error processing referral commission: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15. Trigger for referral commission processing
DROP TRIGGER IF EXISTS trigger_process_referral_commission ON sales_requests;
CREATE TRIGGER trigger_process_referral_commission
  AFTER UPDATE OF status ON sales_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_commission();

-- 16. Function to apply referral code during registration
CREATE OR REPLACE FUNCTION apply_referral_code(
  p_user_id UUID,
  p_referral_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_referral_code_record referral_codes%ROWTYPE;
  v_user_role TEXT;
BEGIN
  -- Check if user is buyer
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role != 'buyer' THEN
    RETURN FALSE;
  END IF;

  -- Check if user already has a referrer
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND referred_by IS NOT NULL) THEN
    RETURN FALSE;
  END IF;

  -- Find active referral code
  SELECT * INTO v_referral_code_record
  FROM referral_codes
  WHERE code = UPPER(p_referral_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Don't allow self-referral
  IF v_referral_code_record.user_id = p_user_id THEN
    RETURN FALSE;
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code_id, status, confirmed_at)
  VALUES (v_referral_code_record.user_id, p_user_id, v_referral_code_record.id, 'confirmed', NOW())
  ON CONFLICT (referred_id) DO NOTHING;

  -- Update profile with referrer
  UPDATE profiles
  SET referred_by = v_referral_code_record.user_id
  WHERE id = p_user_id;

  -- Update referral code usage
  UPDATE referral_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = v_referral_code_record.id;

  -- Update referrer's total referrals
  UPDATE profiles
  SET total_referrals = total_referrals + 1
  WHERE id = v_referral_code_record.user_id;

  -- Send notification to referrer
  INSERT INTO notifications (
    user_id,
    title,
    message,
    meta,
    created_at
  ) VALUES (
    v_referral_code_record.user_id,
    'New Referral!',
    'Someone joined using your referral code',
    jsonb_build_object(
      'type', 'new_referral',
      'referred_user', p_user_id,
      'referral_code', p_referral_code
    ),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error applying referral code: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create view for referral statistics
CREATE OR REPLACE VIEW referral_stats AS
SELECT
  p.id as user_id,
  p.full_name,
  p.total_referrals,
  p.referral_earnings_usdt,
  rc.code as referral_code,
  rc.current_uses as code_uses,
  COUNT(DISTINCT ref.id) as confirmed_referrals,
  COUNT(DISTINCT comm.id) as paid_commissions,
  COALESCE(SUM(comm.commission_amount_usdt) FILTER (WHERE comm.status = 'paid'), 0) as total_paid_commissions,
  COALESCE(SUM(comm.commission_amount_usdt) FILTER (WHERE comm.status = 'pending'), 0) as pending_commissions
FROM profiles p
LEFT JOIN referral_codes rc ON rc.user_id = p.id AND rc.is_active = true
LEFT JOIN referrals ref ON ref.referrer_id = p.id AND ref.status = 'confirmed'
LEFT JOIN referral_commissions comm ON comm.referrer_id = p.id
WHERE p.role = 'buyer'
GROUP BY p.id, p.full_name, p.total_referrals, p.referral_earnings_usdt, rc.code, rc.current_uses;

-- 18. Grant permissions
GRANT ALL ON referral_codes TO authenticated;
GRANT ALL ON referrals TO authenticated;
GRANT ALL ON referral_commissions TO authenticated;
GRANT SELECT ON referral_stats TO authenticated;

-- 19. Add updated_at triggers
DROP TRIGGER IF EXISTS update_referral_codes_updated_at ON referral_codes;
CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_commissions_updated_at ON referral_commissions;
CREATE TRIGGER update_referral_commissions_updated_at
  BEFORE UPDATE ON referral_commissions
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- 20. Clean up old safe trigger function
DROP FUNCTION IF EXISTS safe_profile_trigger();

-- =============================================
-- END OF MIGRATION
-- =============================================
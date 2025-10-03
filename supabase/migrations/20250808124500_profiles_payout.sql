ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payout_method text CHECK (payout_method IN ('fiat','usdt')),
  ADD COLUMN IF NOT EXISTS payout_details text,
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0.01; 
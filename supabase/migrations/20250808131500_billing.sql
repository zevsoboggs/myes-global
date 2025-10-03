-- Realtor commissions per sale
CREATE TABLE IF NOT EXISTS sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_request_id uuid UNIQUE REFERENCES sales_requests(id) ON DELETE CASCADE NOT NULL,
  realtor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount_usdt numeric NOT NULL CHECK (amount_usdt >= 0),
  commission_usdt numeric NOT NULL CHECK (commission_usdt >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;

-- Create commission when invoice is paid (or sale paid)
CREATE OR REPLACE FUNCTION public.create_commission_on_paid()
RETURNS TRIGGER AS $$
DECLARE s sales_requests; inv invoices; rate numeric; comm numeric;
BEGIN
  IF TG_TABLE_NAME = 'invoices' THEN
    IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
    SELECT * INTO s FROM sales_requests WHERE id = NEW.sales_request_id;
    inv := NEW;
  ELSE
    IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
    SELECT * INTO inv FROM invoices WHERE sales_request_id = NEW.id;
    s := NEW;
  END IF;
  SELECT COALESCE(p.commission_rate, 0.01) INTO rate FROM profiles p WHERE p.id = s.realtor_id;
  comm := COALESCE(inv.amount_usdt, 0) * rate;
  INSERT INTO sales_commissions(sales_request_id, realtor_id, amount_usdt, commission_usdt, status)
  VALUES (s.id, s.realtor_id, COALESCE(inv.amount_usdt,0), COALESCE(comm,0), 'ready')
  ON CONFLICT (sales_request_id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_paid_commission ON invoices;
CREATE TRIGGER trg_invoice_paid_commission
AFTER UPDATE ON invoices
FOR EACH ROW EXECUTE PROCEDURE public.create_commission_on_paid();

DROP TRIGGER IF EXISTS trg_sale_paid_commission ON sales_requests;
CREATE TRIGGER trg_sale_paid_commission
AFTER UPDATE ON sales_requests
FOR EACH ROW EXECUTE PROCEDURE public.create_commission_on_paid();

-- Payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount_usdt numeric NOT NULL CHECK (amount_usdt > 0),
  method text CHECK (method IN ('fiat','usdt')),
  details text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','paid','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payouts_updated_at ON payouts;
CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON payouts
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- RLS policies
DROP POLICY IF EXISTS "Commissions select" ON sales_commissions;
CREATE POLICY "Commissions select" ON sales_commissions
FOR SELECT TO authenticated USING (
  realtor_id = auth.uid() OR public.is_lovepay()
);

DROP POLICY IF EXISTS "Commissions update" ON sales_commissions;
CREATE POLICY "Commissions update" ON sales_commissions
FOR UPDATE TO authenticated USING (public.is_lovepay()) WITH CHECK (public.is_lovepay());

DROP POLICY IF EXISTS "Payouts select" ON payouts;
CREATE POLICY "Payouts select" ON payouts
FOR SELECT TO authenticated USING (
  realtor_id = auth.uid() OR public.is_lovepay()
);

DROP POLICY IF EXISTS "Payouts insert" ON payouts;
CREATE POLICY "Payouts insert" ON payouts
FOR INSERT TO authenticated WITH CHECK (
  realtor_id = auth.uid()
);

DROP POLICY IF EXISTS "Payouts update" ON payouts;
CREATE POLICY "Payouts update" ON payouts
FOR UPDATE TO authenticated USING (public.is_lovepay()) WITH CHECK (public.is_lovepay()); 
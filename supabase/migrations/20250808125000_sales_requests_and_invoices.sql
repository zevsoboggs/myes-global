-- Extend roles to include lovepay
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('buyer','realtor','lovepay'));

-- Sales requests
CREATE TABLE IF NOT EXISTS sales_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  realtor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invoice_issued','payment_pending','paid','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sales_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sales_requests_property ON sales_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_sales_requests_participants ON sales_requests(buyer_id, realtor_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_request_id uuid UNIQUE REFERENCES sales_requests(id) ON DELETE CASCADE NOT NULL,
  amount_usdt numeric NOT NULL CHECK (amount_usdt > 0),
  payment_instructions text NOT NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','expired','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_requests_updated_at ON sales_requests;
CREATE TRIGGER trg_sales_requests_updated_at BEFORE UPDATE ON sales_requests
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Freeze property on sales request create
CREATE OR REPLACE FUNCTION public.freeze_property_on_request()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE properties SET is_active = false WHERE id = NEW.property_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_freeze_property_on_request ON sales_requests;
CREATE TRIGGER trg_freeze_property_on_request
AFTER INSERT ON sales_requests
FOR EACH ROW EXECUTE PROCEDURE public.freeze_property_on_request();

-- Unfreeze on cancel
CREATE OR REPLACE FUNCTION public.unfreeze_property_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE properties SET is_active = true WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_unfreeze_property_on_cancel ON sales_requests;
CREATE TRIGGER trg_unfreeze_property_on_cancel
AFTER UPDATE ON sales_requests
FOR EACH ROW EXECUTE PROCEDURE public.unfreeze_property_on_cancel();

-- Helper: check if current user is lovepay staff
CREATE OR REPLACE FUNCTION public.is_lovepay()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'lovepay');
END; $$ LANGUAGE plpgsql STABLE;

-- RLS for sales_requests
DROP POLICY IF EXISTS "Sales select" ON sales_requests;
CREATE POLICY "Sales select" ON sales_requests
FOR SELECT TO authenticated USING (
  buyer_id = auth.uid() OR realtor_id = auth.uid() OR public.is_lovepay()
);

DROP POLICY IF EXISTS "Sales insert" ON sales_requests;
CREATE POLICY "Sales insert" ON sales_requests
FOR INSERT TO authenticated WITH CHECK (
  realtor_id = auth.uid()
);

DROP POLICY IF EXISTS "Sales update" ON sales_requests;
CREATE POLICY "Sales update" ON sales_requests
FOR UPDATE TO authenticated USING (
  buyer_id = auth.uid() OR realtor_id = auth.uid() OR public.is_lovepay()
) WITH CHECK (
  buyer_id = auth.uid() OR realtor_id = auth.uid() OR public.is_lovepay()
);

-- RLS for invoices
DROP POLICY IF EXISTS "Invoices select" ON invoices;
CREATE POLICY "Invoices select" ON invoices
FOR SELECT TO authenticated USING (
  public.is_lovepay() OR EXISTS (
    SELECT 1 FROM sales_requests s WHERE s.id = sales_request_id AND (s.buyer_id = auth.uid() OR s.realtor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Invoices insert" ON invoices;
CREATE POLICY "Invoices insert" ON invoices
FOR INSERT TO authenticated WITH CHECK (
  public.is_lovepay()
);

DROP POLICY IF EXISTS "Invoices update" ON invoices;
CREATE POLICY "Invoices update" ON invoices
FOR UPDATE TO authenticated USING (
  public.is_lovepay()
) WITH CHECK (public.is_lovepay()); 
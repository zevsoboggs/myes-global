-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_buyer ON bookings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_expires ON bookings(status, expires_at);

-- Trigger: only buyers can create bookings
CREATE OR REPLACE FUNCTION public.bookings_check_buyer_role()
RETURNS trigger AS $$
DECLARE r text;
BEGIN
  SELECT role INTO r FROM profiles WHERE id = NEW.buyer_id;
  IF r IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF r <> 'buyer' THEN RAISE EXCEPTION 'only buyers can create bookings'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bookings_check_buyer_role ON bookings;
CREATE TRIGGER trg_bookings_check_buyer_role
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE PROCEDURE public.bookings_check_buyer_role();

-- Trigger: ensure single active booking per property (by time and status)
CREATE OR REPLACE FUNCTION public.bookings_prevent_double_active()
RETURNS trigger AS $$
DECLARE existing_count int;
BEGIN
  SELECT COUNT(1) INTO existing_count FROM bookings 
   WHERE property_id = NEW.property_id 
     AND status = 'active' 
     AND expires_at > now();
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'property already has an active booking';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bookings_prevent_double_active ON bookings;
CREATE TRIGGER trg_bookings_prevent_double_active
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE PROCEDURE public.bookings_prevent_double_active();

-- Optional: expire automatically on update if past due
CREATE OR REPLACE FUNCTION public.bookings_auto_expire()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.expires_at <= now() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_auto_expire ON bookings;
CREATE TRIGGER trg_bookings_auto_expire
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE PROCEDURE public.bookings_auto_expire();

-- Policies
DROP POLICY IF EXISTS "Bookings select" ON bookings;
CREATE POLICY "Bookings select" ON bookings
FOR SELECT TO authenticated
USING (
  buyer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND p.realtor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Bookings insert" ON bookings;
CREATE POLICY "Bookings insert" ON bookings
FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid()
);

DROP POLICY IF EXISTS "Bookings update" ON bookings;
CREATE POLICY "Bookings update" ON bookings
FOR UPDATE TO authenticated
USING (
  buyer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND p.realtor_id = auth.uid()
  )
)
WITH CHECK (
  buyer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_id AND p.realtor_id = auth.uid()
  )
); 
-- Validate only realtors can insert properties
CREATE OR REPLACE FUNCTION public.properties_check_realtor_role()
RETURNS trigger AS $$
DECLARE
  r text;
BEGIN
  SELECT role INTO r FROM profiles WHERE id = NEW.realtor_id;
  IF r IS NULL THEN
    RAISE EXCEPTION 'profile not found for realtor_id';
  END IF;
  IF r <> 'realtor' THEN
    RAISE EXCEPTION 'only users with role=realtor can create properties';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_properties_check_realtor_role ON properties;
CREATE TRIGGER trg_properties_check_realtor_role
BEFORE INSERT ON properties
FOR EACH ROW EXECUTE PROCEDURE public.properties_check_realtor_role();

-- RLS: Only owner (realtor) can insert his property; enforce explicitly role via WITH CHECK on profiles
DROP POLICY IF EXISTS "Риелторы могут создавать объекты" ON properties;
CREATE POLICY "Риелторы могут создавать объекты" 
ON properties FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = realtor_id
); 
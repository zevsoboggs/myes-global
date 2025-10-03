-- Allow Love&Pay staff to read all properties (even inactive)
DROP POLICY IF EXISTS "LovePay can read properties" ON properties;
CREATE POLICY "LovePay can read properties"
  ON properties FOR SELECT TO authenticated
  USING (
    public.is_lovepay()
  ); 
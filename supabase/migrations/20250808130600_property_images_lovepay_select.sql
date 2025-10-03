-- Allow Love&Pay staff to read property images
DROP POLICY IF EXISTS "LovePay read images" ON property_images;
CREATE POLICY "LovePay read images"
  ON property_images FOR SELECT TO authenticated
  USING (
    public.is_lovepay()
  ); 
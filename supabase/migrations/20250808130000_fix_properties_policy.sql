-- Fix policy creation without IF NOT EXISTS (not supported in PostgreSQL)
DROP POLICY IF EXISTS "Owners and participants can read" ON properties;

CREATE POLICY "Owners and participants can read"
  ON properties FOR SELECT TO authenticated
  USING (
    realtor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM sales_requests s
      WHERE s.property_id = properties.id
        AND (s.buyer_id = auth.uid() OR s.realtor_id = auth.uid())
    )
  ); 
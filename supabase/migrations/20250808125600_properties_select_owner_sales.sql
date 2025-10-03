-- Allow owners and sale participants to read properties (even if inactive)
CREATE POLICY IF NOT EXISTS "Owners and participants can read"
  ON properties FOR SELECT TO authenticated
  USING (
    realtor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM sales_requests s
      WHERE s.property_id = properties.id
        AND (s.buyer_id = auth.uid() OR s.realtor_id = auth.uid())
    )
  ); 
-- Fix RLS policies for sales_requests to allow lawyer access

-- Allow lawyers to read sales_requests where they are assigned
DROP POLICY IF EXISTS "Sales requests select for lawyers" ON sales_requests;

CREATE POLICY "Sales requests select for lawyers" ON sales_requests
FOR SELECT TO authenticated USING (
  -- Anyone can read their own sales requests
  lawyer_id = auth.uid()
  OR buyer_id = auth.uid()
  OR realtor_id = auth.uid()
  OR
  -- Love&Pay can read all
  public.is_lovepay()
);

-- Allow realtors to update sales_requests to assign lawyers
DROP POLICY IF EXISTS "Sales requests update for realtors" ON sales_requests;

CREATE POLICY "Sales requests update for realtors" ON sales_requests
FOR UPDATE TO authenticated USING (
  -- Realtors can update their own sales requests
  realtor_id = auth.uid()
  OR
  -- Love&Pay can update all
  public.is_lovepay()
) WITH CHECK (
  -- Same conditions for the updated record
  realtor_id = auth.uid()
  OR
  public.is_lovepay()
);

-- Allow realtors to insert sales_requests
DROP POLICY IF EXISTS "Sales requests insert for realtors" ON sales_requests;

CREATE POLICY "Sales requests insert for realtors" ON sales_requests
FOR INSERT TO authenticated WITH CHECK (
  -- Realtors can create sales requests where they are the realtor
  realtor_id = auth.uid()
  OR
  -- Love&Pay can create all
  public.is_lovepay()
);
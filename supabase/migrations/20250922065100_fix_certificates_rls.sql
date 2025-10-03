-- Fix RLS policies for partner_certificates

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own certificates" ON partner_certificates;
DROP POLICY IF EXISTS "Users can insert own certificates" ON partner_certificates;
DROP POLICY IF EXISTS "Love&Pay can read all certificates" ON partner_certificates;
DROP POLICY IF EXISTS "Love&Pay can manage certificates" ON partner_certificates;

-- Simple policies for testing
CREATE POLICY "Allow authenticated users to read own certificates" ON partner_certificates
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert own certificates" ON partner_certificates
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update own certificates" ON partner_certificates
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Alternative: temporarily disable RLS for testing
-- ALTER TABLE partner_certificates DISABLE ROW LEVEL SECURITY;
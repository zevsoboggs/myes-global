-- Temporarily disable RLS for partner_certificates to fix the issue

ALTER TABLE partner_certificates DISABLE ROW LEVEL SECURITY;

-- Also add a unique constraint to prevent duplicate certificates per user
-- This will help prevent multiple certificates being created
ALTER TABLE partner_certificates
ADD CONSTRAINT unique_user_certificate
UNIQUE (user_id);
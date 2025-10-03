-- Create partner certificates table

CREATE TABLE partner_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name VARCHAR(255) NOT NULL,
  agency_name VARCHAR(255),
  verification_level VARCHAR(50) NOT NULL DEFAULT 'verified',
  digital_signature TEXT NOT NULL, -- RSA signature
  signature_hash VARCHAR(64) NOT NULL, -- Hash of certificate data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE partner_certificates ENABLE ROW LEVEL SECURITY;

-- Users can read their own certificates
CREATE POLICY "Users can read own certificates" ON partner_certificates
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own certificates (only one per user)
CREATE POLICY "Users can insert own certificates" ON partner_certificates
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM partner_certificates
    WHERE user_id = auth.uid()
  )
);

-- Love&Pay can read all certificates
CREATE POLICY "Love&Pay can read all certificates" ON partner_certificates
FOR SELECT TO authenticated USING (public.is_lovepay());

-- Love&Pay can update/delete certificates
CREATE POLICY "Love&Pay can manage certificates" ON partner_certificates
FOR ALL TO authenticated USING (public.is_lovepay());

-- Create index for performance
CREATE INDEX idx_partner_certificates_user_id ON partner_certificates(user_id);
CREATE INDEX idx_partner_certificates_number ON partner_certificates(certificate_number);

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INT;
  certificate_number TEXT;
BEGIN
  -- Get last 2 digits of current year
  year_suffix := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CASE
      WHEN certificate_number LIKE 'MG-' || year_suffix || '-%'
      THEN CAST(SPLIT_PART(certificate_number, '-', 3) AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM partner_certificates;

  -- Format: MG-YY-NNNN (e.g., MG-25-0001)
  certificate_number := 'MG-' || year_suffix || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN certificate_number;
END;
$$ LANGUAGE plpgsql;
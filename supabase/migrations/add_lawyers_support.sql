-- =============================================
-- MIGRATION: Add Lawyers Support to MYES Platform
-- Date: 2024
-- Description: Adds full support for lawyers in the system
-- =============================================

-- 1. Update the role enum in profiles table to include 'lawyer'
-- Note: You may need to drop and recreate constraints if role is an enum type
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('buyer', 'realtor', 'lawyer', 'lovepay', 'admin'));

-- 2. Add lawyer_id column to sales_requests table
ALTER TABLE sales_requests
ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_requests_lawyer_id ON sales_requests(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_lawyer ON profiles(role) WHERE role = 'lawyer';

-- 4. Add lawyer-specific columns to profiles table if needed
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS specialization TEXT[],
ADD COLUMN IF NOT EXISTS bar_number TEXT,
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[];

-- 5. Create lawyers_services table for service offerings
CREATE TABLE IF NOT EXISTS lawyers_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lawyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    description TEXT,
    price_usdt DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lawyer_id, service_name)
);

-- 6. Create lawyers_documents table for legal documents
CREATE TABLE IF NOT EXISTS lawyers_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lawyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales_requests(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    document_type TEXT CHECK (document_type IN ('contract', 'agreement', 'certificate', 'other')),
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create lawyers_reviews table
CREATE TABLE IF NOT EXISTS lawyers_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lawyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales_requests(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lawyer_id, reviewer_id, sale_id)
);

-- 8. Create function to notify lawyer when assigned to a deal
CREATE OR REPLACE FUNCTION notify_lawyer_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if lawyer_id was just set (not null and different from old value)
    IF NEW.lawyer_id IS NOT NULL AND (OLD.lawyer_id IS NULL OR OLD.lawyer_id != NEW.lawyer_id) THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            related_id,
            is_read,
            created_at
        ) VALUES (
            NEW.lawyer_id,
            'New Legal Case Assignment',
            'You have been assigned to a new real estate transaction',
            'deal_assignment',
            NEW.id,
            FALSE,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for lawyer notifications
DROP TRIGGER IF EXISTS trigger_notify_lawyer_on_assignment ON sales_requests;
CREATE TRIGGER trigger_notify_lawyer_on_assignment
    AFTER UPDATE OF lawyer_id ON sales_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_lawyer_on_assignment();

-- 10. Create view for lawyer statistics
CREATE OR REPLACE VIEW lawyer_stats AS
SELECT
    p.id as lawyer_id,
    p.full_name,
    p.is_verified,
    COUNT(DISTINCT sr.id) as total_cases,
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.status = 'paid') as completed_cases,
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.status IN ('pending', 'invoice_issued', 'payment_pending')) as active_cases,
    AVG(lr.rating)::DECIMAL(2,1) as average_rating,
    COUNT(DISTINCT lr.id) as total_reviews
FROM profiles p
LEFT JOIN sales_requests sr ON sr.lawyer_id = p.id
LEFT JOIN lawyers_reviews lr ON lr.lawyer_id = p.id
WHERE p.role = 'lawyer'
GROUP BY p.id, p.full_name, p.is_verified;

-- 11. Add RLS policies for lawyers

-- Allow lawyers to view their own services
CREATE POLICY "Lawyers can view own services" ON lawyers_services
    FOR ALL USING (auth.uid() = lawyer_id);

-- Allow everyone to view services (for browsing)
CREATE POLICY "Everyone can view lawyer services" ON lawyers_services
    FOR SELECT USING (true);

-- Allow lawyers to manage their own documents
CREATE POLICY "Lawyers can manage own documents" ON lawyers_documents
    FOR ALL USING (auth.uid() = lawyer_id);

-- Allow participants to view documents
CREATE POLICY "Deal participants can view documents" ON lawyers_documents
    FOR SELECT USING (
        sale_id IN (
            SELECT id FROM sales_requests
            WHERE buyer_id = auth.uid()
                OR realtor_id = auth.uid()
                OR lawyer_id = auth.uid()
        )
    );

-- Allow authenticated users to create reviews
CREATE POLICY "Users can create reviews" ON lawyers_reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Allow everyone to view reviews
CREATE POLICY "Everyone can view reviews" ON lawyers_reviews
    FOR SELECT USING (true);

-- Allow reviewers to update their own reviews
CREATE POLICY "Users can update own reviews" ON lawyers_reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- 12. Enable RLS on new tables
ALTER TABLE lawyers_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers_reviews ENABLE ROW LEVEL SECURITY;

-- 13. Create function to calculate lawyer commission
CREATE OR REPLACE FUNCTION calculate_lawyer_fee(
    sale_amount DECIMAL,
    lawyer_rate DECIMAL DEFAULT 0.01  -- Default 1% fee
) RETURNS DECIMAL AS $$
BEGIN
    RETURN sale_amount * lawyer_rate;
END;
$$ LANGUAGE plpgsql;

-- 14. Add lawyer fee tracking to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS lawyer_fee_usdt DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lawyer_fee_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lawyer_fee_paid_at TIMESTAMP WITH TIME ZONE;

-- 15. Create notification for lawyers when payment is received
CREATE OR REPLACE FUNCTION notify_lawyer_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_lawyer_id UUID;
    v_property_title TEXT;
BEGIN
    -- Get lawyer_id from related sale
    SELECT sr.lawyer_id, p.title INTO v_lawyer_id, v_property_title
    FROM sales_requests sr
    LEFT JOIN properties p ON p.id = sr.property_id
    WHERE sr.id = NEW.sales_request_id;

    -- Only proceed if there's a lawyer and payment is completed
    IF v_lawyer_id IS NOT NULL AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            related_id,
            is_read,
            created_at
        ) VALUES (
            v_lawyer_id,
            'Transaction Completed',
            'The deal for ' || COALESCE(v_property_title, 'property') || ' has been completed. Your fee is ready for payout.',
            'payment_complete',
            NEW.id,
            FALSE,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create trigger for payment notifications
DROP TRIGGER IF EXISTS trigger_notify_lawyer_on_payment ON invoices;
CREATE TRIGGER trigger_notify_lawyer_on_payment
    AFTER UPDATE OF status ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION notify_lawyer_on_payment();

-- 17. Sample data for testing (commented out for production)
/*
-- Add some sample lawyers
INSERT INTO profiles (id, email, full_name, role, is_verified, agency_name, license_number, commission_rate, specialization, bar_number, years_experience)
VALUES
    (gen_random_uuid(), 'john.lawyer@example.com', 'John Smith, Esq.', 'lawyer', true, 'Smith Legal Services', 'LAW123456', 0.01, ARRAY['Real Estate', 'Cryptocurrency'], 'BAR123456', 10),
    (gen_random_uuid(), 'jane.attorney@example.com', 'Jane Doe, JD', 'lawyer', true, 'Doe & Associates', 'LAW789012', 0.015, ARRAY['Property Law', 'International Transactions'], 'BAR789012', 15),
    (gen_random_uuid(), 'michael.legal@example.com', 'Michael Johnson', 'lawyer', false, 'Johnson Law Firm', 'LAW345678', 0.01, ARRAY['Commercial Real Estate'], 'BAR345678', 5);
*/

-- 18. Grant necessary permissions
GRANT ALL ON lawyers_services TO authenticated;
GRANT ALL ON lawyers_documents TO authenticated;
GRANT ALL ON lawyers_reviews TO authenticated;
GRANT SELECT ON lawyer_stats TO authenticated;

-- =============================================
-- END OF MIGRATION
-- =============================================

-- To rollback this migration, run:
/*
ALTER TABLE sales_requests DROP COLUMN IF EXISTS lawyer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS specialization, bar_number, years_experience, languages_spoken;
ALTER TABLE invoices DROP COLUMN IF EXISTS lawyer_fee_usdt, lawyer_fee_paid, lawyer_fee_paid_at;
DROP TABLE IF EXISTS lawyers_services CASCADE;
DROP TABLE IF EXISTS lawyers_documents CASCADE;
DROP TABLE IF EXISTS lawyers_reviews CASCADE;
DROP VIEW IF EXISTS lawyer_stats;
DROP FUNCTION IF EXISTS notify_lawyer_on_assignment() CASCADE;
DROP FUNCTION IF EXISTS notify_lawyer_on_payment() CASCADE;
DROP FUNCTION IF EXISTS calculate_lawyer_fee(DECIMAL, DECIMAL);
*/
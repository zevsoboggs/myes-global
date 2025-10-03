-- =============================================
-- MIGRATION: Add Rental Property System
-- Date: 2025-10-04
-- Description: Full rental property booking system with 7% commission
-- =============================================

-- 1. Create rental_properties table
CREATE TABLE IF NOT EXISTS rental_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'room', 'villa', 'studio', 'cottage')),

  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,

  -- Pricing
  price_per_night_usdt NUMERIC NOT NULL CHECK (price_per_night_usdt > 0),
  cleaning_fee_usdt NUMERIC DEFAULT 0 CHECK (cleaning_fee_usdt >= 0),

  -- Property details
  max_guests INTEGER NOT NULL CHECK (max_guests > 0),
  bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
  bathrooms NUMERIC NOT NULL CHECK (bathrooms >= 0),
  area_sqm NUMERIC CHECK (area_sqm > 0),

  -- Amenities & Rules
  amenities JSONB DEFAULT '[]'::jsonb, -- ['wifi', 'parking', 'kitchen', 'pool', 'gym', 'tv', 'ac', 'heating', 'washer']
  house_rules TEXT,

  -- Booking settings
  check_in_time TIME DEFAULT '15:00',
  check_out_time TIME DEFAULT '11:00',
  minimum_nights INTEGER DEFAULT 1 CHECK (minimum_nights >= 1),
  maximum_nights INTEGER DEFAULT 365 CHECK (maximum_nights >= minimum_nights),
  instant_booking BOOLEAN DEFAULT false, -- auto-confirm or requires approval

  -- Status
  is_active BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create rental_property_images table
CREATE TABLE IF NOT EXISTS rental_property_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create rental_unavailability table (owner can block dates)
CREATE TABLE IF NOT EXISTS rental_unavailability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT, -- 'blocked_by_owner', 'maintenance', etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- 4. Create rental_bookings table
CREATE TABLE IF NOT EXISTS rental_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Booking dates
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests_count INTEGER NOT NULL CHECK (guests_count > 0),

  -- Pricing breakdown
  total_nights INTEGER NOT NULL CHECK (total_nights > 0),
  price_per_night_usdt NUMERIC NOT NULL,
  subtotal_usdt NUMERIC NOT NULL, -- price_per_night * nights
  cleaning_fee_usdt NUMERIC DEFAULT 0,
  service_fee_usdt NUMERIC NOT NULL, -- 7% commission
  total_amount_usdt NUMERIC NOT NULL,

  -- Booking details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'completed', 'rejected')),
  special_requests TEXT,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  CONSTRAINT valid_booking_dates CHECK (check_out_date > check_in_date)
);

-- 5. Create rental_invoices table
CREATE TABLE IF NOT EXISTS rental_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID UNIQUE NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  amount_usdt NUMERIC NOT NULL CHECK (amount_usdt > 0),
  payment_instructions TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'cancelled', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create rental_reviews table
CREATE TABLE IF NOT EXISTS rental_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
  booking_id UUID UNIQUE NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Ratings (1-5)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Review text
  review_text TEXT,

  -- Response from owner
  owner_response TEXT,
  owner_response_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create rental_owner_payouts table
CREATE TABLE IF NOT EXISTS rental_owner_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES rental_bookings(id) ON DELETE SET NULL,

  amount_usdt NUMERIC NOT NULL CHECK (amount_usdt > 0), -- amount after 7% commission
  service_fee_usdt NUMERIC NOT NULL, -- 7% that goes to platform
  gross_amount_usdt NUMERIC NOT NULL, -- total before commission

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payout_method TEXT CHECK (payout_method IN ('fiat', 'usdt')),
  payout_details TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 8. Create indexes
CREATE INDEX idx_rental_properties_owner ON rental_properties(owner_id);
CREATE INDEX idx_rental_properties_location ON rental_properties(country, city);
CREATE INDEX idx_rental_properties_active ON rental_properties(is_active) WHERE is_active = true;
CREATE INDEX idx_rental_properties_price ON rental_properties(price_per_night_usdt);

CREATE INDEX idx_rental_bookings_property ON rental_bookings(rental_property_id);
CREATE INDEX idx_rental_bookings_guest ON rental_bookings(guest_id);
CREATE INDEX idx_rental_bookings_dates ON rental_bookings(check_in_date, check_out_date);
CREATE INDEX idx_rental_bookings_status ON rental_bookings(status);

CREATE INDEX idx_rental_unavailability_property ON rental_unavailability(rental_property_id);
CREATE INDEX idx_rental_unavailability_dates ON rental_unavailability(start_date, end_date);

CREATE INDEX idx_rental_reviews_property ON rental_reviews(rental_property_id);
CREATE INDEX idx_rental_reviews_rating ON rental_reviews(overall_rating);

-- 9. Enable RLS
ALTER TABLE rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_owner_payouts ENABLE ROW LEVEL SECURITY;

-- 10. Helper function to check if user can manage rentals
CREATE OR REPLACE FUNCTION can_manage_rentals()
RETURNS BOOLEAN AS $$
BEGIN
  -- Everyone except admin, lovepay, lawyer can manage rentals
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role NOT IN ('admin', 'lovepay', 'lawyer')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 11. RLS Policies for rental_properties

-- Anyone can view active properties
CREATE POLICY "Anyone can view active rental properties" ON rental_properties
  FOR SELECT USING (is_active = true OR owner_id = auth.uid());

-- Users (except admin/lovepay/lawyer) can create
CREATE POLICY "Users can create rental properties" ON rental_properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND can_manage_rentals());

-- Owners can update their properties
CREATE POLICY "Owners can update own rental properties" ON rental_properties
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their properties
CREATE POLICY "Owners can delete own rental properties" ON rental_properties
  FOR DELETE USING (auth.uid() = owner_id);

-- 12. RLS Policies for rental_property_images

CREATE POLICY "Anyone can view rental property images" ON rental_property_images
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage rental property images" ON rental_property_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rental_properties
      WHERE id = rental_property_id AND owner_id = auth.uid()
    )
  );

-- 13. RLS Policies for rental_unavailability

CREATE POLICY "Anyone can view unavailability" ON rental_unavailability
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage unavailability" ON rental_unavailability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rental_properties
      WHERE id = rental_property_id AND owner_id = auth.uid()
    )
  );

-- 14. RLS Policies for rental_bookings

-- Guests and property owners can view bookings
CREATE POLICY "View own rental bookings" ON rental_bookings
  FOR SELECT USING (
    auth.uid() = guest_id OR
    EXISTS (
      SELECT 1 FROM rental_properties
      WHERE id = rental_property_id AND owner_id = auth.uid()
    ) OR
    public.is_lovepay()
  );

-- Authenticated users can create bookings
CREATE POLICY "Users can create rental bookings" ON rental_bookings
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

-- Guests and owners can update bookings
CREATE POLICY "Manage own rental bookings" ON rental_bookings
  FOR UPDATE USING (
    auth.uid() = guest_id OR
    EXISTS (
      SELECT 1 FROM rental_properties
      WHERE id = rental_property_id AND owner_id = auth.uid()
    )
  );

-- 15. RLS Policies for rental_invoices

CREATE POLICY "View rental invoices" ON rental_invoices
  FOR SELECT USING (
    public.is_lovepay() OR
    EXISTS (
      SELECT 1 FROM rental_bookings rb
      WHERE rb.id = booking_id AND (
        rb.guest_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM rental_properties rp
          WHERE rp.id = rb.rental_property_id AND rp.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "LovePay can manage rental invoices" ON rental_invoices
  FOR ALL USING (public.is_lovepay());

-- 16. RLS Policies for rental_reviews

CREATE POLICY "Anyone can view rental reviews" ON rental_reviews
  FOR SELECT USING (true);

CREATE POLICY "Guests can create reviews after stay" ON rental_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM rental_bookings
      WHERE id = booking_id
      AND guest_id = auth.uid()
      AND status = 'completed'
    )
  );

CREATE POLICY "Owners can respond to reviews" ON rental_reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rental_properties rp
      JOIN rental_bookings rb ON rb.rental_property_id = rp.id
      WHERE rb.id = booking_id AND rp.owner_id = auth.uid()
    )
  );

-- 17. RLS Policies for rental_owner_payouts

CREATE POLICY "Owners view own payouts" ON rental_owner_payouts
  FOR SELECT USING (auth.uid() = owner_id OR public.is_lovepay());

CREATE POLICY "Owners request payouts" ON rental_owner_payouts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "LovePay manages payouts" ON rental_owner_payouts
  FOR ALL USING (public.is_lovepay());

-- 18. Function to check rental availability
CREATE OR REPLACE FUNCTION check_rental_availability(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if property exists and is active
  IF NOT EXISTS (SELECT 1 FROM rental_properties WHERE id = p_property_id AND is_active = true) THEN
    RETURN false;
  END IF;

  -- Check for overlapping bookings (excluding cancelled/rejected)
  IF EXISTS (
    SELECT 1 FROM rental_bookings
    WHERE rental_property_id = p_property_id
    AND status NOT IN ('cancelled', 'rejected')
    AND (
      (check_in_date <= p_check_in AND check_out_date > p_check_in) OR
      (check_in_date < p_check_out AND check_out_date >= p_check_out) OR
      (check_in_date >= p_check_in AND check_out_date <= p_check_out)
    )
  ) THEN
    RETURN false;
  END IF;

  -- Check for unavailability periods
  IF EXISTS (
    SELECT 1 FROM rental_unavailability
    WHERE rental_property_id = p_property_id
    AND (
      (start_date <= p_check_in AND end_date > p_check_in) OR
      (start_date < p_check_out AND end_date >= p_check_out) OR
      (start_date >= p_check_in AND end_date <= p_check_out)
    )
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- 19. Function to get unavailable dates for a property
CREATE OR REPLACE FUNCTION get_rental_unavailable_dates(
  p_property_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(date DATE, reason TEXT) AS $$
BEGIN
  RETURN QUERY
  -- Dates from bookings
  SELECT
    generate_series(rb.check_in_date, rb.check_out_date - 1, '1 day'::interval)::DATE as date,
    'booked'::TEXT as reason
  FROM rental_bookings rb
  WHERE rb.rental_property_id = p_property_id
  AND rb.status NOT IN ('cancelled', 'rejected')
  AND rb.check_in_date <= p_end_date
  AND rb.check_out_date >= p_start_date

  UNION ALL

  -- Dates from unavailability
  SELECT
    generate_series(ru.start_date, ru.end_date, '1 day'::interval)::DATE as date,
    COALESCE(ru.reason, 'unavailable')::TEXT as reason
  FROM rental_unavailability ru
  WHERE ru.rental_property_id = p_property_id
  AND ru.start_date <= p_end_date
  AND ru.end_date >= p_start_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- 20. Function to calculate rental booking total
CREATE OR REPLACE FUNCTION calculate_rental_total(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE(
  total_nights INTEGER,
  price_per_night NUMERIC,
  subtotal NUMERIC,
  cleaning_fee NUMERIC,
  service_fee NUMERIC,
  total_amount NUMERIC
) AS $$
DECLARE
  v_nights INTEGER;
  v_price_per_night NUMERIC;
  v_cleaning_fee NUMERIC;
  v_subtotal NUMERIC;
  v_service_fee NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Get property details
  SELECT
    price_per_night_usdt,
    cleaning_fee_usdt
  INTO v_price_per_night, v_cleaning_fee
  FROM rental_properties
  WHERE id = p_property_id;

  -- Calculate nights
  v_nights := p_check_out - p_check_in;

  -- Calculate subtotal
  v_subtotal := v_price_per_night * v_nights;

  -- Calculate 7% service fee
  v_service_fee := ROUND((v_subtotal + v_cleaning_fee) * 0.07, 2);

  -- Calculate total
  v_total := v_subtotal + v_cleaning_fee + v_service_fee;

  RETURN QUERY SELECT
    v_nights,
    v_price_per_night,
    v_subtotal,
    v_cleaning_fee,
    v_service_fee,
    v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- 21. Trigger to validate booking before insert
CREATE OR REPLACE FUNCTION validate_rental_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_property rental_properties%ROWTYPE;
  v_available BOOLEAN;
BEGIN
  -- Get property details
  SELECT * INTO v_property
  FROM rental_properties
  WHERE id = NEW.rental_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  -- Check if property is active
  IF NOT v_property.is_active THEN
    RAISE EXCEPTION 'Property is not available for booking';
  END IF;

  -- Check minimum/maximum nights
  IF NEW.total_nights < v_property.minimum_nights THEN
    RAISE EXCEPTION 'Booking must be at least % nights', v_property.minimum_nights;
  END IF;

  IF NEW.total_nights > v_property.maximum_nights THEN
    RAISE EXCEPTION 'Booking cannot exceed % nights', v_property.maximum_nights;
  END IF;

  -- Check guests count
  IF NEW.guests_count > v_property.max_guests THEN
    RAISE EXCEPTION 'Maximum guests allowed: %', v_property.max_guests;
  END IF;

  -- Check availability
  v_available := check_rental_availability(
    NEW.rental_property_id,
    NEW.check_in_date,
    NEW.check_out_date
  );

  IF NOT v_available THEN
    RAISE EXCEPTION 'Property is not available for selected dates';
  END IF;

  -- Auto-confirm if instant_booking is enabled
  IF v_property.instant_booking THEN
    NEW.status := 'confirmed';
    NEW.confirmed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_rental_booking_trigger
  BEFORE INSERT ON rental_bookings
  FOR EACH ROW EXECUTE FUNCTION validate_rental_booking();

-- 22. Trigger to create invoice when booking is confirmed
CREATE OR REPLACE FUNCTION create_rental_invoice_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create invoice when status changes to confirmed and invoice doesn't exist
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    IF NOT EXISTS (SELECT 1 FROM rental_invoices WHERE booking_id = NEW.id) THEN
      INSERT INTO rental_invoices (
        booking_id,
        amount_usdt,
        payment_instructions,
        status
      ) VALUES (
        NEW.id,
        NEW.total_amount_usdt,
        'Please pay ' || NEW.total_amount_usdt || ' USDT to complete your booking. Payment instructions will be provided after confirmation.',
        'created'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_rental_invoice_trigger
  AFTER INSERT OR UPDATE OF status ON rental_bookings
  FOR EACH ROW EXECUTE FUNCTION create_rental_invoice_on_confirm();

-- 23. Trigger to create owner payout when invoice is paid
CREATE OR REPLACE FUNCTION create_rental_payout_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_booking rental_bookings%ROWTYPE;
  v_property rental_properties%ROWTYPE;
  v_owner_amount NUMERIC;
  v_service_fee NUMERIC;
BEGIN
  -- Only process when invoice is paid
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN

    -- Get booking details
    SELECT * INTO v_booking FROM rental_bookings WHERE id = NEW.booking_id;

    -- Get property and owner
    SELECT * INTO v_property FROM rental_properties WHERE id = v_booking.rental_property_id;

    -- Calculate owner payout (gross - 7% commission)
    v_service_fee := v_booking.service_fee_usdt;
    v_owner_amount := v_booking.total_amount_usdt - v_service_fee;

    -- Update booking status to paid
    UPDATE rental_bookings SET status = 'paid' WHERE id = NEW.booking_id;

    -- Create payout record
    INSERT INTO rental_owner_payouts (
      owner_id,
      booking_id,
      amount_usdt,
      service_fee_usdt,
      gross_amount_usdt,
      status
    ) VALUES (
      v_property.owner_id,
      v_booking.id,
      v_owner_amount,
      v_service_fee,
      v_booking.total_amount_usdt,
      'pending'
    );

    -- Send notification to owner
    PERFORM public.create_notification(
      v_property.owner_id,
      'New Rental Booking Payment',
      'You received a payment of ' || v_owner_amount || ' USDT (after 7% service fee)',
      jsonb_build_object(
        'type', 'rental_payment',
        'booking_id', v_booking.id,
        'amount', v_owner_amount,
        'service_fee', v_service_fee
      )
    );

    -- Send notification to guest
    PERFORM public.create_notification(
      v_booking.guest_id,
      'Booking Confirmed',
      'Your rental booking has been confirmed and paid',
      jsonb_build_object(
        'type', 'rental_confirmed',
        'booking_id', v_booking.id,
        'check_in', v_booking.check_in_date,
        'check_out', v_booking.check_out_date
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_rental_payout_trigger
  AFTER UPDATE OF status ON rental_invoices
  FOR EACH ROW EXECUTE FUNCTION create_rental_payout_on_payment();

-- 24. Trigger to auto-complete bookings after checkout
CREATE OR REPLACE FUNCTION auto_complete_rental_bookings()
RETURNS void AS $$
BEGIN
  UPDATE rental_bookings
  SET status = 'completed'
  WHERE status = 'paid'
  AND check_out_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 25. Trigger to update updated_at timestamps
CREATE TRIGGER update_rental_properties_timestamp
  BEFORE UPDATE ON rental_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_bookings_timestamp
  BEFORE UPDATE ON rental_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_invoices_timestamp
  BEFORE UPDATE ON rental_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_reviews_timestamp
  BEFORE UPDATE ON rental_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_payouts_timestamp
  BEFORE UPDATE ON rental_owner_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 26. View for rental property statistics
CREATE OR REPLACE VIEW rental_property_stats AS
SELECT
  rp.id as property_id,
  rp.owner_id,
  rp.title,
  rp.price_per_night_usdt,
  COUNT(DISTINCT rb.id) FILTER (WHERE rb.status NOT IN ('cancelled', 'rejected')) as total_bookings,
  COUNT(DISTINCT rb.id) FILTER (WHERE rb.status = 'completed') as completed_bookings,
  AVG(rr.overall_rating) as average_rating,
  COUNT(DISTINCT rr.id) as total_reviews,
  SUM(rb.total_amount_usdt) FILTER (WHERE rb.status = 'paid' OR rb.status = 'completed') as total_revenue,
  SUM(rb.service_fee_usdt) FILTER (WHERE rb.status = 'paid' OR rb.status = 'completed') as platform_fees
FROM rental_properties rp
LEFT JOIN rental_bookings rb ON rb.rental_property_id = rp.id
LEFT JOIN rental_reviews rr ON rr.rental_property_id = rp.id
GROUP BY rp.id, rp.owner_id, rp.title, rp.price_per_night_usdt;

-- 27. Grant permissions
GRANT ALL ON rental_properties TO authenticated;
GRANT ALL ON rental_property_images TO authenticated;
GRANT ALL ON rental_unavailability TO authenticated;
GRANT ALL ON rental_bookings TO authenticated;
GRANT ALL ON rental_invoices TO authenticated;
GRANT ALL ON rental_reviews TO authenticated;
GRANT ALL ON rental_owner_payouts TO authenticated;
GRANT SELECT ON rental_property_stats TO authenticated;

-- 28. Create function to get owner properties with earnings
CREATE OR REPLACE FUNCTION get_owner_rental_dashboard(p_owner_id UUID)
RETURNS TABLE(
  total_properties BIGINT,
  active_bookings BIGINT,
  pending_payouts NUMERIC,
  total_earned NUMERIC,
  this_month_bookings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM rental_properties WHERE owner_id = p_owner_id)::BIGINT,
    (SELECT COUNT(*) FROM rental_bookings rb
     JOIN rental_properties rp ON rp.id = rb.rental_property_id
     WHERE rp.owner_id = p_owner_id AND rb.status IN ('confirmed', 'paid'))::BIGINT,
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM rental_owner_payouts
     WHERE owner_id = p_owner_id AND status = 'pending'),
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM rental_owner_payouts
     WHERE owner_id = p_owner_id AND status = 'paid'),
    (SELECT COUNT(*) FROM rental_bookings rb
     JOIN rental_properties rp ON rp.id = rb.rental_property_id
     WHERE rp.owner_id = p_owner_id
     AND rb.created_at >= DATE_TRUNC('month', CURRENT_DATE))::BIGINT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- END OF MIGRATION
-- =============================================

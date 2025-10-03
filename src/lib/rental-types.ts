// Rental System Types for MYES.GLOBAL

export type RentalPropertyType = 'apartment' | 'house' | 'room' | 'villa' | 'studio' | 'cottage';

export type RentalBookingStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'completed' | 'rejected';

export type RentalInvoiceStatus = 'created' | 'paid' | 'cancelled' | 'refunded';

export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface RentalProperty {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  property_type: RentalPropertyType;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  price_per_night_usdt: number;
  cleaning_fee_usdt: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  area_sqm?: number;
  amenities: string[]; // ['wifi', 'parking', 'kitchen', 'pool', 'gym', 'tv', 'ac', 'heating', 'washer']
  house_rules?: string;
  check_in_time: string; // '15:00'
  check_out_time: string; // '11:00'
  minimum_nights: number;
  maximum_nights: number;
  instant_booking: boolean;
  is_active: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;

  // Relations
  rental_property_images?: RentalPropertyImage[];
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
}

export interface RentalPropertyImage {
  id: string;
  rental_property_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface RentalUnavailability {
  id: string;
  rental_property_id: string;
  start_date: string; // ISO date
  end_date: string;
  reason?: string;
  created_at: string;
}

export interface RentalBooking {
  id: string;
  rental_property_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  total_nights: number;
  price_per_night_usdt: number;
  subtotal_usdt: number;
  cleaning_fee_usdt: number;
  service_fee_usdt: number; // 7%
  total_amount_usdt: number;
  status: RentalBookingStatus;
  special_requests?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;

  // Relations
  rental_properties?: RentalProperty;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface RentalInvoice {
  id: string;
  booking_id: string;
  amount_usdt: number;
  payment_instructions: string;
  status: RentalInvoiceStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;

  // Relations
  rental_bookings?: RentalBooking;
}

export interface RentalReview {
  id: string;
  rental_property_id: string;
  booking_id: string;
  reviewer_id: string;
  overall_rating: number; // 1-5
  cleanliness_rating?: number;
  accuracy_rating?: number;
  communication_rating?: number;
  location_rating?: number;
  value_rating?: number;
  review_text?: string;
  owner_response?: string;
  owner_response_at?: string;
  created_at: string;
  updated_at: string;

  // Relations
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface RentalOwnerPayout {
  id: string;
  owner_id: string;
  booking_id?: string;
  amount_usdt: number; // After 7% commission
  service_fee_usdt: number; // 7% platform fee
  gross_amount_usdt: number; // Total before commission
  status: PayoutStatus;
  payout_method?: 'fiat' | 'usdt';
  payout_details?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}

export interface RentalAvailabilityResult {
  available: boolean;
  unavailable_dates?: { date: string; reason: string }[];
}

export interface RentalPriceCalculation {
  total_nights: number;
  price_per_night: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number; // 7%
  total_amount: number;
}

export interface RentalPropertyStats {
  property_id: string;
  owner_id: string;
  title: string;
  price_per_night_usdt: number;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number | null;
  total_reviews: number;
  total_revenue: number;
  platform_fees: number;
}

export interface OwnerRentalDashboard {
  total_properties: number;
  active_bookings: number;
  pending_payouts: number;
  total_earned: number;
  this_month_bookings: number;
}

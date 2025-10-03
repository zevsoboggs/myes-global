import { supabase } from './supabase';
import type {
  RentalProperty,
  RentalBooking,
  RentalInvoice,
  RentalReview,
  RentalAvailabilityResult,
  RentalPriceCalculation,
  RentalPropertyStats,
  OwnerRentalDashboard,
  RentalUnavailability,
  RentalOwnerPayout,
} from './rental-types';

// =============================================
// RENTAL PROPERTIES
// =============================================

export async function getAllRentalProperties(filters?: {
  country?: string;
  city?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  guests?: number;
  check_in?: string;
  check_out?: string;
}) {
  let query = supabase
    .from('rental_properties')
    .select(`
      *,
      rental_property_images(*),
      profiles:owner_id(id, full_name, email, phone, avatar_url)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.country) {
    query = query.ilike('country', `%${filters.country}%`);
  }

  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }

  if (filters?.property_type) {
    query = query.eq('property_type', filters.property_type);
  }

  if (filters?.min_price) {
    query = query.gte('price_per_night_usdt', filters.min_price);
  }

  if (filters?.max_price) {
    query = query.lte('price_per_night_usdt', filters.max_price);
  }

  if (filters?.bedrooms) {
    query = query.gte('bedrooms', filters.bedrooms);
  }

  if (filters?.guests) {
    query = query.gte('max_guests', filters.guests);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Filter by availability if dates provided
  if (filters?.check_in && filters?.check_out && data) {
    const availableProperties = await Promise.all(
      data.map(async (property) => {
        const isAvailable = await checkRentalAvailability(
          property.id,
          filters.check_in!,
          filters.check_out!
        );
        return isAvailable ? property : null;
      })
    );
    return availableProperties.filter((p) => p !== null) as RentalProperty[];
  }

  return data as RentalProperty[];
}

export async function getRentalPropertyById(id: string) {
  const { data, error } = await supabase
    .from('rental_properties')
    .select(`
      *,
      rental_property_images(*),
      profiles:owner_id(id, full_name, email, phone, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as RentalProperty;
}

export async function getMyRentalProperties(userId: string) {
  const { data, error } = await supabase
    .from('rental_properties')
    .select(`
      *,
      rental_property_images(*)
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RentalProperty[];
}

export async function createRentalProperty(property: Partial<RentalProperty>) {
  const { data, error } = await supabase
    .from('rental_properties')
    .insert(property)
    .select()
    .single();

  if (error) throw error;
  return data as RentalProperty;
}

export async function updateRentalProperty(id: string, updates: Partial<RentalProperty>) {
  const { data, error } = await supabase
    .from('rental_properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as RentalProperty;
}

export async function deleteRentalProperty(id: string) {
  const { error } = await supabase
    .from('rental_properties')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =============================================
// RENTAL PROPERTY IMAGES
// =============================================

export async function uploadRentalPropertyImage(
  propertyId: string,
  file: File,
  isPrimary: boolean = false
) {
  // Upload to storage
  const fileName = `${propertyId}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('properties')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('properties')
    .getPublicUrl(uploadData.path);

  // Create image record
  const { data, error } = await supabase
    .from('rental_property_images')
    .insert({
      rental_property_id: propertyId,
      image_url: publicUrl,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRentalPropertyImage(imageId: string) {
  const { error } = await supabase
    .from('rental_property_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
}

// =============================================
// AVAILABILITY
// =============================================

export async function checkRentalAvailability(
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rental_availability', {
    p_property_id: propertyId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });

  if (error) throw error;
  return data as boolean;
}

export async function getRentalUnavailableDates(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase.rpc('get_rental_unavailable_dates', {
    p_property_id: propertyId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data as { date: string; reason: string }[];
}

export async function addUnavailabilityPeriod(period: {
  rental_property_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}) {
  const { data, error } = await supabase
    .from('rental_unavailability')
    .insert(period)
    .select()
    .single();

  if (error) throw error;
  return data as RentalUnavailability;
}

export async function deleteUnavailabilityPeriod(id: string) {
  const { error } = await supabase
    .from('rental_unavailability')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getPropertyUnavailability(propertyId: string) {
  const { data, error } = await supabase
    .from('rental_unavailability')
    .select('*')
    .eq('rental_property_id', propertyId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data as RentalUnavailability[];
}

// =============================================
// BOOKINGS
// =============================================

export async function calculateRentalPrice(
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<RentalPriceCalculation> {
  const { data, error } = await supabase.rpc('calculate_rental_total', {
    p_property_id: propertyId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });

  if (error) throw error;
  return data[0] as RentalPriceCalculation;
}

export async function createRentalBooking(booking: {
  rental_property_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  special_requests?: string;
}) {
  // First calculate pricing
  const pricing = await calculateRentalPrice(
    booking.rental_property_id,
    booking.check_in_date,
    booking.check_out_date
  );

  // Create booking with calculated prices
  const { data, error } = await supabase
    .from('rental_bookings')
    .insert({
      ...booking,
      total_nights: pricing.total_nights,
      price_per_night_usdt: pricing.price_per_night,
      subtotal_usdt: pricing.subtotal,
      cleaning_fee_usdt: pricing.cleaning_fee,
      service_fee_usdt: pricing.service_fee,
      total_amount_usdt: pricing.total_amount,
    })
    .select(`
      *,
      rental_properties(*),
      profiles:guest_id(id, full_name, email, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as RentalBooking;
}

export async function getMyRentalBookings(userId: string) {
  const { data, error } = await supabase
    .from('rental_bookings')
    .select(`
      *,
      rental_properties(*, rental_property_images(*)),
      profiles:guest_id(id, full_name, email, avatar_url)
    `)
    .eq('guest_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RentalBooking[];
}

export async function getPropertyBookings(propertyId: string) {
  const { data, error } = await supabase
    .from('rental_bookings')
    .select(`
      *,
      profiles:guest_id(id, full_name, email, avatar_url)
    `)
    .eq('rental_property_id', propertyId)
    .order('check_in_date', { ascending: true });

  if (error) throw error;
  return data as RentalBooking[];
}

export async function getOwnerBookings(ownerId: string) {
  const { data, error } = await supabase
    .from('rental_bookings')
    .select(`
      *,
      rental_properties!inner(*),
      profiles:guest_id(id, full_name, email, avatar_url)
    `)
    .eq('rental_properties.owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RentalBooking[];
}

export async function updateRentalBookingStatus(
  bookingId: string,
  status: string,
  cancellationReason?: string
) {
  const updates: any = { status };
  if (cancellationReason) {
    updates.cancellation_reason = cancellationReason;
  }
  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
  }
  if (status === 'confirmed') {
    updates.confirmed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('rental_bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data as RentalBooking;
}

// =============================================
// INVOICES
// =============================================

export async function getRentalInvoice(bookingId: string) {
  const { data, error } = await supabase
    .from('rental_invoices')
    .select(`
      *,
      rental_bookings(
        *,
        rental_properties(*),
        profiles:guest_id(id, full_name, email)
      )
    `)
    .eq('booking_id', bookingId)
    .single();

  if (error) throw error;
  return data as RentalInvoice;
}

export async function markRentalInvoicePaid(invoiceId: string) {
  const { data, error } = await supabase
    .from('rental_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data as RentalInvoice;
}

// =============================================
// REVIEWS
// =============================================

export async function createRentalReview(review: {
  rental_property_id: string;
  booking_id: string;
  reviewer_id: string;
  overall_rating: number;
  cleanliness_rating?: number;
  accuracy_rating?: number;
  communication_rating?: number;
  location_rating?: number;
  value_rating?: number;
  review_text?: string;
}) {
  const { data, error } = await supabase
    .from('rental_reviews')
    .insert(review)
    .select(`
      *,
      profiles:reviewer_id(id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as RentalReview;
}

export async function getPropertyReviews(propertyId: string) {
  const { data, error } = await supabase
    .from('rental_reviews')
    .select(`
      *,
      profiles:reviewer_id(id, full_name, avatar_url)
    `)
    .eq('rental_property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RentalReview[];
}

export async function respondToReview(reviewId: string, response: string) {
  const { data, error } = await supabase
    .from('rental_reviews')
    .update({
      owner_response: response,
      owner_response_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data as RentalReview;
}

// =============================================
// STATISTICS & DASHBOARD
// =============================================

export async function getRentalPropertyStats(propertyId: string) {
  const { data, error } = await supabase
    .from('rental_property_stats')
    .select('*')
    .eq('property_id', propertyId)
    .single();

  if (error) throw error;
  return data as RentalPropertyStats;
}

export async function getOwnerDashboard(ownerId: string): Promise<OwnerRentalDashboard> {
  const { data, error } = await supabase.rpc('get_owner_rental_dashboard', {
    p_owner_id: ownerId,
  });

  if (error) throw error;
  return data[0] as OwnerRentalDashboard;
}

// =============================================
// PAYOUTS
// =============================================

export async function getOwnerPayouts(ownerId: string) {
  const { data, error } = await supabase
    .from('rental_owner_payouts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RentalOwnerPayout[];
}

export async function requestPayout(payout: {
  owner_id: string;
  amount_usdt: number;
  payout_method: 'fiat' | 'usdt';
  payout_details: string;
}) {
  const { data, error } = await supabase
    .from('rental_owner_payouts')
    .insert(payout)
    .select()
    .single();

  if (error) throw error;
  return data as RentalOwnerPayout;
}

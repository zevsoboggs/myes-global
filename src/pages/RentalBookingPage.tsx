import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getRentalPropertyById,
  checkRentalAvailability,
  getRentalUnavailableDates,
  calculateRentalPrice,
  createRentalBooking,
} from '../lib/rental-api';
import type { RentalProperty, RentalPriceCalculation } from '../lib/rental-types';
import { Calendar, Users, DollarSign, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

export function RentalBookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');

  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [pricing, setPricing] = useState<RentalPriceCalculation | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty();
    }
  }, [id]);

  useEffect(() => {
    if (property && checkInDate && checkOutDate) {
      checkAvailability();
    } else {
      setIsAvailable(null);
      setPricing(null);
    }
  }, [checkInDate, checkOutDate, property]);

  useEffect(() => {
    if (property) {
      loadUnavailableDates();
    }
  }, [property]);

  const loadProperty = async () => {
    try {
      const data = await getRentalPropertyById(id!);
      setProperty(data);
    } catch (error: any) {
      console.error('Error loading property:', error);
      alert('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const loadUnavailableDates = async () => {
    if (!property) return;

    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);

    try {
      const dates = await getRentalUnavailableDates(
        property.id,
        today.toISOString().split('T')[0],
        threeMonthsLater.toISOString().split('T')[0]
      );

      const unavailableSet = new Set(dates.map((d) => d.date));
      setUnavailableDates(unavailableSet);
    } catch (error) {
      console.error('Error loading unavailable dates:', error);
    }
  };

  const checkAvailability = async () => {
    if (!property || !checkInDate || !checkOutDate) return;

    setCheckingAvailability(true);

    try {
      const available = await checkRentalAvailability(property.id, checkInDate, checkOutDate);
      setIsAvailable(available);

      if (available) {
        const price = await calculateRentalPrice(property.id, checkInDate, checkOutDate);
        setPricing(price);
      } else {
        setPricing(null);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setIsAvailable(false);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      alert('Please sign in to book');
      navigate('/auth');
      return;
    }

    if (!property || !checkInDate || !checkOutDate || !isAvailable) {
      alert('Please select valid dates');
      return;
    }

    if (guestsCount > property.max_guests) {
      alert(`Maximum ${property.max_guests} guests allowed`);
      return;
    }

    setBookingLoading(true);

    try {
      const booking = await createRentalBooking({
        rental_property_id: property.id,
        guest_id: user.id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guests_count: guestsCount,
        special_requests: specialRequests,
      });

      alert(
        property.instant_booking
          ? 'Booking confirmed! Check your email for details.'
          : 'Booking request sent! The host will confirm your booking soon.'
      );
      navigate(`/rentals/bookings/${booking.id}`);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const isDateUnavailable = (date: string) => {
    return unavailableDates.has(date);
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Tomorrow at earliest
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h2>
          <button onClick={() => navigate('/rentals')} className="text-blue-600 hover:underline">
            Browse properties
          </button>
        </div>
      </div>
    );
  }

  const primaryImage = property.rental_property_images?.find((img) => img.is_primary);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {primaryImage && (
                <img
                  src={primaryImage.image_url}
                  alt={property.title}
                  className="w-full h-64 object-cover"
                />
              )}

              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>

                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.city}, {property.country}
                </div>

                <div className="flex items-center space-x-6 text-gray-700 mb-6">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {property.max_guests} guests
                  </span>
                  <span>{property.bedrooms} bedrooms</span>
                  <span>{property.bathrooms} bathrooms</span>
                  {property.area_sqm && <span>{property.area_sqm} m²</span>}
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700">{property.description}</p>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm capitalize"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {property.house_rules && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">House Rules</h3>
                    <p className="text-gray-700 whitespace-pre-line">{property.house_rules}</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center text-gray-700">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      Check-in: {property.check_in_time} | Check-out: {property.check_out_time}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Minimum stay: {property.minimum_nights}{' '}
                    {property.minimum_nights === 1 ? 'night' : 'nights'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <div className="flex items-baseline mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  ${property.price_per_night_usdt}
                </span>
                <span className="text-gray-600 ml-2">USDT / night</span>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
                  <input
                    type="date"
                    min={getMinDate()}
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
                  <input
                    type="date"
                    min={checkInDate || getMinDate()}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: property.max_guests }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {checkingAvailability && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                  <p className="text-sm text-gray-600 mt-2">Checking availability...</p>
                </div>
              )}

              {isAvailable === true && pricing && (
                <div className="space-y-3 mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center text-green-700 font-medium mb-2">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Available for your dates
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>
                        ${pricing.price_per_night} × {pricing.total_nights} nights
                      </span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    {pricing.cleaning_fee > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Cleaning fee</span>
                        <span>${pricing.cleaning_fee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-700">
                      <span>Service fee (7%)</span>
                      <span>${pricing.service_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t">
                      <span>Total</span>
                      <span>${pricing.total_amount.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>
              )}

              {isAvailable === false && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-6">
                  <div className="flex items-center text-red-700 font-medium">
                    <XCircle className="w-5 h-5 mr-2" />
                    Not available for selected dates
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    Please choose different dates or contact the host.
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special requests (optional)
                </label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special requests or questions for the host..."
                />
              </div>

              <button
                onClick={handleBooking}
                disabled={!isAvailable || bookingLoading || checkingAvailability}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bookingLoading
                  ? 'Processing...'
                  : property.instant_booking
                  ? 'Book Now'
                  : 'Request to Book'}
              </button>

              {property.instant_booking && (
                <p className="text-xs text-gray-600 text-center mt-2">
                  Your booking will be confirmed instantly
                </p>
              )}

              <p className="text-xs text-gray-500 text-center mt-4">
                You won't be charged yet. Payment will be requested after confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyRentalBookings,
  getOwnerBookings,
  updateRentalBookingStatus,
  getRentalInvoice,
} from '../lib/rental-api';
import type { RentalBooking } from '../lib/rental-types';
import { Calendar, MapPin, Users, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type TabType = 'guest' | 'owner';

export function ManageRentalBookingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('guest');
  const [guestBookings, setGuestBookings] = useState<RentalBooking[]>([]);
  const [ownerBookings, setOwnerBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, activeTab]);

  const loadBookings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (activeTab === 'guest') {
        const data = await getMyRentalBookings(user.id);
        setGuestBookings(data);
      } else {
        const data = await getOwnerBookings(user.id);
        setOwnerBookings(data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await updateRentalBookingStatus(bookingId, 'confirmed');
      alert('Booking confirmed!');
      loadBookings();
    } catch (error: any) {
      alert(error.message || 'Failed to confirm booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading(bookingId);
    try {
      await updateRentalBookingStatus(bookingId, 'rejected', reason);
      alert('Booking rejected');
      loadBookings();
    } catch (error: any) {
      alert(error.message || 'Failed to reject booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setActionLoading(bookingId);
    try {
      await updateRentalBookingStatus(bookingId, 'cancelled', reason);
      alert('Booking cancelled');
      loadBookings();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const bookings = activeTab === 'guest' ? guestBookings : ownerBookings;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Rental Bookings</h1>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('guest')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'guest'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Bookings
              </button>
              <button
                onClick={() => setActiveTab('owner')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'owner'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                As Host
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const property = booking.rental_properties;
              const guest = booking.profiles;
              const primaryImage = property?.rental_property_images?.find((img) => img.is_primary);

              return (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(booking.status)}
                        {getStatusBadge(booking.status)}
                      </div>
                      <span className="text-sm text-gray-500">
                        Booked {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Property Image */}
                      {primaryImage && (
                        <div className="md:col-span-1">
                          <img
                            src={primaryImage.image_url}
                            alt={property?.title}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Booking Details */}
                      <div className="md:col-span-2 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900">{property?.title}</h3>

                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="w-4 h-4 mr-1" />
                          {property?.city}, {property?.country}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-4 h-4 mr-2" />
                            Check-in: {new Date(booking.check_in_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-4 h-4 mr-2" />
                            Check-out: {new Date(booking.check_out_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Users className="w-4 h-4 mr-2" />
                            {booking.guests_count} guests
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Clock className="w-4 h-4 mr-2" />
                            {booking.total_nights} nights
                          </div>
                        </div>

                        {activeTab === 'owner' && guest && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-gray-600">
                              Guest: <span className="font-medium text-gray-900">{guest.full_name}</span>
                            </p>
                            {guest.email && (
                              <p className="text-sm text-gray-600">Email: {guest.email}</p>
                            )}
                          </div>
                        )}

                        {booking.special_requests && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium text-gray-700">Special Requests:</p>
                            <p className="text-sm text-gray-600 mt-1">{booking.special_requests}</p>
                          </div>
                        )}

                        {(booking.cancellation_reason) && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium text-red-700">Cancellation Reason:</p>
                            <p className="text-sm text-red-600 mt-1">{booking.cancellation_reason}</p>
                          </div>
                        )}
                      </div>

                      {/* Pricing & Actions */}
                      <div className="md:col-span-1 flex flex-col justify-between">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">${booking.subtotal_usdt}</span>
                          </div>
                          {booking.cleaning_fee_usdt > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cleaning:</span>
                              <span className="font-medium">${booking.cleaning_fee_usdt}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Service fee:</span>
                            <span className="font-medium">${booking.service_fee_usdt}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t font-semibold">
                            <span>Total:</span>
                            <span className="text-blue-600">${booking.total_amount_usdt} USDT</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 space-y-2">
                          {activeTab === 'owner' && booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmBooking(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                              >
                                {actionLoading === booking.id ? 'Processing...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => handleRejectBooking(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                              >
                                {actionLoading === booking.id ? 'Processing...' : 'Reject'}
                              </button>
                            </>
                          )}

                          {activeTab === 'guest' &&
                            ['pending', 'confirmed'].includes(booking.status) && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                              >
                                {actionLoading === booking.id ? 'Processing...' : 'Cancel Booking'}
                              </button>
                            )}

                          {booking.status === 'confirmed' && (
                            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 text-center">
                              Awaiting payment confirmation
                            </div>
                          )}

                          {booking.status === 'paid' && (
                            <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 text-center">
                              Payment confirmed!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

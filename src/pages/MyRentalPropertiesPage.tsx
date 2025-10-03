import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyRentalProperties,
  updateRentalProperty,
  deleteRentalProperty,
  getPropertyBookings,
  addUnavailabilityPeriod,
  getPropertyUnavailability,
  deleteUnavailabilityPeriod,
} from '../lib/rental-api';
import type { RentalProperty, RentalBooking, RentalUnavailability } from '../lib/rental-types';
import { Home, Eye, Edit, Trash2, Calendar, DollarSign, Users, Plus, Ban, X } from 'lucide-react';

export function MyRentalPropertiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [propertyBookings, setPropertyBookings] = useState<RentalBooking[]>([]);
  const [unavailability, setUnavailability] = useState<RentalUnavailability[]>([]);

  const [blockDatesModal, setBlockDatesModal] = useState(false);
  const [blockDates, setBlockDates] = useState({ start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProperty) {
      loadPropertyDetails(selectedProperty);
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getMyRentalProperties(user.id);
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyDetails = async (propertyId: string) => {
    try {
      const [bookings, unavail] = await Promise.all([
        getPropertyBookings(propertyId),
        getPropertyUnavailability(propertyId),
      ]);
      setPropertyBookings(bookings);
      setUnavailability(unavail);
    } catch (error) {
      console.error('Error loading property details:', error);
    }
  };

  const handleToggleActive = async (property: RentalProperty) => {
    try {
      await updateRentalProperty(property.id, { is_active: !property.is_active });
      loadProperties();
      alert(`Property ${property.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (error: any) {
      alert(error.message || 'Failed to update property');
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) return;

    try {
      await deleteRentalProperty(propertyId);
      loadProperties();
      alert('Property deleted successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to delete property');
    }
  };

  const handleBlockDates = async () => {
    if (!selectedProperty || !blockDates.start_date || !blockDates.end_date) {
      alert('Please select start and end dates');
      return;
    }

    try {
      await addUnavailabilityPeriod({
        rental_property_id: selectedProperty,
        start_date: blockDates.start_date,
        end_date: blockDates.end_date,
        reason: blockDates.reason || 'Blocked by owner',
      });

      setBlockDatesModal(false);
      setBlockDates({ start_date: '', end_date: '', reason: '' });
      loadPropertyDetails(selectedProperty);
      alert('Dates blocked successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to block dates');
    }
  };

  const handleUnblockDates = async (blockId: string) => {
    try {
      await deleteUnavailabilityPeriod(blockId);
      if (selectedProperty) {
        loadPropertyDetails(selectedProperty);
      }
      alert('Dates unblocked successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to unblock dates');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
          <Link to="/auth" className="text-blue-600 hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Rental Properties</h1>
          <Link
            to="/rentals/add"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Property
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-6">Start earning by listing your first rental property</p>
            <Link
              to="/rentals/add"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Property
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {properties.map((property) => {
              const primaryImage = property.rental_property_images?.find((img) => img.is_primary);
              const isSelected = selectedProperty === property.id;

              return (
                <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4 flex-1">
                        {primaryImage && (
                          <img
                            src={primaryImage.image_url}
                            alt={property.title}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{property.title}</h3>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                property.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {property.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <p className="text-gray-600 mb-3">
                            {property.city}, {property.country}
                          </p>

                          <div className="flex items-center space-x-6 text-sm text-gray-700">
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {property.max_guests} guests
                            </span>
                            <span>{property.bedrooms} beds</span>
                            <span>{property.bathrooms} baths</span>
                            <span className="flex items-center font-semibold text-blue-600">
                              <DollarSign className="w-4 h-4" />
                              {property.price_per_night_usdt} USDT/night
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Link
                          to={`/rentals/${property.id}/book`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Link>

                        <button
                          onClick={() => handleToggleActive(property)}
                          className={`px-4 py-2 rounded-lg text-sm ${
                            property.is_active
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {property.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => setSelectedProperty(isSelected ? null : property.id)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          {isSelected ? 'Hide' : 'Manage'}
                        </button>

                        <button
                          onClick={() => handleDelete(property.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded Section */}
                    {isSelected && (
                      <div className="mt-6 pt-6 border-t space-y-6">
                        {/* Bookings */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">
                            Bookings ({propertyBookings.length})
                          </h4>

                          {propertyBookings.length === 0 ? (
                            <p className="text-gray-600 text-sm">No bookings yet</p>
                          ) : (
                            <div className="space-y-3">
                              {propertyBookings.map((booking) => (
                                <div
                                  key={booking.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {booking.profiles?.full_name || 'Guest'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {new Date(booking.check_in_date).toLocaleDateString()} -{' '}
                                      {new Date(booking.check_out_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`px-3 py-1 rounded-full text-sm ${
                                        booking.status === 'paid' || booking.status === 'confirmed'
                                          ? 'bg-green-100 text-green-800'
                                          : booking.status === 'pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {booking.status}
                                    </span>
                                    <p className="text-sm font-semibold text-gray-900 mt-1">
                                      ${booking.total_amount_usdt} USDT
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Blocked Dates */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900">Blocked Dates</h4>
                            <button
                              onClick={() => setBlockDatesModal(true)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Block Dates
                            </button>
                          </div>

                          {unavailability.length === 0 ? (
                            <p className="text-gray-600 text-sm">No blocked dates</p>
                          ) : (
                            <div className="space-y-2">
                              {unavailability.map((block) => (
                                <div
                                  key={block.id}
                                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {new Date(block.start_date).toLocaleDateString()} -{' '}
                                      {new Date(block.end_date).toLocaleDateString()}
                                    </p>
                                    {block.reason && (
                                      <p className="text-sm text-gray-600">{block.reason}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleUnblockDates(block.id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Block Dates Modal */}
        {blockDatesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Block Dates</h3>
                <button
                  onClick={() => setBlockDatesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={blockDates.start_date}
                    onChange={(e) => setBlockDates({ ...blockDates, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={blockDates.end_date}
                    min={blockDates.start_date}
                    onChange={(e) => setBlockDates({ ...blockDates, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={blockDates.reason}
                    onChange={(e) => setBlockDates({ ...blockDates, reason: e.target.value })}
                    placeholder="Maintenance, personal use, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setBlockDatesModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBlockDates}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Block Dates
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

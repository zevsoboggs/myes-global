import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createRentalProperty, uploadRentalPropertyImage } from '../lib/rental-api';
import type { RentalPropertyType } from '../lib/rental-types';
import { Home, MapPin, DollarSign, Users, Upload, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRentalTranslations } from '../lib/rental-translations';
import { CountrySelector } from '../components/CountrySelector';
import { LocationPicker } from '../components/LocationPicker';
import { useCountries, type Country } from '../hooks/useCountries';

export function AddRentalPropertyPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const t = useRentalTranslations(language);
  const { selectedCountry } = useCountries();

  // Check if user can manage rentals (not admin, lovepay, or lawyer)
  const canManageRentals = profile?.role && !['admin', 'lovepay', 'lawyer'].includes(profile.role);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'apartment' as RentalPropertyType,
    address: '',
    city: '',
    country: '',
    country_code: '',
    latitude: 0,
    longitude: 0,
    price_per_night_usdt: 0,
    cleaning_fee_usdt: 0,
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: undefined as number | undefined,
    amenities: [] as string[],
    house_rules: '',
    check_in_time: '15:00',
    check_out_time: '11:00',
    minimum_nights: 1,
    maximum_nights: 365,
    instant_booking: false,
  });

  const amenitiesList = [
    'wifi',
    'parking',
    'kitchen',
    'pool',
    'gym',
    'tv',
    'ac',
    'heating',
    'washer',
    'dryer',
    'balcony',
    'workspace',
  ];

  const handleCountryChange = (country: Country) => {
    setFormData({
      ...formData,
      country: language === 'ru' ? country.nameRu : country.name,
      country_code: country.code,
    });
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    // Extract city from address
    const addressParts = location.address.split(',').map((s) => s.trim());
    let city = '';

    // Try to find city in address (usually second or third part)
    if (addressParts.length >= 2) {
      city = addressParts[addressParts.length - 2] || addressParts[0];
    }

    setFormData({
      ...formData,
      address: location.address,
      city: city,
      latitude: location.lat,
      longitude: location.lng,
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);

    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !canManageRentals) {
      alert(t('noPermission'));
      return;
    }

    if (images.length === 0) {
      alert(t('addAtLeastOneImage'));
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      alert(language === 'ru' ? 'Пожалуйста, выберите локацию на карте' : 'Please select a location on the map');
      return;
    }

    if (!formData.country) {
      alert(language === 'ru' ? 'Пожалуйста, выберите страну' : 'Please select a country');
      return;
    }

    setLoading(true);

    try {
      // Create property
      const propertyData: any = {
        ...formData,
        owner_id: user.id,
      };

      // Remove area_sqm if it's 0 or undefined
      if (!propertyData.area_sqm || propertyData.area_sqm === 0) {
        delete propertyData.area_sqm;
      }

      // Remove country_code from data sent to DB (not in schema)
      delete propertyData.country_code;

      const property = await createRentalProperty(propertyData);

      // Upload images
      for (let i = 0; i < images.length; i++) {
        await uploadRentalPropertyImage(property.id, images[i], i === 0);
      }

      alert(t('propertyCreated'));
      navigate('/rentals/my-properties');
    } catch (error: any) {
      console.error('Error creating rental property:', error);
      alert(error.message || t('failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  if (!canManageRentals) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('accessDenied')}</h2>
          <p className="text-gray-600 mb-6">{t('onlyBuyersRealtors')}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('goHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('addRentalProperty')}</h1>
          <p className="text-gray-600 mb-8">
            {language === 'ru'
              ? 'Разместите ваше жилье для краткосрочной аренды по всему миру'
              : 'List your property for short-term rental worldwide'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2" />
                {t('basicInformation')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('propertyTitle')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={
                      language === 'ru'
                        ? 'Уютная квартира в центре города'
                        : 'Beautiful 2BR Apartment in City Center'
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('description')} *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={
                      language === 'ru'
                        ? 'Опишите ваше жилье, его особенности и что делает его уникальным...'
                        : 'Describe your property, its features, and what makes it special...'
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('propertyType')} *
                  </label>
                  <select
                    required
                    value={formData.property_type}
                    onChange={(e) =>
                      setFormData({ ...formData, property_type: e.target.value as RentalPropertyType })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="apartment">{t('apartment')}</option>
                    <option value="house">{t('house')}</option>
                    <option value="room">{t('room')}</option>
                    <option value="villa">{t('villa')}</option>
                    <option value="studio">{t('studio')}</option>
                    <option value="cottage">{t('cottage')}</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Location with Country Selector */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                {t('location')}
              </h2>

              <div className="space-y-4">
                {/* Country Selector */}
                <CountrySelector
                  showLabel={true}
                  onCountryChange={handleCountryChange}
                />

                {/* Google Maps Location Picker */}
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={
                    formData.latitude && formData.longitude
                      ? { lat: formData.latitude, lng: formData.longitude }
                      : undefined
                  }
                />

                {/* City (auto-filled from address) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('city')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === 'ru' ? 'Название города' : 'City name'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ru'
                      ? 'Автоматически заполнится из адреса или введите вручную'
                      : 'Auto-filled from address or enter manually'}
                  </p>
                </div>

                {/* Coordinates Display */}
                {formData.latitude !== 0 && formData.longitude !== 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {language === 'ru' ? 'Координаты:' : 'Coordinates:'}{' '}
                      {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                    {formData.address && (
                      <p className="text-sm text-blue-600 mt-1">{formData.address}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Pricing */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                {t('pricing')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('pricePerNight')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price_per_night_usdt}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_night_usdt: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('cleaningFee')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cleaning_fee_usdt}
                    onChange={(e) =>
                      setFormData({ ...formData, cleaning_fee_usdt: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="20"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-2">{t('serviceFeeNote')}</p>
            </section>

            {/* Property Details */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {t('propertyDetails')}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('maxGuests')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('bedrooms')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('bathrooms')} *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('area')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.area_sqm || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        area_sqm: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('amenities')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {amenitiesList.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center space-x-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{t(amenity)}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Booking Settings */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('bookingSettings')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('checkInTime')}
                  </label>
                  <input
                    type="time"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('checkOutTime')}
                  </label>
                  <input
                    type="time"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('minimumNights')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minimum_nights}
                    onChange={(e) =>
                      setFormData({ ...formData, minimum_nights: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('maximumNights')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maximum_nights}
                    onChange={(e) =>
                      setFormData({ ...formData, maximum_nights: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.instant_booking}
                    onChange={(e) => setFormData({ ...formData, instant_booking: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t('instantBooking')}</span>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('houseRules')}
                </label>
                <textarea
                  rows={3}
                  value={formData.house_rules}
                  onChange={(e) => setFormData({ ...formData, house_rules: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    language === 'ru'
                      ? 'Не курить, Без животных, Тишина с 22:00 до 08:00 и тд'
                      : 'No smoking, No pets, Quiet hours 10pm-8am, etc.'
                  }
                />
              </div>
            </section>

            {/* Images */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                {t('photos')} *
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          {t('primaryPhoto')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">{t('clickToUpload')}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                <p className="text-sm text-gray-600">{t('uploadAtLeastOne')}</p>
              </div>
            </section>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('creating') : t('createProperty')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

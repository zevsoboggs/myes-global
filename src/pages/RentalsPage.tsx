import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllRentalProperties } from '../lib/rental-api';
import type { RentalProperty } from '../lib/rental-types';
import { MapPin, Users, Bed, Bath, Star, Search, DollarSign, Home, Calendar, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountries, type Country } from '../hooks/useCountries';

export function RentalsPage() {
  const { language } = useLanguage();
  const { countries, selectedCountry, setSelectedCountry } = useCountries();
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [filters, setFilters] = useState({
    country: '',
    city: '',
    property_type: '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    guests: '',
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await getAllRentalProperties();
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await getAllRentalProperties({
        country: filters.country,
        city: filters.city,
        property_type: filters.property_type,
        min_price: filters.min_price ? parseFloat(filters.min_price) : undefined,
        max_price: filters.max_price ? parseFloat(filters.max_price) : undefined,
        bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
        guests: filters.guests ? parseInt(filters.guests) : undefined,
      });
      setProperties(data);
    } catch (error) {
      console.error('Error searching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter((property) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      property.title.toLowerCase().includes(search) ||
      property.city.toLowerCase().includes(search) ||
      property.country.toLowerCase().includes(search) ||
      property.description.toLowerCase().includes(search)
    );
  });

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      title: { ru: 'Найдите идеальное жилье', en: 'Find Your Perfect Stay' },
      subtitle: { ru: 'Бронируйте уникальные дома и квартиры по всему миру с оплатой криптовалютой', en: 'Book unique homes and apartments worldwide with cryptocurrency' },
      country: { ru: 'Страна', en: 'Country' },
      city: { ru: 'Город', en: 'City' },
      guests: { ru: 'Гости', en: 'Guests' },
      search: { ru: 'Поиск', en: 'Search' },
      allTypes: { ru: 'Все типы', en: 'All Types' },
      apartment: { ru: 'Квартира', en: 'Apartment' },
      house: { ru: 'Дом', en: 'House' },
      room: { ru: 'Комната', en: 'Room' },
      villa: { ru: 'Вилла', en: 'Villa' },
      studio: { ru: 'Студия', en: 'Studio' },
      cottage: { ru: 'Коттедж', en: 'Cottage' },
      minPrice: { ru: 'Мин. цена (USDT)', en: 'Min Price (USDT)' },
      maxPrice: { ru: 'Макс. цена (USDT)', en: 'Max Price (USDT)' },
      anyBedrooms: { ru: 'Любое кол-во спален', en: 'Any Bedrooms' },
      applyFilters: { ru: 'Применить фильтры', en: 'Apply Filters' },
      listProperty: { ru: 'Разместить жилье', en: 'List Your Property' },
      searchPlaceholder: { ru: 'Поиск по названию, городу или описанию...', en: 'Search by title, city, or description...' },
      propertiesAvailable: { ru: 'доступно', en: 'available' },
      property: { ru: 'объект', en: 'property' },
      properties: { ru: 'объектов', en: 'properties' },
      noPropertiesFound: { ru: 'Жилье не найдено', en: 'No properties found' },
      tryAdjusting: { ru: 'Попробуйте изменить параметры поиска или фильтры', en: 'Try adjusting your search or filters' },
      beFirst: { ru: 'Разместите первым', en: 'Be the first to list a property' },
      bookNow: { ru: 'Забронировать', en: 'Book Now' },
      perNight: { ru: 'USDT / ночь', en: 'USDT / night' },
      listPropertyCard: { ru: 'Разместите жилье', en: 'List Your Property' },
      listPropertyDesc: { ru: 'Зарабатывайте, сдавая свое жилье', en: 'Earn money by renting out your space' },
      myBookings: { ru: 'Мои бронирования', en: 'My Bookings' },
      myBookingsDesc: { ru: 'Управляйте вашими бронированиями', en: 'Manage your reservations and trips' },
      myListings: { ru: 'Мои объявления', en: 'My Listings' },
      myListingsDesc: { ru: 'Просмотр и управление вашим жильем', en: 'View and manage your rental properties' },
    };
    return translations[key]?.[language] || key;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl mb-8 text-blue-100">{t('subtitle')}</p>

          {/* Quick Search */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Country Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span>
                      {filters.country
                        ? `${
                            countries.find((c) => c.name === filters.country || c.nameRu === filters.country)
                              ?.flag
                          } ${filters.country}`
                        : t('country')}
                    </span>
                  </div>
                </button>

                {showCountryDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFilters({ ...filters, country: '' });
                        setShowCountryDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                    >
                      {language === 'ru' ? 'Все страны' : 'All countries'}
                    </button>
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => {
                          setFilters({
                            ...filters,
                            country: language === 'ru' ? country.nameRu : country.name,
                          });
                          setShowCountryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span>{country.flag}</span>
                        <span>{language === 'ru' ? country.nameRu : country.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* City Input */}
              <input
                type="text"
                placeholder={t('city')}
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={filters.guests}
                onChange={(e) => setFilters({ ...filters, guests: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('guests')}</option>
                <option value="1">{language === 'ru' ? '1 гость' : '1 guest'}</option>
                <option value="2">{language === 'ru' ? '2 гостя' : '2 guests'}</option>
                <option value="4">{language === 'ru' ? '4 гостя' : '4 guests'}</option>
                <option value="6">{language === 'ru' ? '6+ гостей' : '6+ guests'}</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                {t('search')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex flex-wrap gap-4 flex-1">
            <select
              value={filters.property_type}
              onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allTypes')}</option>
              <option value="apartment">{t('apartment')}</option>
              <option value="house">{t('house')}</option>
              <option value="room">{t('room')}</option>
              <option value="villa">{t('villa')}</option>
              <option value="studio">{t('studio')}</option>
              <option value="cottage">{t('cottage')}</option>
            </select>

            <input
              type="number"
              placeholder={t('minPrice')}
              value={filters.min_price}
              onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="number"
              placeholder={t('maxPrice')}
              value={filters.max_price}
              onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={filters.bedrooms}
              onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('anyBedrooms')}</option>
              <option value="1">{language === 'ru' ? '1+ спальня' : '1+ Bedroom'}</option>
              <option value="2">{language === 'ru' ? '2+ спальни' : '2+ Bedrooms'}</option>
              <option value="3">{language === 'ru' ? '3+ спальни' : '3+ Bedrooms'}</option>
              <option value="4">{language === 'ru' ? '4+ спальни' : '4+ Bedrooms'}</option>
            </select>

            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('applyFilters')}
            </button>
          </div>

          <Link
            to="/rentals/add"
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center whitespace-nowrap"
          >
            <Home className="w-5 h-5 mr-2" />
            {t('listProperty')}
          </Link>
        </div>

        {/* Local Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-gray-600">
          {filteredProperties.length} {filteredProperties.length === 1 ? t('property') : t('properties')} {t('propertiesAvailable')}
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noPropertiesFound')}</h3>
            <p className="text-gray-600 mb-6">{t('tryAdjusting')}</p>
            <Link
              to="/rentals/add"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Home className="w-5 h-5 mr-2" />
              {t('beFirst')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => {
              const primaryImage = property.rental_property_images?.find((img) => img.is_primary);

              return (
                <Link
                  key={property.id}
                  to={`/rentals/${property.id}/book`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-200">
                    {primaryImage ? (
                      <img
                        src={primaryImage.image_url}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-gray-400" />
                      </div>
                    )}

                    {/* Property Type Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 rounded-full text-sm font-medium text-gray-900 capitalize">
                      {language === 'ru' ? t(property.property_type) : property.property_type}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {property.title}
                    </h3>

                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        {property.city}, {property.country}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-700 mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {property.max_guests}
                        </span>
                        <span className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          {property.bedrooms}
                        </span>
                        <span className="flex items-center">
                          <Bath className="w-4 h-4 mr-1" />
                          {property.bathrooms}
                        </span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {property.amenities.slice(0, 3).map((amenity) => (
                          <span
                            key={amenity}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize"
                          >
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{property.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline justify-between pt-4 border-t">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          ${property.price_per_night_usdt}
                        </span>
                        <span className="text-gray-600 ml-1">{t('perNight')}</span>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        {t('bookNow')}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/rentals/add"
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow"
          >
            <Home className="w-8 h-8 mb-3" />
            <h3 className="text-xl font-semibold mb-2">{t('listPropertyCard')}</h3>
            <p className="text-green-100">{t('listPropertyDesc')}</p>
          </Link>

          <Link
            to="/rentals/bookings"
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow"
          >
            <Calendar className="w-8 h-8 mb-3" />
            <h3 className="text-xl font-semibold mb-2">{t('myBookings')}</h3>
            <p className="text-blue-100">{t('myBookingsDesc')}</p>
          </Link>

          <Link
            to="/rentals/my-properties"
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow"
          >
            <DollarSign className="w-8 h-8 mb-3" />
            <h3 className="text-xl font-semibold mb-2">{t('myListings')}</h3>
            <p className="text-purple-100">{t('myListingsDesc')}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

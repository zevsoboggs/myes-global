import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  TrendingUp,
  Shield,
  Home as HomeIcon,
  Building,
  TreePine,
  Waves,
  Users,
  Zap,
  CheckCircle,
  Bed,
  Bath,
  Square,
  Bitcoin,
  DollarSign,
  Building2,
  Grid,
  Heart,
  ChevronRight,
  ArrowRight,
  Clock,
  Phone,
  Mail,
  Award,
  ChevronDown,
  Filter,
  Calculator,
  Key,
  Camera,
  Eye,
  MessageCircle,
  Calendar,
  UserCheck,
  Target,
  BarChart3,
  Wallet,
  HandshakeIcon,
  Percent,
  ExternalLink,
  ArrowUpRight,
  Coins,
  CreditCard,
  Lock,
  Smartphone,
  Gauge,
  HandCoins
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../lib/supabase';
import { PropertyCard } from '../components/PropertyCard';
import { Map } from '../components/Map';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrypto } from '../hooks/useCrypto';
import { useCountries } from '../hooks/useCountries';
import { CountrySelector } from '../components/CountrySelector';
import type { Profile } from '../lib/supabase';

export function HomePage() {
  const { t, language } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [bedroomCount, setBedroomCount] = useState('');
  const [realtors, setRealtors] = useState<Profile[]>([]);
  const { prices } = useCrypto();
  const { selectedCountry, setSelectedCountry, formatPrice, countries } = useCountries();
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchRealtors();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsVisible) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Filter properties by selected country when properties load or country changes
  useEffect(() => {
    if (properties.length > 0) {
      const countryFiltered = properties.filter(p => p.country_code === selectedCountry.code);
      setFilteredProperties(countryFiltered);
    }
  }, [properties, selectedCountry.code]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles:profiles!properties_realtor_id_fkey (
            full_name,
            agency_name,
            is_verified,
            avatar_url
          ),
          property_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, agency_name, is_verified, avatar_url, role')
        .eq('role', 'realtor')
        .eq('is_verified', true)
        .limit(6);
      if (error) throw error;
      setRealtors((data || []) as Profile[]);
    } catch (e) {
      console.error('Error loading realtors:', e);
    }
  };

  const handleSearchApply = () => {
    let filtered = [...properties];

    // Filter by selected country first
    filtered = filtered.filter((property) => property.country_code === selectedCountry.code);

    if (searchQuery) {
      filtered = filtered.filter((property) =>
        property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (property.location && property.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedType) {
      filtered = filtered.filter((property) => property.property_type === selectedType);
    }

    if (priceRange.min) {
      filtered = filtered.filter((property) => property.price_usdt >= Number(priceRange.min));
    }

    if (priceRange.max) {
      filtered = filtered.filter((property) => property.price_usdt <= Number(priceRange.max));
    }

    if (bedroomCount) {
      filtered = filtered.filter((property) => property.bedrooms >= Number(bedroomCount));
    }

    setFilteredProperties(filtered);

    // Scroll to properties section after search
    const propertiesSection = document.querySelector('#properties-section');
    if (propertiesSection) {
      propertiesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const propertyTypes = [
    { value: '', label: t('propertyType.all'), icon: HomeIcon, count: properties.length },
    { value: 'apartment', label: t('propertyType.apartment'), icon: Building, count: properties.filter(p => p.property_type === 'apartment').length },
    { value: 'house', label: t('propertyType.house'), icon: HomeIcon, count: properties.filter(p => p.property_type === 'house').length },
    { value: 'villa', label: t('propertyType.villa'), icon: Waves, count: properties.filter(p => p.property_type === 'villa').length },
    { value: 'commercial', label: t('propertyType.commercial'), icon: Building2, count: properties.filter(p => p.property_type === 'commercial').length },
    { value: 'land', label: t('propertyType.land'), icon: TreePine, count: properties.filter(p => p.property_type === 'land').length },
  ];

  const stats = [
    { label: t('home.stats.activeProperties'), value: '1,200+', icon: HomeIcon },
    { label: t('home.stats.verifiedRealtors'), value: '150+', icon: UserCheck },
    { label: t('home.stats.successfulDeals'), value: '850+', icon: HandshakeIcon },
    { label: t('home.stats.totalVolume'), value: '$45M+', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-blue-50 to-gray-100">
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Main heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {t('home.hero.title')}
              <span className="block text-blue-600 mt-2">
                {t('home.hero.titleAccent')}
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('home.hero.description')}
            </p>

            {/* Search section */}
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Region selector */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const country = countries.find(c => c.code === e.target.value);
                      if (country) {
                        setSelectedCountry(country);
                        // Filter properties by country immediately
                        const countryFiltered = properties.filter(p => p.country_code === country.code);
                        setFilteredProperties(countryFiltered);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {language === 'ru' ? country.nameRu : country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={t('home.hero.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Property type */}
                <div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('home.hero.typeFilter')}</option>
                    <option value="apartment">{t('propertyType.apartmentSingular')}</option>
                    <option value="house">{t('propertyType.houseSingular')}</option>
                    <option value="villa">{t('propertyType.villaSingular')}</option>
                    <option value="commercial">{t('propertyType.commercialSingular')}</option>
                  </select>
                </div>

                {/* Search button */}
                <button
                  onClick={handleSearchApply}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Target className="w-5 h-5" />
                  {t('home.hero.find')}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">1,200+</div>
                <div className="text-gray-600">{t('home.stats.activeProperties')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">150+</div>
                <div className="text-gray-600">{t('home.stats.verifiedRealtors')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">850+</div>
                <div className="text-gray-600">{t('home.stats.successfulDeals')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">$45M+</div>
                <div className="text-gray-600">{t('home.stats.totalVolume')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rental Properties Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
              <Calendar className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'НОВИНКА: Краткосрочная аренда' : 'NEW: Short-Term Rentals'}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {language === 'ru'
                ? 'Найдите идеальное жилье по всему миру'
                : 'Find Your Perfect Stay Worldwide'
              }
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {language === 'ru'
                ? 'Бронируйте уникальные дома и квартиры для краткосрочной аренды в любой стране. Оплачивайте криптовалютой.'
                : 'Book unique homes and apartments for short-term rental in any country. Pay with cryptocurrency and enjoy seamless booking.'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <HomeIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {language === 'ru' ? 'Разместите жилье' : 'List Your Property'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'ru'
                  ? 'Владеете недвижимостью? Зарабатывайте пассивный доход, сдавая её в краткосрочную аренду. Доступ к гостям со всего мира.'
                  : 'Own a property? Earn passive income by listing it for short-term rental. Reach global travelers instantly.'
                }
              </p>
              <Link
                to="/rentals/add"
                className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
              >
                {language === 'ru' ? 'Начать зарабатывать' : 'Start Earning'} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Search className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {language === 'ru' ? 'Мгновенное бронирование' : 'Instant Booking'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'ru'
                  ? 'Проверяйте доступность в реальном времени, видите точную цену с комиссией 7%, бронируйте моментально с оплатой криптой.'
                  : 'Check real-time availability, see exact prices with our 7% service fee, and book instantly with crypto.'
                }
              </p>
              <Link
                to="/rentals"
                className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700"
              >
                {language === 'ru' ? 'Смотреть жилье' : 'Browse Rentals'} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {language === 'ru' ? 'Безопасные платежи' : 'Secure Payments'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'ru'
                  ? 'Все бронирования защищены эскроу. Прозрачное ценообразование, никаких скрытых комиссий. Владельцы получают 93% после комиссии 7%.'
                  : 'All bookings protected with escrow. Transparent pricing, no hidden fees. Owners get 93% after our 7% commission.'
                }
              </p>
              <Link
                to="/rentals/bookings"
                className="inline-flex items-center text-green-600 font-semibold hover:text-green-700"
              >
                {language === 'ru' ? 'Мои бронирования' : 'My Bookings'} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/rentals"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center"
            >
              <Search className="w-5 h-5 mr-2" />
              {language === 'ru' ? 'Найти жилье' : 'Explore Rentals'}
            </Link>
            <Link
              to="/rentals/add"
              className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold border-2 border-gray-200 hover:border-purple-600 hover:text-purple-600 transition-colors flex items-center"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              {language === 'ru' ? 'Разместить жилье' : 'List Your Property'}
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {language === 'ru' ? 'По всему миру' : 'Worldwide'}
              </div>
              <div className="text-gray-600">
                {language === 'ru' ? 'Любая страна' : 'Any Country'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">7%</div>
              <div className="text-gray-600">
                {language === 'ru' ? 'Сервисный сбор' : 'Service Fee'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {language === 'ru' ? 'Мгновенно' : 'Instant'}
              </div>
              <div className="text-gray-600">
                {language === 'ru' ? 'Бронирование' : 'Booking'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {language === 'ru' ? 'Крипто' : 'Crypto'}
              </div>
              <div className="text-gray-600">
                {language === 'ru' ? 'Платежи' : 'Payments'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <HandCoins className="w-5 h-5 text-white mr-2" />
                <span className="text-white text-sm font-medium">
                  {language === 'ru' ? 'Зарабатывай с нами' : 'Earn with us'}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                {language === 'ru'
                  ? 'Реферальная программа для покупателей'
                  : 'Referral Program for Buyers'
                }
              </h2>

              <p className="text-white/90 text-lg mb-8 leading-relaxed">
                {language === 'ru'
                  ? 'Приводите друзей и получайте денежное вознаграждение за каждую успешную покупку недвижимости. Чем больше рефералов, тем выше доходы!'
                  : 'Bring friends and get cash rewards for every successful property purchase. The more referrals, the higher your earnings!'
                }
              </p>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Percent className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white">
                    {language === 'ru' ? '0.35% с каждой сделки' : '0.35% per deal'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white">
                    {language === 'ru' ? 'Неограниченное количество рефералов' : 'Unlimited referrals'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white">
                    {language === 'ru' ? 'Мгновенные выплаты' : 'Instant payouts'}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <Link
                to="/referral"
                className="inline-flex items-center bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg group"
              >
                {language === 'ru' ? 'Присоединиться к программе' : 'Join the Program'}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Visual Elements */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-6">
                  {/* Earning Example */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">$875</div>
                    <div className="text-white/80 text-sm">
                      {language === 'ru' ? 'Ваш доход' : 'Your earnings'}
                    </div>
                  </div>

                  {/* Referrals Count */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">12</div>
                    <div className="text-white/80 text-sm">
                      {language === 'ru' ? 'Рефералов' : 'Referrals'}
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">89%</div>
                    <div className="text-white/80 text-sm">
                      {language === 'ru' ? 'Успешность' : 'Success rate'}
                    </div>
                  </div>

                  {/* Average Commission */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">0.35%</div>
                    <div className="text-white/80 text-sm">
                      {language === 'ru' ? 'Ставка по программе' : 'Program rate'}
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-8 pt-6 border-t border-white/20 text-center">
                  <p className="text-white/80 text-sm mb-4">
                    {language === 'ru'
                      ? 'Начните зарабатывать уже сегодня'
                      : 'Start earning today'
                    }
                  </p>
                  <Link
                    to="/auth?mode=register"
                    className="inline-flex items-center text-white font-semibold hover:text-white/80 transition-colors"
                  >
                    {language === 'ru' ? 'Регистрация' : 'Sign Up'}
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="properties-section" className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t('home.properties.title')}
              </h2>
              <p className="text-gray-600">
                {t('home.properties.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>

              <Link
                to="/properties"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                {t('home.properties.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-20">
              {/* Beautiful loading animation */}
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* Main loading animation */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute top-2 left-2 w-12 h-12 border-4 border-purple-300 border-b-transparent rounded-full animate-spin animate-reverse"></div>
                  <div className="absolute top-4 left-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"></div>
                </div>

                {/* Loading text with animation */}
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-700 mb-2 animate-pulse">
                    {language === 'ru' ? 'Загружаем недвижимость...' : 'Loading properties...'}
                  </div>
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>

                {/* Property cards skeleton */}
                <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                        <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                        <div className="p-6 space-y-4">
                          <div className="h-6 bg-gray-200 rounded-lg animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                          <div className="flex justify-between items-center">
                            <div className="h-8 bg-gray-200 rounded-lg w-1/3 animate-pulse"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProperties.slice(0, 6).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="h-96 rounded-2xl overflow-hidden">
              <Map
                properties={filteredProperties}
                selectedProperty={selectedProperty}
                onPropertySelect={setSelectedProperty}
              />
            </div>
          )}
        </div>
      </section>

      {/* Crypto Rates Section */}
      <section className="py-16 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('home.crypto.title')}
            </h2>
            <p className="text-gray-300">
              {t('home.crypto.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Bitcoin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">BTC</h3>
                  <p className="text-gray-400 text-sm">Bitcoin</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                ${prices?.bitcoin?.usd?.toLocaleString() || '95,432'}
              </div>
              <div className={`text-sm flex items-center gap-1 mt-1 ${
                prices?.bitcoin?.usd_24h_change && prices.bitcoin.usd_24h_change > 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {prices?.bitcoin?.usd_24h_change && prices.bitcoin.usd_24h_change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3 rotate-180" />
                )}
                {prices?.bitcoin?.usd_24h_change
                  ? `${prices.bitcoin.usd_24h_change > 0 ? '+' : ''}${prices.bitcoin.usd_24h_change.toFixed(1)}%`
                  : '+2.4%'
                }
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">ETH</h3>
                  <p className="text-gray-400 text-sm">Ethereum</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                ${prices?.ethereum?.usd?.toLocaleString() || '3,542'}
              </div>
              <div className={`text-sm flex items-center gap-1 mt-1 ${
                prices?.ethereum?.usd_24h_change && prices.ethereum.usd_24h_change > 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {prices?.ethereum?.usd_24h_change && prices.ethereum.usd_24h_change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3 rotate-180" />
                )}
                {prices?.ethereum?.usd_24h_change
                  ? `${prices.ethereum.usd_24h_change > 0 ? '+' : ''}${prices.ethereum.usd_24h_change.toFixed(1)}%`
                  : '+1.8%'
                }
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">USDT</h3>
                  <p className="text-gray-400 text-sm">Tether</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                $1.00
              </div>
              <div className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                0.0%
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">USDC</h3>
                  <p className="text-gray-400 text-sm">USD Coin</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                $1.00
              </div>
              <div className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                0.0%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Love&Pay Processing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Heart className="w-4 h-4" />
                {t('home.lovepay.badge')}
              </div>

              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                {t('home.lovepay.title')}
              </h2>

              <p className="text-xl text-gray-600 mb-8">
                {t('home.lovepay.description')}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">{t('home.lovepay.instant')}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{t('home.lovepay.security')}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-700">{t('home.lovepay.privacy')}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Love&Pay</h3>
                <p className="text-gray-600">{t('home.lovepay.processing')}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bitcoin className="w-6 h-6 text-orange-500" />
                    <span className="font-medium">Bitcoin</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-6 h-6 text-blue-500" />
                    <span className="font-medium">Ethereum</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-green-500" />
                    <span className="font-medium">USDT/USDC</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Certificate Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                {t('home.certificate.badge')}
              </div>

              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                {t('home.certificate.title')}
              </h2>

              <p className="text-xl text-gray-600 mb-8">
                {t('home.certificate.description')}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">{t('home.certificate.register')}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{t('home.certificate.kyc')}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-700">{t('home.certificate.receive')}</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/auth?mode=register&role=realtor"
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Award className="w-5 h-5" />
                  {t('home.certificate.become')}
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('home.certificate.title2')}</h3>
                <p className="text-gray-600">{t('home.certificate.status')}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-500" />
                    <span className="font-medium">{t('home.certificate.rsa')}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-6 h-6 text-green-500" />
                    <span className="font-medium">{t('home.certificate.verification')}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-purple-500" />
                    <span className="font-medium">{t('home.certificate.official')}</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-700 text-center">
                  {t('home.certificate.confirmation')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.whyUs.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.whyUs.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                {t('home.whyUs.security.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('home.whyUs.security.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                {t('home.whyUs.pricing.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('home.whyUs.pricing.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                {t('home.whyUs.experts.title')}
              </h3>
              <p className="text-gray-600 text-center">
                {t('home.whyUs.experts.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.process.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.process.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                  1
                </div>
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('home.process.step1.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.process.step1.desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                  2
                </div>
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('home.process.step2.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.process.step2.desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                  3
                </div>
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('home.process.step3.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.process.step3.desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('home.process.step4.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.process.step4.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.features.verification.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.verification.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.features.escrow.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.escrow.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.features.legal.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.legal.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.features.support.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.support.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.features.analytics.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.analytics.desc')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.features.mobile.title')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.mobile.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('home.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "{t('home.testimonial1.text')}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  АП
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">{t('home.testimonial1.author')}</h4>
                  <p className="text-gray-600 text-sm">{t('home.testimonial1.role')}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "{t('home.testimonial2.text')}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  МИ
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">{t('home.testimonial2.author')}</h4>
                  <p className="text-gray-600 text-sm">{t('home.testimonial2.role')}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "{t('home.testimonial3.text')}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  ДС
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">{t('home.testimonial3.author')}</h4>
                  <p className="text-gray-600 text-sm">{t('home.testimonial3.role')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.faq.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('home.faq.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.faq.q1')}
              </h3>
              <p className="text-gray-600">
                {t('home.faq.a1')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.faq.q2')}
              </h3>
              <p className="text-gray-600">
                {t('home.faq.a2')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.faq.q3')}
              </h3>
              <p className="text-gray-600">
                {t('home.faq.a3')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.faq.q4')}
              </h3>
              <p className="text-gray-600">
                {t('home.faq.a4')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('home.final.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('home.final.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/properties"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              {t('home.final.viewProperties')}
            </Link>
            <Link
              to="/auth?mode=register"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              {t('home.final.startSelling')}
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) rotate(1deg);
          }
          66% {
            transform: translateY(-10px) rotate(-1deg);
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .delay-300 {
          animation-delay: 0.3s;
        }

        .delay-500 {
          animation-delay: 0.5s;
        }

        .delay-700 {
          animation-delay: 0.7s;
        }

        .delay-1000 {
          animation-delay: 1s;
        }

        .delay-1500 {
          animation-delay: 1.5s;
        }

        .counter {
          animation: countUp 2s ease-out;
        }

        @keyframes countUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-reverse {
          animation-direction: reverse;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
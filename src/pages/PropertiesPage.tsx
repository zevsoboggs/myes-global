import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Property } from '../lib/supabase';
import { PropertyCard } from '../components/PropertyCard';
import { FilterPanel, PropertyFilters } from '../components/FilterPanel';
import { Map } from '../components/Map';
import { 
  Grid, 
  MapIcon, 
  SlidersHorizontal, 
  Search, 
  Filter, 
  Sparkles,
  Bitcoin,
  Building,
  Coins,
  DollarSign,
  ArrowRight,
  Star,
  Eye,
  Heart,
  Save,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useCountries } from '../hooks/useCountries';
import { CountrySelector } from '../components/CountrySelector';

export function PropertiesPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { selectedCountry, setSelectedCountry } = useCountries();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastFilters, setLastFilters] = useState<PropertyFilters>({
    search: '', propertyType: '', minPrice: 0, maxPrice: 0, bedrooms: 0, bathrooms: 0, minArea: 0, maxArea: 0, features: []
  });
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState(t('properties.searchNamePlaceholder'));

  // Простая функция загрузки объектов по стране
  const loadProperties = async (countryCode: string) => {
    setLoading(true);

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
        .eq('country_code', countryCode)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const newProperties = data || [];
      setProperties(newProperties);

      // Применяем поиск если есть
      if (searchQuery) {
        const filtered = newProperties.filter((property) =>
          property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          property.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredProperties(filtered);
      } else {
        setFilteredProperties(newProperties);
      }

    } catch (error) {
      console.error('Error loading properties:', error);
      setProperties([]);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем только при первом заходе
  useEffect(() => {
    loadProperties(selectedCountry.code);
  }, []);


  // Фильтруем при изменении поиска
  useEffect(() => {
    if (searchQuery) {
      const filtered = properties.filter((property) =>
        property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProperties(filtered);
    } else {
      // Не перезаписываем filteredProperties если нет поискового запроса
      // Это позволяет loadProperties самостоятельно управлять отображением
      if (properties.length > 0) {
        setFilteredProperties(properties);
      }
    }
  }, [searchQuery]);

  const handleFilterChange = (filters: PropertyFilters) => {
    setLastFilters(filters);
    // Дополнительные фильтры можно добавить здесь
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleShowResults = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Если в базе нет объектов для выбранной страны, создадим тестовые
    if (selectedCountry.code !== 'ZA') {
      await createTestPropertiesForCountry(selectedCountry.code);
    }

    loadProperties(selectedCountry.code);
  };

  // Временная функция для создания тестовых объектов для разных стран
  const createTestPropertiesForCountry = async (countryCode: string) => {
    try {
      // Проверим есть ли уже объекты для этой страны
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('country_code', countryCode)
        .limit(1);

      if (existing && existing.length > 0) {
        return;
      }

      // Получим один объект из ЮАР как шаблон
      const { data: template } = await supabase
        .from('properties')
        .select('*')
        .eq('country_code', 'ZA')
        .limit(1);

      if (!template || template.length === 0) return;

      const baseProperty = template[0];

      // Создадим 3-5 тестовых объектов для выбранной страны
      const testProperties = [];
      for (let i = 1; i <= 4; i++) {
        testProperties.push({
          title: `${baseProperty.title} ${countryCode} ${i}`,
          description: baseProperty.description,
          price_usdt: baseProperty.price_usdt + (i * 50000),
          property_type: baseProperty.property_type,
          bedrooms: baseProperty.bedrooms,
          bathrooms: baseProperty.bathrooms,
          area_sqm: baseProperty.area_sqm,
          address: `Test Address ${i}, ${selectedCountry.name}`,
          country_code: countryCode,
          realtor_id: baseProperty.realtor_id,
          latitude: baseProperty.latitude + (i * 0.01),
          longitude: baseProperty.longitude + (i * 0.01),
          is_active: true,
          features: baseProperty.features
        });
      }

      const { error } = await supabase
        .from('properties')
        .insert(testProperties);

      if (error) {
        console.error('Error creating test properties:', error);
      }
    } catch (error) {
      console.error('Error in createTestPropertiesForCountry:', error);
    }
  };

  const saveSearch = async () => {
    if (!user) { alert('Войдите, чтобы сохранить поиск'); return; }
    setSaving(true);
    try {
      await supabase.from('saved_searches').insert({ user_id: user.id, name: searchName || 'Поиск', filters: lastFilters });
      alert('Поиск сохранен');
    } catch (e: any) {
      alert(e?.message || 'Не удалось сохранить поиск');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6" />
          <p className="text-gray-600 text-lg">{t('properties.loading') || 'Загрузка недвижимости...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              {/* Badge */}
              <div className="inline-flex items-center bg-blue-50 rounded-full px-4 py-2 mb-6">
                <Building className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 text-sm font-medium">
                  {language === 'ru' ? 'Глобальная недвижимость' : 'Global Real Estate'}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {language === 'ru'
                  ? 'Найдите идеальную недвижимость'
                  : 'Find Your Perfect Property'
                }
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-gray-600 mb-8">
                {language === 'ru'
                  ? `Откройте для себя ${filteredProperties.length} объектов недвижимости по всему миру. От квартир до вилл — найдите дом своей мечты.`
                  : `Discover ${filteredProperties.length} properties worldwide. From apartments to villas — find your dream home.`
                }
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{properties.length}</div>
                  <div className="text-sm text-gray-600">
                    {language === 'ru' ? 'Объектов' : 'Properties'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">6</div>
                  <div className="text-sm text-gray-600">
                    {language === 'ru' ? 'Стран' : 'Countries'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">
                    {language === 'ru' ? 'Поддержка' : 'Support'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-600">★ 4.9</div>
                  <div className="text-sm text-gray-600">
                    {language === 'ru' ? 'Рейтинг' : 'Rating'}
                  </div>
                </div>
              </div>
            </div>

            {/* Поисковая карточка */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  {language === 'ru' ? 'Поиск недвижимости' : 'Property Search'}
                </h3>

                {/* Search Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ru' ? 'Поиск по названию' : 'Search by title'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={language === 'ru' ? 'Введите название или адрес...' : 'Enter title or address...'}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Country Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ru' ? 'Регион' : 'Region'}
                  </label>
                  <CountrySelector
                    showLabel={false}
                    className=""
                    onCountryChange={(country) => {
                      setSelectedCountry(country);
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleShowResults}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow font-semibold disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {language === 'ru' ? 'Загрузка...' : 'Loading...'}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        {language === 'ru' ? 'Показать объекты' : 'Show Properties'}
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowFilters(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {language === 'ru' ? 'Фильтры' : 'Filters'}
                      </span>
                    </button>
                    <Link
                      to="/compare"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {language === 'ru' ? 'Сравнить' : 'Compare'}
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Боковые фильтры */}
            <aside className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="sticky top-20">
                <FilterPanel onFilterChange={handleFilterChange} className="shadow-sm" />
              </div>
            </aside>

            {/* Результаты */}
            <div className="flex-1">
              {/* Шапка результатов */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {language === 'ru'
                        ? `Найдено объектов: ${filteredProperties.length}`
                        : `Found properties: ${filteredProperties.length}`
                      }
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {language === 'ru'
                        ? 'Все доступные предложения'
                        : 'All available offers'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 sm:p-3 rounded-lg transition-all ${
                        viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={language === 'ru' ? 'Сетка' : 'Grid'}
                    >
                      <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`p-2 sm:p-3 rounded-lg transition-all ${
                        viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={language === 'ru' ? 'Карта' : 'Map'}
                    >
                      <MapIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">
                        {language === 'ru' ? 'Фильтры' : 'Filters'}
                      </span>
                    </button>
                    <div className="hidden lg:flex items-center gap-2 ml-2">
                      <input
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder={language === 'ru' ? 'Название поиска' : 'Search name'}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={saveSearch}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {language === 'ru' ? 'Сохранить' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Сетка / Карта */}
              {filteredProperties.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Building className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {language === 'ru' ? 'Объекты не найдены' : 'No properties found'}
                  </h3>
                  <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base max-w-md mx-auto">
                    {language === 'ru'
                      ? 'Попробуйте изменить критерии поиска или выбрать другой регион'
                      : 'Try changing your search criteria or select a different region'
                    }
                  </p>
                  <Link
                    to="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all inline-flex items-center gap-2"
                  >
                    {language === 'ru' ? 'На главную' : 'Back to Home'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                  <Map
                    properties={filteredProperties}
                    selectedProperty={selectedProperty}
                    onPropertySelect={setSelectedProperty}
                    height="650px"
                  />
                </div>
              )}

              {/* CTA снизу */}
              <div className="mt-8 sm:mt-12">
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {language === 'ru' ? 'Нужна помощь с выбором?' : 'Need help choosing?'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {language === 'ru'
                          ? 'Наши эксперты помогут подобрать идеальную недвижимость'
                          : 'Our experts will help you find the perfect property'
                        }
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/auth?mode=register"
                    className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    {language === 'ru' ? 'Получить помощь' : 'Get Help'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
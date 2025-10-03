import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Eye, 
  Star, 
  Trash2,
  Filter,
  Search,
  Grid,
  List,
  ArrowLeft,
  Home,
  Building,
  DollarSign,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Property } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrypto } from '../hooks/useCrypto';

export function FavoritesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { prices } = useCrypto();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price' | 'date' | 'views'>('date');

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      // Получаем избранные объекты пользователя
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('property_id')
        .eq('user_id', user.id);

      if (favoritesError) throw favoritesError;

      if (favoritesData && favoritesData.length > 0) {
        const propertyIds = favoritesData.map(fav => fav.property_id);
        
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select(`
            *,
            property_images (
              id,
              image_url,
              is_primary
            ),
            profiles:profiles!properties_realtor_id_fkey (
              full_name,
              avatar_url,
              is_verified
            )
          `)
          .in('id', propertyIds)
          .eq('is_active', true);

        if (propertiesError) throw propertiesError;
        setFavorites(propertiesData || []);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (propertyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;

      setFavorites(prev => prev.filter(prop => prop.id !== propertyId));
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
      alert('Ошибка при удалении из избранного');
    }
  };

  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return '—';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatZar = (amount: number) => {
    if (!amount || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount);
  };

  const getPropertyTypeLabel = (type: string) => {
    const types = {
      apartment: 'Квартира',
      house: 'Дом',
      villa: 'Вилла',
      commercial: 'Коммерческая',
      land: 'Земля'
    };
    return types[type as keyof typeof types] || type;
  };

  // Фильтрация и сортировка
  const filteredFavorites = favorites
    .filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || property.property_type === selectedType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price_usdt - a.price_usdt;
        case 'views':
          return (b.views_count || 0) - (a.views_count || 0);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const stats = {
    totalFavorites: favorites.length,
    totalValue: favorites.reduce((sum, prop) => sum + prop.price_usdt, 0),
    avgPrice: favorites.length ? favorites.reduce((sum, prop) => sum + prop.price_usdt, 0) / favorites.length : 0,
    totalViews: favorites.reduce((sum, prop) => sum + (prop.views_count || 0), 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">{t('favorites.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center gap-3">
                  <Heart className="w-8 h-8 text-red-500" />
                  {t('favorites.title')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {favorites.length} {t('favorites.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('favorites.totalFavorites')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalFavorites}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('favorites.totalValue')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatPrice(stats.totalValue)} USDT</p>
                <p className="text-xs text-blue-600 mt-2 truncate">
                  {formatZar(stats.totalValue * 1.07 * (prices ? (prices.bitcoin.zar / prices.bitcoin.usd) : 0))} ZAR
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('favorites.avgPrice')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatPrice(stats.avgPrice)} USDT</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('favorites.views')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalViews}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Фильтры и поиск */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Поиск */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('favorites.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>

            {/* Фильтр по типу */}
            <div className="sm:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value="all">{t('favorites.allTypes')}</option>
                <option value="apartment">{t('favorites.apartments')}</option>
                <option value="house">{t('favorites.houses')}</option>
                <option value="villa">{t('favorites.villas')}</option>
                <option value="commercial">{t('favorites.commercial')}</option>
                <option value="land">{t('favorites.land')}</option>
              </select>
            </div>

            {/* Сортировка */}
            <div className="sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value="date">{t('favorites.sortByDate')}</option>
                <option value="price">{t('favorites.sortByPrice')}</option>
                <option value="views">{t('favorites.sortByViews')}</option>
              </select>
            </div>

            {/* Переключение вида */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'grid' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Список избранного */}
        {filteredFavorites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
                         <h3 className="text-xl font-bold text-gray-900 mb-2">
               {searchTerm || selectedType !== 'all' ? t('favorites.notFound') : t('favorites.empty')}
             </h3>
             <p className="text-gray-600 mb-6">
               {searchTerm || selectedType !== 'all' 
                 ? t('favorites.notFoundMessage')
                 : t('favorites.emptyMessage')
               }
             </p>
            <Link
              to="/properties"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg"
            >
              <Home className="w-5 h-5 mr-2" />
                             {t('favorites.goToProperties')}
            </Link>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredFavorites.map((property) => (
              <div key={property.id} className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 ${
                viewMode === 'list' ? 'flex' : ''
              }`}>
                {/* Изображение */}
                <div className={`relative ${viewMode === 'list' ? 'w-48 h-32' : 'h-48'} bg-gray-200`}>
                  {property.property_images?.[0] ? (
                    <img
                      src={property.property_images[0].image_url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                                         <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                       {t('favorites.inFavorites')}
                     </span>
                  </div>
                </div>

                {/* Контент */}
                <div className={`p-4 sm:p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{property.title}</h3>
                      <div className="flex items-center text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{property.address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          {property.bedrooms}
                        </span>
                        <span className="flex items-center">
                          <Bath className="w-4 h-4 mr-1" />
                          {property.bathrooms}
                        </span>
                        <span className="flex items-center">
                          <Square className="w-4 h-4 mr-1" />
                          {property.area_sqm} м²
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Цена и статистика */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-600">{formatPrice(property.price_usdt * 1.07)}</p>
                      <p className="text-xs text-gray-600">USDT с комиссией</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{property.views_count}</p>
                      <p className="text-xs text-gray-600">Просмотров</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 truncate">{getPropertyTypeLabel(property.property_type)}</p>
                      <p className="text-xs text-gray-600">Тип</p>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/properties/${property.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-all duration-300 hover:scale-110"
                        title="Просмотр"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => removeFromFavorites(property.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-all duration-300 hover:scale-110"
                        title="Удалить из избранного"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                                         <div className="flex items-center gap-1">
                       <Star className="w-4 h-4 text-yellow-500 fill-current" />
                       <span className="text-sm text-gray-600">{t('favorites.inFavorites')}</span>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

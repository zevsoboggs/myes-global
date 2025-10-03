import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Eye,
  Shield,
  Star,
  Coins,
  DollarSign,
  Bitcoin,
  Plus,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Property } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrypto } from '../hooks/useCrypto';
import { useCountries } from '../hooks/useCountries';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

type PropertyCardProps = {
  property: Property;
  onToggleFavorite?: (propertyId: string) => void;
  isFavorite?: boolean;
};

export function PropertyCard({ property, onToggleFavorite, isFavorite = false }: PropertyCardProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const { prices } = useCrypto();
  const { formatPrice } = useCountries();
  const { user, profile } = useAuth();
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  
  // Helper function to translate feature names
  const translateFeature = (feature: string): string => {
    // If it's already a translation key, use it directly
    if (feature.startsWith('feature.')) {
      return t(feature);
    }

    // Otherwise, map from old names to translation keys
    const featureMap: Record<string, string> = {
      'Парковка': 'feature.parking',
      'Охрана': 'feature.security',
      'Терраса': 'feature.terrace',
      'Вид на море': 'feature.seaView',
      'Мебель': 'feature.furniture',
      'Техника': 'feature.appliances',
      'Лифт': 'feature.lift',
      'Кондиционер': 'feature.aircon',
      'Спортзал': 'feature.gym',
      'Бассейн': 'feature.pool',
      'Сад': 'feature.garden',
      'Балкон': 'feature.balcony',
      'Камин': 'feature.fireplace',
      'Интернет': 'feature.internet',
      'Прачечная': 'feature.laundry',
      // English versions (in case they're already in English)
      'Parking': 'feature.parking',
      'Security': 'feature.security',
      'Terrace': 'feature.terrace',
      'Sea view': 'feature.seaView',
      'Furniture': 'feature.furniture',
      'Appliances': 'feature.appliances',
      'Elevator': 'feature.lift',
      'Lift': 'feature.lift',
      'Air conditioning': 'feature.aircon',
      'Gym': 'feature.gym',
      'Pool': 'feature.pool',
      'Garden': 'feature.garden',
      'Balcony': 'feature.balcony',
      'Fireplace': 'feature.fireplace',
      'Internet': 'feature.internet',
      'Laundry': 'feature.laundry'
    };
    const key = featureMap[feature];
    return key ? t(key) : feature;
  };

  const primaryImage = property.property_images?.find((img) => img.is_primary) || property.property_images?.[0];

  // Рассчитываем цену с комиссией (7%)
  const finalPriceUsdt = property.price_usdt * 1.07;

  const formatUsdt = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  const formatNumber = (num: number) => num.toString();

  const getPropertyTypeLabel = (type: string) => {
    const types = {
      apartment: t('propertyType.apartment'),
      house: t('propertyType.house'),
      villa: t('propertyType.villa'),
      commercial: t('propertyType.commercial'),
      land: t('propertyType.land'),
    } as const;
    return types[type as keyof typeof types] || type;
  };

  const addToCompare = async () => {
    if (!user) return;
    try { await supabase.from('user_compare').insert({ user_id: user.id, property_id: property.id }); alert(t('card.compare')); } catch {}
  };
  const saveNote = async () => {
    if (!user || !noteText.trim()) return;
    try { await supabase.from('user_notes').insert({ user_id: user.id, property_id: property.id, content: noteText.trim() }); setNoteOpen(false); setNoteText(''); alert(t('card.saveNote')); } catch {}
  };
  const openRoute = () => {
    const q = encodeURIComponent(property.address || '');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank');
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      {/* Изображение */}
      <div className="relative aspect-[16/10] bg-gray-200">
        <Link to={`/properties/${property.id}`} className="block h-full w-full overflow-hidden">
          {primaryImage && !imageError ? (
            <img
              src={primaryImage.image_url}
              alt={property.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <Square className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* overlay gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80" />
        </Link>

        {/* Тип объекта */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/90 backdrop-blur-sm text-gray-900 border border-gray-200">
            {getPropertyTypeLabel(property.property_type)}
          </span>
          {property.profiles?.is_verified && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-500 text-white flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> {t('card.verified')}
            </span>
          )}
        </div>

        {/* Избранное */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorite ? t('favorites.removeFromFavorites') || 'Удалить из избранного' : t('favorites.inFavorites') || 'В избранное'}
            className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-sm transition-colors border ${
              isFavorite ? 'bg-red-500 text-white border-red-500' : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white border-gray-200'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Просмотры */}
        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center">
          <Eye className="w-3.5 h-3.5 mr-1" /> {property.views_count}
        </div>

        {/* Цена (оверлей) */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2">
            <div className="text-sm font-extrabold text-blue-700">
              {formatPrice(finalPriceUsdt)}
            </div>
            <div className="text-[11px] text-gray-600">
              {formatPrice(finalPriceUsdt)}
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="p-5">
        <Link to={`/properties/${property.id}`}>
          <h3 className="font-semibold text-lg text-gray-900 mb-1.5 line-clamp-1 group-hover:text-blue-700 transition-colors">
            {property.title}
          </h3>
        </Link>

        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1.5" />
          <span className="text-sm line-clamp-1">{property.address}</span>
        </div>

        {/* Характеристики */}
        <div className="flex items-center gap-4 mb-4 text-gray-600">
          {property.bedrooms > 0 && (
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              <span className="text-sm">{formatNumber(property.bedrooms)}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              <span className="text-sm">{formatNumber(property.bathrooms)}</span>
            </div>
          )}
          <div className="flex items-center">
            <Square className="w-4 h-4 mr-1" />
            <span className="text-sm">{formatNumber(property.area_sqm)} {t('propertyDetail.sqm')}</span>
          </div>
        </div>

        {/* Особенности */}
        {property.features.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {property.features.slice(0, 3).map((feature, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[11px]">
                  {translateFeature(feature)}
                </span>
              ))}
              {property.features.length > 3 && (
                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[11px]">+{property.features.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Риелтор */}
        <div className="flex items-center mb-4 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mr-2.5 border border-blue-200">
            <span className="text-blue-700 text-sm font-bold">
              {property.profiles?.full_name?.charAt(0) || 'R'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
              {property.profiles?.full_name || t('card.realtor')}
              {property.profiles?.is_verified && <Star className="w-3.5 h-3.5 text-yellow-500" />}
            </p>
            {property.profiles?.agency_name && (
              <p className="text-xs text-gray-500 truncate">{property.profiles.agency_name}</p>
            )}
          </div>
        </div>

        {/* Цена и действия */}
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{t('card.priceWithCommission')}</p>
            <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {formatPrice(finalPriceUsdt)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
              <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                <DollarSign className="w-3 h-3" /> {formatUsdt(finalPriceUsdt)}
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                <Bitcoin className="w-3 h-3" /> {prices?.bitcoin?.usd ? (finalPriceUsdt / prices.bitcoin.usd).toFixed(6) : '—'}
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                <Coins className="w-3 h-3" /> {prices?.ethereum?.usd ? (finalPriceUsdt / prices.ethereum.usd).toFixed(6) : '—'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t('card.withoutCommission')}: {formatUsdt(property.price_usdt)}
            </p>
          </div>

          <Link
            to={`/properties/${property.id}`}
            className="shrink-0 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
          >
            {t('card.details')}
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button onClick={addToCompare} className="px-3 py-1.5 rounded-xl border text-sm">{t('card.compare')}</button>
            {profile?.role === 'buyer' && (
              <button onClick={()=>setNoteOpen(true)} className="px-3 py-1.5 rounded-xl border text-sm"><FileText className="w-4 h-4"/> {t('card.note')}</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {property.virtual_tour_url && (
              <a href={property.virtual_tour_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border text-sm"><ExternalLink className="w-4 h-4"/> {t('card.tour3d')}</a>
            )}
            {property.video_url && (
              <a href={property.video_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border text-sm"><ExternalLink className="w-4 h-4"/> {t('card.video')}</a>
            )}
            <button onClick={openRoute} className="px-3 py-1.5 rounded-xl border text-sm"><MapPin className="w-4 h-4"/> {t('card.route')}</button>
          </div>
        </div>
      </div>
      {noteOpen && (
        <div className="p-4 border-t">
          <textarea value={noteText} onChange={(e)=>setNoteText(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl border" placeholder={t('card.notePlaceholder')} />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={saveNote} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">{t('card.saveNote')}</button>
            <button onClick={()=>setNoteOpen(false)} className="px-3 py-1.5 rounded-xl border">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Square,
  Eye,
  Heart,
  Share2,
  Phone,
  Mail,
  Shield,
  Star,
  Camera,
  FileText,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Bitcoin,
  Coins,
  Scale,
} from 'lucide-react';
import { supabase, Property, Profile } from '../lib/supabase';
import { Map } from '../components/Map';
import { useAuth } from '../hooks/useAuth';
import { useCrypto } from '../hooks/useCrypto';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountries } from '../hooks/useCountries';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { prices } = useCrypto();
  const { t } = useLanguage();
  const { formatPrice } = useCountries();
  
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
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [salesRequest, setSalesRequest] = useState<any | null>(null);
  const [showLawyerModal, setShowLawyerModal] = useState(false);
  const [lawyers, setLawyers] = useState<Profile[]>([]);
  const [selectedLawyer, setSelectedLawyer] = useState<string | null>(null);
  const [lawyersLoading, setLawyersLoading] = useState(false);
  const didIncRef = useRef(false);

  useEffect(() => {
    if (id) {
      fetchProperty();
      if (!didIncRef.current) {
        incrementViews();
        didIncRef.current = true;
      }
      if (user) {
        checkFavoriteStatus();
        // запись в историю просмотров (для покупателей)
        (async () => {
          try {
            if (profile?.role === 'buyer') {
              await supabase.from('user_view_history').insert({ user_id: user.id, property_id: id });
            }
          } catch {}
        })();
      }
      fetchActiveBooking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => { didIncRef.current = false; }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('sales_requests')
        .select('*')
        .eq('property_id', id)
        .order('created_at', { ascending: false })
        .maybeSingle();
      setSalesRequest(data || null);
    })();
  }, [id]);

  const fetchLawyers = async () => {
    setLawyersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .eq('is_verified', true)
        .order('full_name');
      if (error) throw error;
      setLawyers(data || []);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
    } finally {
      setLawyersLoading(false);
    }
  };

  const createSalesRequest = async () => {
    if (!user || !property) return;
    if (profile?.role !== 'realtor') { alert(t('propertyDetail.onlyRealtorCanCreate')); return; }
    if (!activeBooking) { alert(t('propertyDetail.needActiveBooking')); return; }

    // Show lawyer selection modal
    await fetchLawyers();
    setShowLawyerModal(true);
  };

  const confirmCreateSalesRequest = async () => {
    if (!user || !property || !activeBooking) return;

    try {
      const { data, error } = await supabase
        .from('sales_requests')
        .insert({
          property_id: property.id,
          booking_id: activeBooking.id,
          buyer_id: activeBooking.buyer_id,
          realtor_id: user.id,
          lawyer_id: selectedLawyer
        })
        .select('*')
        .single();
      if (error) throw error;
      setSalesRequest(data);
      setShowLawyerModal(false);
      setSelectedLawyer(null);
      alert(t('propertyDetail.requestSent'));
    } catch (e: any) {
      alert(e?.message || t('propertyDetail.failedToCreateRequest'));
    }
  };

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles:profiles!properties_realtor_id_fkey (
            full_name,
            agency_name,
            is_verified,
            avatar_url,
            phone,
            email
          ),
          property_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error(t('propertyDetail.loadingError'), error);
      setError(t('propertyDetail.objectNotFoundDesc'));
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    try {
      await supabase.rpc('increment_property_views', { p_id: id });
    } catch (error) {
      console.error(t('propertyDetail.viewsError'), error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !id) return;
    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', id)
        .maybeSingle();
      setIsFavorite(!!data);
    } catch {}
  };

  const fetchActiveBooking = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('property_id', id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      setActiveBooking(data || null);
    } catch (e) {
      setActiveBooking(null);
    }
  };

  const createBooking = async () => {
    if (!user || !property) { navigate('/auth'); return; }
    if (profile?.role !== 'buyer') { alert(t('propertyDetail.bookingAvailableOnlyBuyers')); return; }
    setBookingLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 минут
      const { data, error } = await supabase
        .from('bookings')
        .insert({ property_id: property.id, buyer_id: user.id, status: 'active', expires_at: expiresAt })
        .select('*')
        .single();
      if (error) throw error;
      setActiveBooking(data);
    } catch (e: any) {
      alert(e?.message || t('propertyDetail.failedToCreateBooking'));
    } finally {
      setBookingLoading(false);
    }
  };

  const requestPurchase = async () => {
    if (!user || !property) { navigate('/auth'); return; }
    if (profile?.role !== 'buyer') { alert(t('propertyDetail.onlyBuyerCanRequest')); return; }
    try {
      const { data, error } = await supabase.rpc('request_purchase', { p_property_id: property.id });
      if (error) throw error;
      if (data?.booking) setActiveBooking(data.booking);
      alert(t('propertyDetail.requestSentToLovePay'));
    } catch (e: any) {
      alert(e?.message || t('propertyDetail.failedToSendRequest'));
    }
  };

  const cancelBooking = async () => {
    if (!activeBooking) return;
    setBookingLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', activeBooking.id);
      if (error) throw error;
      setActiveBooking(null);
    } catch (e: any) {
      alert(e?.message || t('propertyDetail.failedToCancelBooking'));
    } finally {
      setBookingLoading(false);
    }
  };


  const toggleFavorite = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', id);
        setIsFavorite(false);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, property_id: id });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error(t('propertyDetail.favoritesError'), error);
    }
  };

  const startConversation = async () => {
    if (!user || !property) { navigate('/auth'); return; }
    if (profile?.role !== 'buyer') {
      alert(t('propertyDetail.onlyBuyerCanCreateDialog'));
      return;
    }
    try {
      // найти или создать
      const { data: found } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('realtor_id', property.realtor_id)
        .eq('property_id', property.id)
        .maybeSingle();
      let convId = found?.id;
      if (!convId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({ buyer_id: user.id, realtor_id: property.realtor_id, property_id: property.id })
          .select('id')
          .single();
        if (error) throw error;
        convId = data.id;
      }
      navigate('/chats');
    } catch (e) {
      alert(t('propertyDetail.failedToOpenChat'));
    }
  };

  const formatNumber = (value: number) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const images = property?.property_images || [];
  const primaryImage = images.find((img) => img.is_primary) || images[0];

  // Цены
  const finalPriceUsdt = property ? property.price_usdt * 1.07 : 0;
  const btc = prices?.bitcoin?.usd ? finalPriceUsdt / prices.bitcoin.usd : 0;
  const eth = prices?.ethereum?.usd ? finalPriceUsdt / prices.ethereum.usd : 0;
  const formatUsdt = (amount: number) => (!amount || isNaN(amount) ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6" />
          <p className="text-gray-600 text-lg">{t('propertyDetail.loadingObject')}</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('propertyDetail.objectNotFound')}</h1>
          <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <button onClick={() => navigate('/properties')} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl transition-all font-semibold text-lg shadow-lg">
            {t('propertyDetail.returnToSearch')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO только с фоном и верхними кнопками */}
      <section className="relative h-[48vh] md:h-[56vh] min-h-[420px] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%), url(${primaryImage?.image_url || ''})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Декоративные орбы */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-8 -left-8 w-56 h-56 md:w-80 md:h-80 bg-blue-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-6 right-8 w-40 h-40 md:w-64 md:h-64 bg-cyan-400/15 rounded-full blur-3xl" />
        </div>

        {/* Верхняя панель */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center space-x-3 text-white/90 hover:text-white transition-all bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">{t('propertyDetail.back')}</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleFavorite} className={`px-3 sm:px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium border border-white/20 backdrop-blur-md transition-all ${isFavorite ? 'bg-red-500 text-white shadow-lg' : 'bg-white/10 text-white/90 hover:bg-white/20'}`}>
              <span className="hidden sm:inline">{isFavorite ? t('propertyDetail.inFavorites') : t('propertyDetail.toFavorites')}</span>
              <Heart className={`w-4 h-4 sm:hidden ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: property.title, text: `${t('propertyDetail.viewProperty')}: ${property.title}`, url: window.location.href });
                  } catch {}
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert(t('propertyDetail.linkCopied'));
                }
              }}
              className="px-3 sm:px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium border border-white/20 backdrop-blur-md text-white/90 hover:bg-white/20 transition-all"
            >
              <span className="hidden sm:inline">{t('propertyDetail.share')}</span>
              <Share2 className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>

        {/* Лёгкие стеклянные бейджи в центре (не влияют на компоновку) */}
        <div className="relative z-20 h-full flex items-end md:items-center justify-start md:justify-center pb-6 md:pb-0">
          <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-md text-white/90 rounded-full px-4 py-2">
            <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {property.address}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{property.property_type}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="inline-flex items-center gap-1"><Eye className="w-4 h-4" /> {property.views_count}</span>
          </div>
        </div>
      </section>

      {/* SUMMARY – стабильная карточка под HERO */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-10 md:-mt-12 relative z-30">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
            {/* Заголовок + адрес */}
            <div className="lg:col-span-8 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-800 mb-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[220px] md:max-w-none">{property.address}</span>
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700">{property.property_type}</span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                  <Eye className="w-4 h-4" /> {property.views_count}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight truncate">{property.title}</h1>
              {/* Факты */}
              <div className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
                <div className="text-center rounded-xl border border-gray-200 p-3">
                  <div className="text-xs text-gray-500">{t('propertyDetail.bedrooms')}</div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{property.bedrooms || 0}</div>
                </div>
                <div className="text-center rounded-xl border border-gray-200 p-3">
                  <div className="text-xs text-gray-500">{t('propertyDetail.bathrooms')}</div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{property.bathrooms || 0}</div>
                </div>
                <div className="text-center rounded-xl border border-gray-200 p-3">
                  <div className="text-xs text-gray-500">{t('propertyDetail.area')}</div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{formatNumber(property.area_sqm)} {t('propertyDetail.sqm')}</div>
                </div>
              </div>
            </div>
            {/* Цена */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 md:p-5">
                <div className="text-xs text-blue-800 font-semibold mb-1">{t('propertyDetail.priceWithCommissionLabel')}</div>
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{formatPrice(finalPriceUsdt)}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs md:text-sm text-gray-700">
                  <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-200"><DollarSign className="w-4 h-4" /> {formatUsdt(finalPriceUsdt)}</span>
                  <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-200"><Bitcoin className="w-4 h-4" /> {btc && btc > 0 ? btc.toFixed(6) : '—'}</span>
                  <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-200"><Coins className="w-4 h-4" /> {eth && eth > 0 ? eth.toFixed(6) : '—'}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{t('propertyDetail.withoutCommission')}: {formatUsdt(property.price_usdt)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ОСНОВНАЯ СЕТКА */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          {/* Левая колонка */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Галерея */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 md:p-6">
              {images.length > 0 ? (
                <div className="grid grid-cols-12 gap-2 md:gap-3">
                  <div className="col-span-12 md:col-span-7 lg:col-span-8">
                    <button
                      onClick={() => {
                        setLightboxUrl(images[currentImageIndex]?.image_url || primaryImage?.image_url || null);
                        setLightboxOpen(true);
                      }}
                      className="block w-full h-[260px] md:h-[420px] lg:h-[520px] rounded-xl md:rounded-2xl overflow-hidden group relative"
                    >
                      <img src={images[currentImageIndex]?.image_url || primaryImage?.image_url} alt={property.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-all duration-500" />
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                            }}
                            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-2 md:p-3 rounded-full hover:bg-black/70 transition-all hover:scale-110"
                          >
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-2 md:p-3 rounded-full hover:bg-black/70 transition-all hover:scale-110"
                          >
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="col-span-12 md:col-span-5 lg:col-span-4 grid grid-cols-4 md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                    {images.slice(0, 8).map((img, idx) => (
                      <button key={img.id} onClick={() => setCurrentImageIndex(idx)} className={`relative h-16 md:h-24 rounded-xl overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-blue-400'}`}>
                        <img src={img.image_url} alt={`${property.title} ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === currentImageIndex && <div className="absolute inset-0 ring-2 ring-blue-500/40 rounded-xl" />}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-56 md:h-80 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center">
                  <Camera className="w-10 h-10 md:w-14 md:h-14 text-gray-400" />
                </div>
              )}
            </div>

            {/* Описание */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('propertyDetail.description')}</h2>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base md:text-lg">{property.description}</p>
            </div>

            {/* Особенности */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('propertyDetail.features')}</h2>
              </div>
              {property.features.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, index) => (
                    <span key={index} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-800 border border-green-200 text-sm">
                      <CheckCircle className="w-4 h-4" /> {translateFeature(feature)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600">{t('propertyDetail.noFeatures')}</p>
                </div>
              )}
            </div>

            {/* Расположение */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('propertyDetail.location')}</h2>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl md:rounded-2xl p-4 border border-purple-200 mb-4">
                <p className="text-gray-700 text-base font-medium">{property.address}</p>
              </div>
              {property && typeof property.latitude === 'number' && typeof property.longitude === 'number' && (
                <Map 
                  properties={[property]} 
                  selectedProperty={property}
                  height="288px"
                />
              )}
            </div>
          </div>

          {/* Правая колонка (SIDEBAR) */}
          <aside className="space-y-5 md:space-y-6 lg:sticky lg:top-24">
            {/* Контакты и цена (карточка) */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
              <div className="text-center mb-5">
                <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full px-3 md:px-4 py-2 mb-3 border border-blue-200">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-orange-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-[10px] font-bold">₿</span>
                  </div>
                  <span className="text-blue-800 text-xs md:text-sm font-semibold">{t('propertyDetail.priceWithCommissionLabel')}</span>
                </div>
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">{formatPrice(finalPriceUsdt)}</div>
                <div className="text-gray-700 text-xs md:text-sm mb-2 flex flex-wrap gap-x-2 md:gap-x-3 gap-y-1 justify-center">
                  <span>USDT: {formatUsdt(finalPriceUsdt)}</span>
                  <span>• BTC: {btc && btc > 0 ? btc.toFixed(6) : '—'}</span>
                  <span>• ETH: {eth && eth > 0 ? eth.toFixed(6) : '—'}</span>
                </div>
                <div className="text-gray-500 text-xs md:text-sm mb-4">{t('propertyDetail.withoutCommission')}: {formatUsdt(property.price_usdt)}</div>
                <div className="flex flex-col gap-2 md:gap-3">
                  <div className="flex gap-2">
                    {property.virtual_tour_url && (
                      <a href={property.virtual_tour_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm">
                        {t('propertyDetail.tour3d')}
                      </a>
                    )}
                    {property.video_url && (
                      <a href={property.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm">
                        {t('propertyDetail.video')}
                      </a>
                    )}
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(property.address || '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm">
                      {t('propertyDetail.route')}
                    </a>
                  </div>
                  {salesRequest && (
                    <div className="w-full text-center border-2 border-blue-200 text-blue-800 font-semibold py-3 md:py-4 rounded-2xl bg-blue-50">
                      {t('propertyDetail.deal')}: {require('../lib/status').getSaleStatusLabel(salesRequest.status)}
                    </div>
                  )}
                  {/* Если есть активная бронь другого покупателя - блокируем контакты (кроме риелтора) */}
                  {activeBooking && activeBooking.buyer_id !== user?.id && profile?.role !== 'realtor' ? (
                    <div className="w-full text-center border-2 border-yellow-200 text-yellow-800 font-semibold py-3 md:py-4 rounded-2xl bg-yellow-50">
                      {t('propertyDetail.objectBookedUntil')} {activeBooking ? new Date(activeBooking.expires_at).toLocaleTimeString() : ''}
                    </div>
                  ) : (
                    <>
                  {property.profiles?.phone && (
                    <a href={`tel:${property.profiles.phone}`} className="w-full text-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 md:py-4 rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg">
                      {t('propertyDetail.contactRealtor')}
                    </a>
                  )}
                  {property.profiles?.email && (
                    <a href={`mailto:${property.profiles.email}`} className="w-full text-center border-2 border-gray-200 text-gray-800 font-semibold py-3 md:py-4 rounded-2xl hover:bg-gray-50 transition-all">
                      {t('propertyDetail.writeEmail')}
                    </a>
                  )}
                  {profile?.role === 'buyer' && (
                    <button onClick={startConversation} className="w-full text-center border-2 border-blue-200 text-blue-700 font-semibold py-3 md:py-4 rounded-2xl hover:bg-blue-50 transition-all">
                      {t('propertyDetail.writeToChat')}
                    </button>
                  )}
                  {/* Кнопка создания запроса для риелтора при наличии брони */}
                  {profile?.role === 'realtor' && activeBooking && !salesRequest && (
                    <button onClick={createSalesRequest} className="w-full text-center border-2 border-emerald-200 text-emerald-700 font-semibold py-3 md:py-4 rounded-2xl hover:bg-emerald-50 transition-all">
                      {t('propertyDetail.createSalesRequest')}
                    </button>
                  )}
                    </>
                  )}
                  {/* Кнопки бронирования */}
                  {profile?.role === 'buyer' && (
                    <div className="flex gap-2">
                      {!activeBooking || activeBooking.buyer_id === user?.id ? (
                        <button onClick={activeBooking ? cancelBooking : createBooking} disabled={bookingLoading} className={`w-full text-center ${activeBooking ? 'border-2 border-red-200 text-red-700 hover:bg-red-50' : 'border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50'} font-semibold py-3 md:py-4 rounded-2xl transition-all`}>
                          {activeBooking ? t('propertyDetail.cancelBooking') : t('propertyDetail.bookProperty')}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Риелтор */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl md:rounded-2xl p-4 border border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center border border-orange-200 text-orange-700 text-xl font-bold">
                    {property.profiles?.full_name?.charAt(0) || 'R'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900 truncate">{property.profiles?.full_name || t('propertyDetail.realtor')}</span>
                      {property.profiles?.is_verified && (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-1 text-xs font-medium">
                          <Shield className="w-3 h-3" /> {t('propertyDetail.verified')}
                        </span>
                      )}
                    </div>
                    {property.profiles?.agency_name && <div className="text-gray-600 text-sm mb-2 truncate">{property.profiles.agency_name}</div>}
                    <div className="flex flex-wrap items-center gap-2">
                      {property.profiles?.phone && (
                        <a href={`tel:${property.profiles.phone}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-green-200 text-green-800 bg-green-50 hover:bg-green-100 transition-all text-sm">
                          <Phone className="w-4 h-4" /> {property.profiles.phone}
                        </a>
                      )}
                      {property.profiles?.email && (
                        <a href={`mailto:${property.profiles.email}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-800 bg-blue-50 hover:bg-blue-100 transition-all text-sm">
                          <Mail className="w-4 h-4" /> {property.profiles.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Мета */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-200">
                  <div className="text-[10px] text-gray-500 mb-1">{t('propertyDetail.viewsLabel')}</div>
                  <div className="text-lg font-bold text-gray-900">{property.views_count}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-200">
                  <div className="text-[10px] text-gray-500 mb-1">{t('propertyDetail.addedLabel')}</div>
                  <div className="text-xs font-semibold text-gray-900">{new Date(property.created_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
                  <div className="text-[10px] text-gray-500 mb-1">{t('propertyDetail.updatedLabel')}</div>
                  <div className="text-xs font-semibold text-gray-900">{new Date(property.updated_at).toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Лайтбокс */}
      {lightboxOpen && lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 border border-white/20 rounded-full p-3 hover:bg-white/20 transition-all" onClick={() => setLightboxOpen(false)}>
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Lawyer Selection Modal */}
      {showLawyerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{t('propertyDetail.selectLawyer')}</h2>
                </div>
                <button
                  onClick={() => {
                    setShowLawyerModal(false);
                    setSelectedLawyer(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">{t('propertyDetail.selectLawyerDesc')}</p>
            </div>

            <div className="overflow-y-auto max-h-[50vh] p-6">
              {lawyersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
                  <p className="text-gray-600">{t('common.loading')}</p>
                </div>
              ) : lawyers.length === 0 ? (
                <div className="text-center py-8">
                  <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">{t('propertyDetail.noLawyersAvailable')}</p>
                  <p className="text-sm text-gray-500">{t('propertyDetail.proceedWithoutLawyer')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className="p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-all"
                    onClick={() => setSelectedLawyer(null)}
                  >
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedLawyer === null}
                        onChange={() => setSelectedLawyer(null)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{t('propertyDetail.withoutLawyer')}</p>
                        <p className="text-sm text-gray-600">{t('propertyDetail.continueWithoutLawyer')}</p>
                      </div>
                    </label>
                  </div>
                  {lawyers.map((lawyer) => (
                    <div
                      key={lawyer.id}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedLawyer === lawyer.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedLawyer(lawyer.id)}
                    >
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          checked={selectedLawyer === lawyer.id}
                          onChange={() => setSelectedLawyer(lawyer.id)}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {lawyer.full_name}
                                {lawyer.is_verified && (
                                  <CheckCircle className="w-4 h-4 text-green-500 inline ml-2" />
                                )}
                              </p>
                              {lawyer.agency_name && (
                                <p className="text-sm text-gray-600">{lawyer.agency_name}</p>
                              )}
                              {lawyer.bio && (
                                <p className="text-sm text-gray-500 mt-1">{lawyer.bio}</p>
                              )}
                            </div>
                            {lawyer.commission_rate !== undefined && (
                              <span className="text-sm font-medium text-green-600">
                                {(lawyer.commission_rate * 100).toFixed(1)}% {t('propertyDetail.fee')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {lawyer.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{lawyer.email}</span>
                              </div>
                            )}
                            {lawyer.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{lawyer.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLawyerModal(false);
                  setSelectedLawyer(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmCreateSalesRequest}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
              >
                {t('propertyDetail.createRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
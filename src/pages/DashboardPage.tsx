import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Star, 
  Shield, 
  Upload,
  TrendingUp,
  Home,
  DollarSign,
  Calendar,
  Clock,
  MapPin,
  Bed,
  Bath,
  Square,
  Zap,
  Crown,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Bell,
  Activity,
  Building,
  Phone,
  User,
  Heart,
  MessageSquare,
  Wallet,
  Sparkles,
  BadgeCheck,
  Download,
  BarChart3,
  Scale,
  Briefcase,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Property } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrypto } from '../hooks/useCrypto';
import { getSaleStatusLabel, getInvoiceStatusLabel, formatUsdt } from '../lib/status';

export function DashboardPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { prices } = useCrypto();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'bookings' | 'analytics' | 'settings'>('overview');
  const [compact, setCompact] = useState<boolean>(() => {
    try { return localStorage.getItem('dashboard_compact') === '1'; } catch { return false; }
  });
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalViews: 0,
    totalValue: 0,
    activeProperties: 0,
    monthlyViews: 0,
    avgPrice: 0
  });

  // buyer-only state
  const [buyerFavoritesCount, setBuyerFavoritesCount] = useState<number>(0);
  const [buyerConversationsCount, setBuyerConversationsCount] = useState<number>(0);
  const [buyerBookings, setBuyerBookings] = useState<any[]>([]);
  const [realtorBookings, setRealtorBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [buyerSales, setBuyerSales] = useState<any[]>([]);
  const [realtorSales, setRealtorSales] = useState<any[]>([]);
  const [lawyerSales, setLawyerSales] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [rev, setRev] = useState<any | null>(null);

  // helpers для уведомлений
  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
  };
  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    loadNotifications();
  };
  useEffect(() => { loadNotifications(); }, [user]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        loadNotifications();
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (profile?.role === 'buyer') {
      // загрузка метрик покупателя
      (async () => {
        try {
          const fav = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
          setBuyerFavoritesCount(fav.count || 0);
        } catch {}
        try {
          const conv = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id);
          setBuyerConversationsCount(conv.count || 0);
        } catch {}
        try {
          const { data } = await supabase
            .from('bookings')
            .select('*, property:properties(title)')
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });
          setBuyerBookings(data || []);
        } catch {}
        try {
          const { data } = await supabase
            .from('sales_requests')
            .select('id,status,created_at, property:properties(title), invoice:invoices(status,amount_usdt)')
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });
          setBuyerSales(data || []);
        } catch {}
        try {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          setNotifications(data || []);
        } catch {}
      })();
      setPropertiesLoading(false);
      return;
    }

    // Lawyer data
    if (profile?.role === 'lawyer') {
      (async () => {
        try {
          const { data } = await supabase
            .from('sales_requests')
            .select('id,status,created_at,lawyer_id, property:properties(title), invoice:invoices(status,amount_usdt)')
            .eq('lawyer_id', user.id)
            .order('created_at', { ascending: false });
          setLawyerSales(data || []);
        } catch (error) {
          console.error('Error loading lawyer sales:', error);
        }
        try {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          setNotifications(data || []);
        } catch {}
      })();
      setPropertiesLoading(false);
      return;
    }

    // realtor data
    fetchProperties();
  }, [user, profile?.role]);

  // Realtor bookings loader
  useEffect(() => {
    if (!user || profile?.role !== 'realtor') return;
    if (activeTab !== 'bookings') return;
    (async () => {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('*, buyer:profiles(full_name), property:properties(title,realtor_id)')
          .eq('property.realtor_id', user.id)
          .order('created_at', { ascending: false });
        setRealtorBookings(data || []);
      } catch (e) {
        setRealtorBookings([]);
      }
    })();
  }, [activeTab, user, profile?.role]);

  // realtor notifications on overview
  useEffect(() => {
    if (!user || profile?.role !== 'realtor') return;
    if (activeTab !== 'overview') return;
    (async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        setNotifications(data || []);
      } catch {}
      try {
        const { data } = await supabase
          .from('sales_requests')
          .select('id,status,created_at, property:properties(title), invoice:invoices(status,amount_usdt)')
          .eq('realtor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setRealtorSales(data || []);
      } catch {}
    })();
  }, [user, profile?.role, activeTab]);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      setAnalyticsLoading(true);
      try {
        if (profile.role === 'realtor') {
          const { data } = await supabase.from('v_realtor_funnel_daily').select('*').eq('realtor_id', profile.id).order('day', { ascending: true });
          setFunnel(data || []);
        } else {
          const { data } = await supabase.from('v_funnel_daily').select('*').order('day', { ascending: true });
          setFunnel(data || []);
        }
        if (profile.role === 'realtor') {
          const { data: r } = await supabase.from('v_revenue_and_commissions').select('*').eq('realtor_id', profile.id).maybeSingle();
          setRev(r || null);
        } else {
          setRev(null);
        }
      } finally {
        setAnalyticsLoading(false);
      }
    })();
  }, [profile]);

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;
      // refresh both lists if present
      setBuyerBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
      setRealtorBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
    } catch {}
  };

  const updatePayout = async (method: 'fiat' | 'usdt') => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ payout_method: method })
      .eq('id', user.id)
      .select('*')
      .single();
    if (!error && data) {
      // naive state refresh
      (profile as any).payout_method = method;
    }
  };

  const PayoutInput: React.FC<{ profile: any }> = ({ profile }) => {
    const [value, setValue] = useState(profile?.payout_details || '');
    const [saving, setSaving] = useState(false);
    const placeholder = profile?.payout_method === 'usdt' ? t('dashboard.payout.placeholder.usdt') : t('dashboard.payout.placeholder.bank');
    const onSave = async () => {
      if (!user) return;
      setSaving(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ payout_details: value })
          .eq('id', user.id)
          .select('*')
          .single();
        if (!error && data) {
          (profile as any).payout_details = value;
        }
      } finally {
        setSaving(false);
      }
    };
    return (
      <div className="flex gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="flex-1 px-4 py-3 rounded-xl border border-gray-200" />
        <button onClick={onSave} disabled={saving} className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white disabled:opacity-50">{t('common.save')}</button>
      </div>
    );
  };

  const fetchProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('realtor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);
      
      const totalViews = data?.reduce((sum, prop) => sum + (prop.views_count || 0), 0) || 0;
      const totalValue = data?.reduce((sum, prop) => sum + prop.price_usdt, 0) || 0;
      const activeProperties = data?.filter(prop => prop.is_active).length || 0;
      const avgPrice = data?.length ? totalValue / data.length : 0;

      setStats({
        totalProperties: data?.length || 0,
        totalViews,
        totalValue,
        activeProperties,
        monthlyViews: Math.floor(totalViews * 0.3),
        avgPrice
      });
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm(t('dashboard.confirm.deleteProperty'))) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyId));
    } catch (error) {
      console.error('Delete property error:', error);
      alert(t('dashboard.errors.delete'));
    }
  };

  const togglePropertyStatus = async (propertyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_active: !currentStatus })
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, is_active: !currentStatus } : p
      ));
    } catch (error) {
      console.error('Toggle property error:', error);
      alert(t('dashboard.errors.toggle'));
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
      apartment: t('propertyType.apartmentSingular'),
      house: t('propertyType.houseSingular'),
      villa: t('propertyType.villaSingular'),
      commercial: t('propertyType.commercialSingular'),
      land: t('propertyType.landSingular')
    };
    return types[type as keyof typeof types] || type;
  };

  const exportFunnelCSV = () => {
    const headers = ['day','views','bookings','sales','payments'];
    const rows = funnel.map((x) => [x.day, x.views, x.bookings, x.sales, x.payments]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `funnel_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const exportRevenueCSV = () => {
    if (!rev) return;
    const headers = ['realtor_id','paid_turnover_usdt','commissions_usdt','paid_invoices','total_sales_requests'];
    const row = [rev.realtor_id, rev.paid_turnover_usdt, rev.commissions_usdt, rev.paid_invoices, rev.total_sales_requests];
    const csv = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `revenue_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  // простой мини-график (без доп. либ): столбики
  const maxVal = funnel.reduce((m, x) => Math.max(m, Number(x.views || 0), Number(x.bookings || 0), Number(x.sales || 0), Number(x.payments || 0)), 0) || 1;

  // Показываем загрузку только если пользователь не определен
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">{t('dashboard.checkingAuth')}</p>
        </div>
      </div>
    );
  }

  // Buyer-specific dashboard
  if (!propertiesLoading && profile?.role === 'buyer') {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-violet-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* HERO */}
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-100" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-100" />
            <div className="relative flex items-center justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border bg-white text-xs text-gray-700"><Sparkles className="w-3.5 h-3.5 text-blue-600" /> {t('dashboard.buyerBadge')}</div>
                <h1 className="mt-2 text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
                  {t('dashboard.greeting')}, {profile?.full_name || t('header.user')}
                </h1>
                <p className="text-gray-600 mt-1">{t('dashboard.buyerSubtitle')}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-sm text-gray-700">
                <BadgeCheck className="w-4 h-4 text-blue-600" /> {profile?.email}
              </div>
            </div>
          </div>

          {/* Referral Promo Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-yellow-300" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{t('referral.title')}</h2>
                      <p className="text-white/80">{t('referral.subtitle')}</p>
                    </div>
                  </div>
                  <Link
                    to="/referral"
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 border border-white/20"
                  >
                    {t('referral.getStarted')}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-black">{t('referral.step1')}</span>
                      </div>
                      <span className="font-semibold">{t('referral.step1Title')}</span>
                    </div>
                    <p className="text-white/80 text-sm">{t('referral.step1Desc')}</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-400 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-black">{t('referral.step2')}</span>
                      </div>
                      <span className="font-semibold">{t('referral.step2Title')}</span>
                    </div>
                    <p className="text-white/80 text-sm">{t('referral.step2Desc')}</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-black">$</span>
                      </div>
                      <span className="font-semibold">{t('referral.step3Title')}</span>
                    </div>
                    <p className="text-white/80 text-sm">{t('referral.step3Desc')}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-green-300" />
                      <span className="text-sm font-medium">{t('referral.totalEarned')}</span>
                      <span className="text-lg font-bold text-green-300">$0.00 USDT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-300" />
                      <span className="text-sm font-medium">{t('referral.referrals')}</span>
                      <span className="text-lg font-bold text-blue-300">0</span>
                    </div>
                  </div>
                  <Link
                    to="/referral"
                    className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    {t('referral.viewDetails')}
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Метрики */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.metrics.favorites')}</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{buyerFavoritesCount}</div>
                  <div className="text-xs text-green-600 mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />+12% {t('dashboard.growthSinceLastMonth')}</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-white"><Heart className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.metrics.dialogs')}</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{buyerConversationsCount}</div>
                  <div className="text-xs text-green-600 mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />+8% {t('dashboard.growthSinceLastMonth')}</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white"><MessageSquare className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.metrics.totalValue')}</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">— USDT</div>
                  <div className="text-xs text-blue-600 mt-1">— ZAR</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-white"><DollarSign className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.metrics.activeChats')}</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{buyerConversationsCount}</div>
                  <div className="text-xs text-purple-600 mt-2 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />{t('dashboard.activeLabel')}</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white"><Activity className="w-6 h-6" /></div>
              </div>
            </div>
          </div>

          {/* Быстрые действия для покупателя */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-stretch gap-4 sm:gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Home className="w-6 h-6" /></div>
                <span className="text-2xl font-bold">{t('dashboard.quick.search')}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('dashboard.quick.findProperty')}</h3>
              <p className="text-blue-100 mb-4">{t('home.cta.title')}</p>
              <Link to="/properties" className="mt-auto inline-flex items-center bg-white text-blue-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-all">
                {t('dashboard.quick.go')}
              </Link>
            </div>
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Heart className="w-6 h-6" /></div>
                <span className="text-2xl font-bold">{buyerFavoritesCount}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('dashboard.quick.favorites')}</h3>
              <p className="text-rose-100 mb-4">{t('favorites.title')}</p>
              <Link to="/favorites" className="mt-auto inline-flex items-center bg-white text-rose-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-all">
                {t('dashboard.quick.open')}
              </Link>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><MessageSquare className="w-6 h-6" /></div>
                <span className="text-2xl font-bold">{buyerConversationsCount}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('dashboard.quick.chats')}</h3>
              <p className="text-purple-100 mb-4">{t('chats.title')}</p>
              <Link to="/chats" className="mt-auto inline-flex items-center bg-white text-purple-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-all">
                {t('dashboard.quick.openChats')}
              </Link>
            </div>
          </div>

          {/* Мои бронирования */}
          <div className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{t('dashboard.bookings.title')}</h2>
            {buyerBookings.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                {t('dashboard.bookings.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {buyerBookings.map((b) => {
                  const remainingMs = Math.max(0, new Date(b.expires_at).getTime() - Date.now());
                  const remainingMin = Math.ceil(remainingMs / 60000);
                  const isActive = b.status === 'active' && remainingMs > 0;
                  return (
                    <div key={b.id} className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all h-full flex flex-col justify-between">
                      <div className={`absolute inset-y-0 left-0 w-1 ${isActive ? 'bg-emerald-400/80' : b.status === 'cancelled' ? 'bg-red-400/80' : 'bg-gray-300'}`} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{b.property?.title || t('dashboard.property')}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{isActive ? t('dashboard.booking.active') : b.status === 'cancelled' ? t('dashboard.booking.cancelled') : t('dashboard.booking.expired')}</span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-600"><Clock className="w-3 h-3" /> {t('dashboard.booking.until')} {new Date(b.expires_at).toLocaleTimeString()} ({remainingMin} {t('dashboard.booking.min')})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <button onClick={() => cancelBooking(b.id)} className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm">{t('dashboard.booking.cancel')}</button>
                          )}
                        </div>
                      </div>
                      {/* Инвойс, если есть по этому объекту */}
                      <div className="mt-3">
                        <BuyerInvoiceCard propertyTitle={b.property?.title} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Уведомления и история */}
          <div id="notifications" className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-900 font-semibold"><Bell className="w-4 h-4" /> {t('dashboard.notifications.title')}</div>
                <button onClick={loadNotifications} className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50">{t('dashboard.notifications.refresh')}</button>
              </div>
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-600">{t('dashboard.notifications.empty')}</div>
              ) : (
                <ul className="divide-y max-h-72 overflow-y-auto pr-1">
                  {notifications.map((n)=> (
                    <li key={n.id} className="py-2 flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-blue-500 animate-pulse'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                        <div className="text-sm text-gray-700">{n.message}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.is_read && (
                        <button onClick={()=>markRead(n.id)} className="text-sm px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50">{t('dashboard.notifications.markRead')}</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="text-sm text-gray-700">{t('dashboard.webpush.enable')}</div>
                <EnablePushCard />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2"><Eye className="w-4 h-4" /> {t('dashboard.history.title')}</div>
                <BuyerViewHistory />
              </div>
            </div>
          </div>

          {/* Мои сделки (покупатель) */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.deals.title')}</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{buyerSales.length}</span>
            </div>
            {buyerSales.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6 text-gray-600 flex items-center gap-3"><Zap className="w-4 h-4 text-gray-400" /> {t('dashboard.deals.empty')}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {buyerSales.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 h-full flex flex-col justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{s.property?.title || t('dashboard.property')}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-700 border-blue-200">{t('dashboard.deal')}: {getSaleStatusLabel(s.status)}</span>
                        {s.invoice && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] border bg-yellow-50 text-yellow-700 border-yellow-200">{t('dashboard.invoice')}: {getInvoiceStatusLabel(s.invoice.status)}{s.invoice.amount_usdt ? ` · ${formatUsdt(s.invoice.amount_usdt)}` : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link to={`/sales/${s.id}`} className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm shadow-sm">{t('dashboard.open')}</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (propertiesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">{t('dashboard.loadingData')}</p>
        </div>
      </div>
    );
  }

  // Lawyer-specific dashboard
  if (!propertiesLoading && profile?.role === 'lawyer') {
    const activeCases = lawyerSales.filter(r => ['pending', 'invoice_issued', 'payment_pending'].includes(r.status));
    const completedCases = lawyerSales.filter(r => r.status === 'paid');

    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* HERO */}
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-purple-100" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-100" />
            <div className="relative flex items-center justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-900 to-indigo-700 bg-clip-text text-transparent">
                  {t('dashboard.lawyerTitle')}
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  {t('dashboard.welcome')}, {profile?.full_name}!
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-medium">
                  <Scale className="w-5 h-5 inline mr-2" />
                  {t('profile.role.lawyer')}
                </div>
                {profile?.is_verified && (
                  <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">
                    <Shield className="w-5 h-5 inline mr-2" />
                    {t('propertyDetail.verified')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Метрики юриста */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.lawyer.activeCases')}</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{activeCases.length}</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white">
                  <Briefcase className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.lawyer.completedCases')}</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{completedCases.length}</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.lawyer.totalCases')}</div>
                  <div className="text-3xl font-extrabold text-gray-900 mt-1">{lawyerSales.length}</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 font-medium">{t('dashboard.lawyer.commission')}</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">
                    {profile?.commission_rate ? `${(profile.commission_rate * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Быстрые действия для юриста */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link to="/deals" className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all">
              <Briefcase className="w-8 h-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">{t('dashboard.lawyer.viewDeals')}</h3>
              <p className="text-purple-100">{t('dashboard.lawyer.viewDealsDesc')}</p>
            </Link>
            <Link to="/chats" className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all">
              <MessageSquare className="w-8 h-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">{t('dashboard.lawyer.chats')}</h3>
              <p className="text-blue-100">{t('dashboard.lawyer.chatsDesc')}</p>
            </Link>
            <Link to="/profile/edit" className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white hover:shadow-xl transition-all">
              <User className="w-8 h-8 mb-3" />
              <h3 className="text-xl font-bold mb-2">{t('dashboard.lawyer.profile')}</h3>
              <p className="text-green-100">{t('dashboard.lawyer.profileDesc')}</p>
            </Link>
          </div>

          {/* Уведомления юриста */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5" /> {t('dashboard.notifications.title')}
                </h3>
                <button onClick={loadNotifications} className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50">
                  {t('dashboard.notifications.refresh')}
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-600">{t('dashboard.notifications.empty')}</div>
              ) : (
                <ul className="divide-y max-h-72 overflow-y-auto">
                  {notifications.slice(0, 5).map((n) => (
                    <li key={n.id} className="py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-purple-500 animate-pulse'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{n.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                      {!n.is_read && (
                        <button onClick={() => markRead(n.id)} className="text-xs px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50">
                          {t('dashboard.notifications.markRead')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Активные дела */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5" /> {t('dashboard.lawyer.recentCases')}
              </h3>
              {activeCases.length === 0 ? (
                <div className="py-10 text-center text-gray-600">{t('dashboard.lawyer.noCases')}</div>
              ) : (
                <div className="space-y-3">
                  {activeCases.slice(0, 5).map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/sales/${deal.id}`}
                      className="block p-3 border rounded-xl hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{deal.property?.title || 'Deal'}</div>
                          <div className="text-sm text-gray-600">{getSaleStatusLabel(deal.status)}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const finalPriceZar = prices ? stats.totalValue * 1.07 * (prices.bitcoin.zar / prices.bitcoin.usd) : 0;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${compact ? 'dashboard-compact' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {t('dashboard.title')}
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {t('dashboard.welcome')}, {profile?.full_name}!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ const v = !compact; setCompact(v); try { localStorage.setItem('dashboard_compact', v ? '1' : '0'); } catch {} }} className="px-3 py-2 rounded-xl border bg-white text-gray-700 hover:bg-gray-50 text-sm">{compact ? t('dashboard.normal') : t('dashboard.compact')}</button>
              {profile?.role === 'realtor' && (
                <Link
                  to="/properties/new"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>{t('header.addProperty')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* HERO для риелтора */}
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6 hidden md:block">
          <div className="absolute -top-16 -right-20 w-72 h-72 bg-blue-100 rounded-full" />
          <div className="absolute -bottom-20 -left-16 w-60 h-60 bg-cyan-100 rounded-full" />
          <div className="relative flex items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border bg-white text-xs text-gray-700 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> {t('dashboard.realtor.badge')}
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-gray-900 truncate">{profile?.full_name || t('profile.role.realtor')}</h2>
              <div className="text-gray-600 mt-1 truncate">{profile?.email}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {profile?.agency_name && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                    <Building className="w-3.5 h-3.5" /> {profile.agency_name}
                  </div>
                )}
                {profile?.is_verified ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                    <Shield className="w-3.5 h-3.5" /> {t('common.verified')}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> {t('dashboard.needVerification')}
                  </div>
                )}
              </div>
            </div>
            <Link to="/profile/edit" className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-gray-700 hover:bg-gray-50 shadow-sm">{t('dashboard.edit')}</Link>
          </div>
        </div>

        {/* Вкладки */}
        <div className="mb-8">
          <div className="inline-flex gap-1 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            {[
              { key: 'overview', label: t('tabs.overview'), icon: Home },
              { key: 'properties', label: t('tabs.properties'), icon: Building },
              { key: 'bookings', label: t('tabs.bookings'), icon: Calendar },
              { key: 'analytics', label: t('tabs.analytics'), icon: TrendingUp },
              { key: 'settings', label: t('tabs.settings'), icon: Settings },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === key 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md ring-1 ring-blue-300/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.charAt(0)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Обзор */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Статистика */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('dashboard.totalProperties')}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalProperties}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">+12% {t('dashboard.growthSinceLastMonth')}</span>
                      <span className="sm:hidden">+12%</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('dashboard.totalViews')}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalViews}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">+8% {t('dashboard.growthSinceLastMonth')}</span>
                      <span className="sm:hidden">+8%</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('dashboard.metrics.totalValue')}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatPrice(stats.totalValue)} USDT</p>
                    <p className="text-xs text-blue-600 mt-2 truncate">
                      {formatZar(finalPriceZar)} ZAR
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('dashboard.activeProperties')}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.activeProperties}</p>
                    <p className="text-xs text-purple-600 mt-2 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">{t('dashboard.activeLabel')}</span>
                      <span className="sm:hidden">{t('dashboard.activeLabel')}</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Профиль риелтора */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline">{t('dashboard.realtor.badge')}</span>
                  <span className="sm:hidden">{t('dashboard.profile')}</span>
                </h2>
                <Link
                  to="/profile/edit"
                  className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300 font-medium text-sm"
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('dashboard.edit')}</span>
                  <span className="sm:hidden">{t('dashboard.edit')}</span>
                </Link>
              </div>

              <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="relative self-start">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center border-2 border-blue-200">
                        <span className="text-blue-600 text-xl sm:text-2xl font-bold">
                          {profile?.full_name?.charAt(0) || 'R'}
                        </span>
                      </div>
                      {profile?.is_verified && (
                        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 truncate">{profile?.full_name}</h3>
                      <p className="text-gray-600 text-sm sm:text-lg mb-3 truncate">{profile?.email}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        {profile?.is_verified ? (
                          <div className="flex items-center text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="font-medium hidden sm:inline">{t('common.verified')}</span>
                            <span className="font-medium sm:hidden">{t('dashboard.verifiedShort')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-yellow-600 bg-yellow-50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="font-medium hidden sm:inline">{t('dashboard.needVerification')}</span>
                            <span className="font-medium sm:hidden">{t('dashboard.needVerification')}</span>
                          </div>
                        )}
                        {profile?.agency_name && (
                          <div className="flex items-center text-blue-600 bg-blue-50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                            <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="font-medium truncate">{profile.agency_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {profile?.is_verified && profile?.role === 'realtor' && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-3 sm:p-4 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-emerald-700 font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> {t('dashboard.partnerCertificate')}</p>
                          <p className="text-xs text-gray-700">{t('dashboard.partnerCertificateDesc')}</p>
                        </div>
                        <Link to="/partner-certificate" className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm">{t('dashboard.open')}</Link>
                      </div>
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.phone')}</p>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{profile.phone}</p>
                        </div>
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                      </div>
                    </div>
                  )}
                  {profile?.agency_name && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 sm:p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.agency')}</p>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{profile.agency_name}</p>
                        </div>
                        <Building className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      </div>
                    </div>
                  )}
                  {profile?.license_number && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 sm:p-4 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.license')}</p>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{profile.license_number}</p>
                        </div>
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {profile?.role !== 'buyer' && !profile?.is_verified && (
                <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-yellow-800 mb-2">{t('dashboard.verificationRequired')}</h4>
                      <p className="text-yellow-700 mb-4">
                        {t('dashboard.uploadDocuments')}
                      </p>
                      <Link
                        to="/verification"
                        className="inline-flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-medium shadow-lg"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {t('dashboard.passVerification')}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Быстрые действия */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-stretch gap-4 sm:gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 sm:p-6 text-white h-full flex flex-col">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold">{stats.totalProperties}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{t('dashboard.addPropertyBtn')}</h3>
                <p className="text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">{t('addProperty.subtitle')}</p>
                <Link
                  to="/properties/new"
                  className="mt-auto inline-flex items-center bg-white text-blue-600 px-3 sm:px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-all duration-300 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboard.addPropertyBtn')}
                </Link>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 sm:p-6 text-white h-full flex flex-col">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold">{stats.totalViews}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{t('dashboard.views')}</h3>
                <p className="text-green-100 mb-3 sm:mb-4 text-sm sm:text-base">{t('dashboard.viewsDesc')}</p>
                <div className="flex items-center text-green-100 text-sm mt-auto">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">+8% {t('dashboard.growthSinceLastMonth')}</span>
                  <span className="sm:hidden">+8%</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 sm:p-6 text-white h-full flex flex-col">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold">{formatPrice(stats.avgPrice)}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{t('dashboard.avgPrice')}</h3>
                <p className="text-purple-100 mb-3 sm:mb-4 text-sm sm:text-base">{t('dashboard.avgPriceDesc')}</p>
                <div className="flex items-center text-purple-100 text-sm mt-auto">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="truncate">{formatZar(stats.avgPrice * 1.07 * (prices ? (prices.bitcoin.zar / prices.bitcoin.usd) : 0))} ZAR</span>
                </div>
              </div>
            </div>

            {/* Мои сделки (риелтор) */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('dashboard.deals.title')}</h3>
                <span className="text-sm text-gray-600">{realtorSales.length}</span>
              </div>
              {realtorSales.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6 text-gray-600 flex items-center gap-3"><Zap className="w-4 h-4 text-gray-400" /> {t('dashboard.deals.empty')}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {realtorSales.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 h-full flex flex-col justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{s.property?.title || 'Объект'}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-700 border-blue-200">{t('dashboard.deal')}: {s.status}</span>
                          {s.invoice && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] border bg-yellow-50 text-yellow-700 border-yellow-200">{t('dashboard.invoice')}: {s.invoice.status}{s.invoice.amount_usdt ? ` · ${s.invoice.amount_usdt} USDT` : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <Link to={`/sales/${s.id}`} className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm shadow-sm">{t('dashboard.open')}</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Объекты */}
        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Home className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <span className="hidden sm:inline">{t('dashboard.myObjects')}</span>
                <span className="sm:hidden">{t('tabs.properties')}</span>
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">{t('dashboard.total')}: {properties.length}</span>
                <span className="text-green-600">{t('dashboard.activeCount')}: {stats.activeProperties}</span>
              </div>
            </div>

            {properties.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Home className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{t('dashboard.noProperties')}</h3>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">{t('dashboard.addFirstProperty')}</p>
                <Link
                  to="/properties/new"
                  className="inline-flex items-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg text-sm"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t('dashboard.addPropertyBtn')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {properties.map((property) => (
                  <div key={property.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                    {/* Изображение */}
                    <div className="relative h-40 sm:h-48 bg-gray-200">
                      {property.property_images?.[0] ? (
                        <img
                          src={property.property_images[0].image_url}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                          property.is_active 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-500 text-white'
                        }`}>
                          {property.is_active ? t('dashboard.status.active') : t('dashboard.status.inactive')}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/90 text-gray-900 shadow border">{formatPrice(property.price_usdt * 1.07)} USDT</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent" />
                    </div>

                    {/* Контент */}
                    <div className="p-4 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 truncate">{property.title}</h3>
                          <div className="flex items-center text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{property.address}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                            <span className="flex items-center">
                              <Bed className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {property.bedrooms}
                            </span>
                            <span className="flex items-center">
                              <Bath className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {property.bathrooms}
                            </span>
                            <span className="flex items-center">
                              <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {property.area_sqm} {t('dashboard.areaSqm')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Статистика */}
                      <div className="mb-3 sm:mb-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border p-3 bg-gradient-to-br from-gray-50 to-white text-center">
                          <div className="text-[11px] text-gray-500">{t('dashboard.col.views')}</div>
                          <div className="text-sm font-semibold text-gray-900">{property.views_count}</div>
                        </div>
                        <div className="rounded-xl border p-3 bg-gradient-to-br from-gray-50 to-white text-center">
                          <div className="text-[11px] text-gray-500">{t('dashboard.col.type')}</div>
                          <div className="text-sm font-semibold text-gray-900 truncate">{getPropertyTypeLabel(property.property_type)}</div>
                        </div>
                        <div className="rounded-xl border p-3 bg-gradient-to-br from-gray-50 to-white text-center">
                          <div className="text-[11px] text-gray-500">{t('dashboard.col.status')}</div>
                          <div className="text-sm font-semibold {property.is_active ? 'text-emerald-700' : 'text-gray-700'}">{property.is_active ? t('dashboard.status.active') : t('dashboard.status.inactive')}</div>
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Link
                            to={`/properties/${property.id}`}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-all duration-300 hover:scale-110"
                            title={t('dashboard.action.view')}
                          >
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Link>
                          <Link
                            to={`/properties/${property.id}/edit`}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 transition-all duration-300 hover:scale-110"
                            title={t('dashboard.action.edit')}
                          >
                            <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Link>
                          <button
                            onClick={() => togglePropertyStatus(property.id, property.is_active)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-yellow-600 transition-all duration-300 hover:scale-110"
                            title={property.is_active ? t('dashboard.action.deactivate') : t('dashboard.action.activate')}
                          >
                            <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${property.is_active ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteProperty(property.id)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-all duration-300 hover:scale-110"
                          title={t('dashboard.action.delete')}
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Аналитика */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="hidden sm:inline">{t('tabs.analytics')}</span>
              <span className="sm:hidden">{t('dashboard.views')}</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">{t('dashboard.analytics.views.title')}</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.totalViews')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                    </div>
                    <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.monthlyViews')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.monthlyViews}</p>
                    </div>
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">{t('dashboard.analytics.finance.title')}</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.metrics.totalValue')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatPrice(stats.totalValue)} USDT</p>
                    </div>
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600">{t('dashboard.avgPrice')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatPrice(stats.avgPrice)} USDT</p>
                    </div>
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Брони (риелтор) */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              {t('dashboard.bookings.realtorTitle')}
            </h2>
            {realtorBookings.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">
                {t('dashboard.bookings.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {realtorBookings.map((b) => {
                  const remainingMs = Math.max(0, new Date(b.expires_at).getTime() - Date.now());
                  const isActive = b.status === 'active' && remainingMs > 0;
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-all ring-1 ring-transparent hover:ring-blue-100">
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-gray-900 truncate">{b.property?.title || t('dashboard.property')}</div>
                        <div className="text-sm text-gray-600 mt-1 truncate">{t('dashboard.buyer')}: {b.buyer?.full_name || '—'}</div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{isActive ? t('dashboard.booking.active') : b.status === 'cancelled' ? t('dashboard.booking.cancelled') : t('dashboard.booking.expired')}</span>
                          {isActive && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{t('dashboard.booking.until')} {new Date(b.expires_at).toLocaleTimeString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <button onClick={() => cancelBooking(b.id)} className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm">{t('dashboard.booking.cancel')}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && (
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="hidden sm:inline">{t('tabs.settings')}</span>
              <span className="sm:hidden">{t('tabs.settings')}</span>
            </h2>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('dashboard.settings.profile')}</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <Link
                      to="/profile/edit"
                      className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        <span className="font-medium text-sm sm:text-base">{t('dashboard.settings.editProfile')}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    </Link>
                    {profile?.role !== 'buyer' && (
                      <Link
                        to="/verification"
                        className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          <span className="font-medium text-sm sm:text-base">{t('dashboard.settings.verification')}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('dashboard.settings.notifications.title')}</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        <span className="font-medium text-sm sm:text-base">{t('dashboard.settings.emailNotifications')}</span>
                      </div>
                      <div className="w-10 h-5 sm:w-12 sm:h-6 bg-blue-500 rounded-full relative">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full absolute right-1 top-1"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                        <span className="font-medium text-sm sm:text-base">{t('dashboard.settings.viewNotifications')}</span>
                      </div>
                      <div className="w-10 h-5 sm:w-12 sm:h-6 bg-gray-300 rounded-full relative">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full absolute left-1 top-1"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {profile?.role === 'realtor' && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">{t('dashboard.settings.payouts')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('dashboard.settings.withdrawMethod')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={async () => { await updatePayout('fiat'); }}
                          className={`px-4 py-2 rounded-xl border text-sm ${profile?.payout_method === 'fiat' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >{t('dashboard.settings.fiat')}</button>
                        <button
                          onClick={async () => { await updatePayout('usdt'); }}
                          className={`px-4 py-2 rounded-xl border text-sm ${profile?.payout_method === 'usdt' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >{t('dashboard.settings.usdt')}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('dashboard.settings.requisites')}</label>
                      <PayoutInput profile={profile} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-700">{t('dashboard.settings.commissionRate')}</label>
                      <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm">{t('dashboard.settings.perDealOnePercent')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Биллинг (риелтор) */}
        {profile?.role === 'realtor' && activeTab === 'overview' && (
          <div className="mt-8 space-y-6 sm:space-y-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('dashboard.dealCommissions')}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{t('dashboard.autoCalc')}</span>
              </div>
              <RealtorCommissions />
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('dashboard.payouts.title')}</h3>
              </div>
              <PayoutsPanel />
            </div>
            {/* Уведомления риелтора */}
            <div id="notifications" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold"><Bell className="w-4 h-4" /> {t('dashboard.notifications.title')}</div>
                  <button onClick={loadNotifications} className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50">{t('dashboard.notifications.refresh')}</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-600">{t('dashboard.notifications.empty')}</div>
                ) : (
                  <ul className="divide-y max-h-72 overflow-y-auto pr-1">
                    {notifications.map((n)=> {
                      // Translate notification titles and messages
                      let translatedTitle = n.title;
                      let translatedMessage = n.message;
                      
                      // Translate common notification titles
                      if (n.title === 'Статус сделки') {
                        translatedTitle = t('notification.dealStatus');
                      } else if (n.title === 'Обновление счета') {
                        translatedTitle = t('notification.invoiceUpdate');
                      } else if (n.title === 'Выставлен счет') {
                        translatedTitle = t('notification.invoiceIssuedBuyer');
                      } else if (n.title === 'Выставлен счет покупателю') {
                        translatedTitle = t('notification.invoiceIssuedRealtor');
                      }
                      
                      // Translate common notification messages
                      if (n.message === 'Ожидается оплата') {
                        translatedMessage = t('notification.paymentExpected');
                      } else if (n.message === 'Оплата в USDT: проверьте инструкции') {
                        translatedMessage = t('notification.paymentInstructions');
                      } else if (n.message && n.message.startsWith('Статус: ')) {
                        const status = n.message.replace('Статус: ', '');
                        translatedMessage = `${t('notification.status')}: ${status === 'paid' ? t('notification.statusPaid') : status === 'invoice_issued' ? t('notification.statusInvoiceIssued') : status === 'payment_pending' ? t('notification.statusPaymentPending') : status}`;
                      }
                      
                      return (
                        <li key={n.id} className="py-2 flex items-start gap-3">
                          <div className={`w-2 h-2 mt-1.5 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-blue-500 animate-pulse'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{translatedTitle}</div>
                            <div className="text-sm text-gray-700">{translatedMessage}</div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                          {!n.is_read && (
                            <button onClick={()=>markRead(n.id)} className="text-sm px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50">{t('dashboard.notifications.markRead')}</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="text-sm text-gray-700">{t('dashboard.webpush.enable')}</div>
                <EnablePushCard />
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {/* ... existing content ... */}
          {activeTab === 'analytics' && (

                          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-900 font-semibold"><BarChart3 className="w-4 h-4" /> {t('dashboard.funnelByDay')}</div>
                <button onClick={exportFunnelCSV} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border"><Download className="w-4 h-4" /> {t('common.csv')}</button>
              </div>
              {analyticsLoading ? (
                <div className="py-10 text-center text-gray-600">{t('common.loading')}</div>
              ) : funnel.length === 0 ? (
                <div className="py-10 text-center text-gray-600">{t('common.noData')}</div>
              ) : (
                <div className="h-56 md:h-64 flex items-end gap-2">
                  {funnel.slice(-30).map((d) => (
                    <div key={d.day} className="flex-1 h-full flex flex-col justify-end items-center">
                      <div className="w-full bg-gradient-to-t from-blue-100 to-blue-500 rounded-t" style={{ height: `${Math.max(6, (Number(d.views||0)/maxVal)*100)}%` }} />
                      <div className="text-[10px] text-gray-500 mt-1">{new Date(d.day).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit' })}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border p-2">
                  <div className="text-[10px] text-gray-500">{t('dashboard.col.views')}</div>
                  <div className="text-sm font-semibold">{funnel.reduce((s,x)=>s+Number(x.views||0),0)}</div>
                </div>
                <div className="rounded-xl border p-2">
                  <div className="text-[10px] text-gray-500">{t('dashboard.col.bookings')}</div>
                  <div className="text-sm font-semibold">{funnel.reduce((s,x)=>s+Number(x.bookings||0),0)}</div>
                </div>
                <div className="rounded-xl border p-2">
                  <div className="text-[10px] text-gray-500">{t('dashboard.col.sales')}</div>
                  <div className="text-sm font-semibold">{funnel.reduce((s,x)=>s+Number(x.sales||0),0)}</div>
                </div>
                <div className="rounded-xl border p-2">
                  <div className="text-[10px] text-gray-500">{t('dashboard.col.payments')}</div>
                  <div className="text-sm font-semibold">{funnel.reduce((s,x)=>s+Number(x.payments||0),0)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-900 font-semibold"><BarChart3 className="w-4 h-4" /> {t('dashboard.revenue.title')}</div>
                {rev && <button onClick={exportRevenueCSV} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border"><Download className="w-4 h-4" /> {t('common.csv')}</button>}
              </div>
              {profile?.role !== 'realtor' ? (
                <div className="text-sm text-gray-600">{t('dashboard.revenue.realtorsOnly')}</div>
              ) : rev ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-gray-600">{t('dashboard.revenue.totalTurnover')}</span><span className="font-semibold">{rev.paid_turnover_usdt} USDT</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">{t('dashboard.revenue.commissions')}</span><span className="font-semibold">{rev.commissions_usdt} USDT</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">{t('dashboard.revenue.paidInvoices')}</span><span className="font-semibold">{rev.paid_invoices}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">{t('dashboard.revenue.totalSales')}</span><span className="font-semibold">{rev.total_sales_requests}</span></div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">{t('common.noData')}</div>
              )}
            </div>
                      </div>
            )}
            {/* ... existing content ... */}
          </div>
        </div>
    </div>
  );
}

// Покупательский виджет счета: ищет последний счет по сделкам пользователя
const BuyerInvoiceCard: React.FC<{ propertyTitle?: string }> = ({ propertyTitle }) => {
  const [inv, setInv] = React.useState<any | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*, sales:sales_requests(buyer_id, property:properties(title))')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && data.sales?.buyer_id === user.id) setInv(data);
    })();
  }, [user]);
  if (!inv) return null;
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="font-semibold text-blue-900 mb-1">{t('dashboard.invoice')}</div>
      <div className="text-sm text-blue-800">{t('dashboard.property')}: {inv.sales?.property?.title || propertyTitle || '—'}</div>
      <div className="text-sm text-blue-800">{t('dashboard.amount')}: {inv.amount_usdt} USDT</div>
      <div className="text-sm text-blue-800">{t('dashboard.status')}: {inv.status}</div>
      <div className="mt-2 text-xs text-gray-800 bg-white rounded-lg p-3 border border-blue-200 max-h-24 overflow-hidden">{inv.payment_instructions}</div>
    </div>
  );
};

const RealtorCommissions: React.FC = () => {
  const [rows, setRows] = React.useState<any[]>([]);
  const [totals, setTotals] = React.useState<{sum:number; comm:number; ready:number; paid:number}>({sum:0, comm:0, ready:0, paid:0});
  const { user } = useAuth();
  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('sales_commissions')
        .select('*, sale:sales_requests(property:properties(title))')
        .eq('realtor_id', user.id)
        .order('created_at', { ascending: false });
      const list = data || [];
      setRows(list);
      const sum = list.reduce((a:any,b:any)=>a+Number(b.amount_usdt||0),0);
      const comm = list.reduce((a:any,b:any)=>a+Number(b.commission_usdt||0),0);
      const ready = list.filter((r:any)=>r.status==='ready').reduce((a:any,b:any)=>a+Number(b.commission_usdt||0),0);
      const paid = list.filter((r:any)=>r.status==='paid').reduce((a:any,b:any)=>a+Number(b.commission_usdt||0),0);
      setTotals({sum,comm,ready,paid});
    })();
  }, [user]);
  const { t } = useLanguage();
  if (rows.length === 0) return <div className="text-gray-600 flex items-center gap-2"><Wallet className="w-4 h-4 text-gray-400" /> {t('dashboard.noDeals')}</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="text-xs text-gray-600">{t('dashboard.totalTurnover')}</div>
          <div className="text-lg font-bold text-gray-900">{totals.sum.toFixed(2)} USDT</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="text-xs text-gray-600">{t('dashboard.totalCommissions')}</div>
          <div className="text-lg font-bold text-gray-900">{totals.comm.toFixed(2)} USDT</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-yellow-50 to-white p-4">
          <div className="text-xs text-gray-600">{t('dashboard.readyForPayment')}</div>
          <div className="text-lg font-bold text-gray-900">{totals.ready.toFixed(2)} USDT</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-purple-50 to-white p-4">
          <div className="text-xs text-gray-600">{t('dashboard.paid')}</div>
          <div className="text-lg font-bold text-gray-900">{totals.paid.toFixed(2)} USDT</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2">{t('dashboard.sale')}</th>
            <th className="py-2">{t('dashboard.amount')}</th>
            <th className="py-2">{t('dashboard.commission')}</th>
            <th className="py-2">{t('dashboard.status')}</th>
            <th className="py-2">{t('dashboard.date')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2">{r.sale?.property?.title || r.sales_request_id}</td>
              <td className="py-2">{r.amount_usdt} USDT</td>
              <td className="py-2">{r.commission_usdt} USDT</td>
              <td className="py-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] border ${r.status==='ready'?'bg-yellow-50 text-yellow-700 border-yellow-200': r.status==='paid'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-gray-50 text-gray-700 border-gray-200'}`}>{r.status}</span>
              </td>
              <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PayoutsPanel: React.FC = () => {
  const { t } = useLanguage();
  const [rows, setRows] = React.useState<any[]>([]);
  const [amount, setAmount] = React.useState('');
  const { user, profile } = useAuth();
  const reload = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payouts')
      .select('*')
      .eq('realtor_id', user.id)
      .order('created_at', { ascending: false });
    setRows(data || []);
  };
  React.useEffect(() => { reload(); }, [user]);
  const createPayout = async () => {
    if (!user) return;
    const value = Number(amount);
    if (!value || value <= 0) return alert(t('dashboard.payouts.amountToWithdraw'));
    const method = profile?.payout_method || 'usdt';
    const details = profile?.payout_details || '';
    const { error } = await supabase
      .from('payouts')
      .insert({ realtor_id: user.id, amount_usdt: value, method, details });
    if (!error) {
      setAmount('');
      reload();
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-sm text-gray-700">{t('dashboard.payouts.amountToWithdraw')}</label>
          <input value={amount} onChange={(e)=>setAmount(e.target.value)} type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-gray-200" />
        </div>
        <button onClick={createPayout} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">{t('dashboard.payouts.createRequest')}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2">{t('dashboard.amount')}</th>
              <th className="py-2">{t('dashboard.method')}</th>
              <th className="py-2">{t('dashboard.status')}</th>
              <th className="py-2">{t('dashboard.date')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="py-3 text-gray-600">{t('dashboard.table.noRequests')}</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.amount_usdt} USDT</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] border ${r.method==='usdt'?'bg-blue-50 text-blue-700 border-blue-200':'bg-gray-50 text-gray-700 border-gray-200'}`}>{r.method?.toUpperCase() || '—'}</span>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] border ${r.status==='approved'?'bg-blue-50 text-blue-700 border-blue-200': r.status==='paid'?'bg-emerald-50 text-emerald-700 border-emerald-200': r.status==='rejected'?'bg-red-50 text-red-700 border-red-200':'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{r.status}</span>
                  </td>
                  <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EnablePushCard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = React.useState<'idle'|'ok'|'err'>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string>('');
  const onEnable = async () => {
    if (!user) return;
    try {
      setErrorMsg('');
      const ok = await (await import('../lib/push')).enableWebPush(user.id);
      setStatus(ok ? 'ok' : 'err');
      if (!ok) setErrorMsg(t('common.error'));
    } catch (e: any) { setStatus('err'); setErrorMsg(e?.message || t('common.error')); }
  };
  return (
    <div className="mt-2">
      <button onClick={onEnable} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">{t('dashboard.webpush.enable')}</button>
      {status==='ok' && <div className="text-sm text-emerald-700 mt-2">{t('favorites.loading').replace('Загрузка избранного...','Подписка оформлена')}</div>}
      {status==='err' && <div className="text-sm text-red-700 mt-2">{errorMsg || t('common.error')}</div>}
    </div>
  );
};

// компонент истории просмотров
const BuyerViewHistory: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_view_history')
        .select('created_at, property:properties(id,title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setRows(data || []);
    })();
  }, [user]);
  const { t } = useLanguage();
  if (!rows.length) return <div className="bg-white rounded-2xl border border-gray-100 p-4 text-gray-600">{t('common.notFound')}</div>;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.created_at} className="flex items-center justify-between">
            <span className="truncate">{r.property?.title || t('dashboard.property')}</span>
            <Link to={`/properties/${r.property?.id}`} className="text-blue-700">{t('dashboard.open')}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};


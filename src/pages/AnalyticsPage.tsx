import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Eye,
  Calendar,
  ShoppingBag,
  CreditCard,
  Activity,
  ChevronUp,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  Users,
  Target,
  Award
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function AnalyticsPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [start, setStart] = useState<string>(() => new Date(Date.now() - 29*86400000).toISOString().slice(0,10));
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [revRows, setRevRows] = useState<any[]>([]);
  const [viewDaily, setViewDaily] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'bookings' | 'sales' | 'payments'>('views');

  const isRealtor = profile?.role === 'realtor';
  const isLovePay = profile?.role === 'lovepay';

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoading(true);
      try {
        // Funnel
        if (isRealtor) {
          const { data } = await supabase
            .from('v_realtor_funnel_daily')
            .select('*')
            .eq('realtor_id', profile.id)
            .gte('day', start)
            .lte('day', end)
            .order('day', { ascending: true });
          setFunnel(data || []);
        } else {
          const { data } = await supabase
            .from('v_funnel_daily')
            .select('*')
            .gte('day', start)
            .lte('day', end)
            .order('day', { ascending: true });
          setFunnel(data || []);
        }
        // Revenue table: realtor self or lovepay all
        if (isRealtor) {
          const { data } = await supabase
            .from('v_revenue_and_commissions')
            .select('*')
            .eq('realtor_id', profile.id);
          setRevRows(data || []);
        } else if (isLovePay) {
          const { data } = await supabase
            .from('v_revenue_and_commissions')
            .select('*');
          setRevRows(data || []);
        } else {
          setRevRows([]);
        }
        // Raw data for tops (client-side aggregation)
        const { data: vd } = await supabase
          .from('property_view_daily')
          .select('property_id,day,views, properties(title)')
          .gte('day', start)
          .lte('day', end);
        setViewDaily(vd || []);
        const { data: bk } = await supabase
          .from('bookings')
          .select('property_id,created_at, properties(title)')
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(new Date(end).getTime()+86399999).toISOString());
        setBookings(bk || []);
        const { data: sl } = await supabase
          .from('sales_requests')
          .select('property_id,created_at, properties(title)')
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(new Date(end).getTime()+86399999).toISOString());
        setSales(sl || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile, start, end]);

  const funnelTotals = useMemo(() => ({
    views: funnel.reduce((s,x)=>s+Number(x.views||0),0),
    bookings: funnel.reduce((s,x)=>s+Number(x.bookings||0),0),
    sales: funnel.reduce((s,x)=>s+Number(x.sales||0),0),
    payments: funnel.reduce((s,x)=>s+Number(x.payments||0),0),
  }), [funnel]);

  const maxVal = useMemo(() => {
    const metric = selectedMetric;
    return funnel.reduce((m,x)=>Math.max(m, Number(x[metric]||0)), 0) || 1;
  }, [funnel, selectedMetric]);

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const previousPeriodTotals = useMemo(() => {
    const midpoint = Math.floor(funnel.length / 2);
    const firstHalf = funnel.slice(0, midpoint);
    const secondHalf = funnel.slice(midpoint);
    
    return {
      views: {
        prev: firstHalf.reduce((s,x)=>s+Number(x.views||0),0),
        curr: secondHalf.reduce((s,x)=>s+Number(x.views||0),0),
      },
      bookings: {
        prev: firstHalf.reduce((s,x)=>s+Number(x.bookings||0),0),
        curr: secondHalf.reduce((s,x)=>s+Number(x.bookings||0),0),
      },
      sales: {
        prev: firstHalf.reduce((s,x)=>s+Number(x.sales||0),0),
        curr: secondHalf.reduce((s,x)=>s+Number(x.sales||0),0),
      },
      payments: {
        prev: firstHalf.reduce((s,x)=>s+Number(x.payments||0),0),
        curr: secondHalf.reduce((s,x)=>s+Number(x.payments||0),0),
      },
    };
  }, [funnel]);

  // Tops
  const topViews = useMemo(() => {
    const map = new Map<string, { title: string; views: number }>();
    for (const r of viewDaily) {
      const id = r.property_id;
      const title = r.properties?.title || t('map.object');
      const cur = map.get(id) || { title, views: 0 };
      cur.views += Number(r.views||0);
      map.set(id, cur);
    }
    return Array.from(map.entries()).map(([property_id, v]) => ({ property_id, ...v })).sort((a,b)=>b.views-a.views).slice(0,10);
  }, [viewDaily]);
  
  const topBookings = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const r of bookings) {
      const id = r.property_id; const title = r.properties?.title || t('map.object');
      const cur = map.get(id) || { title, count: 0 }; cur.count += 1; map.set(id, cur);
    }
    return Array.from(map.entries()).map(([property_id, v]) => ({ property_id, ...v })).sort((a,b)=>b.count-a.count).slice(0,10);
  }, [bookings]);
  
  const topSales = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const r of sales) {
      const id = r.property_id; const title = r.properties?.title || t('map.object');
      const cur = map.get(id) || { title, count: 0 }; cur.count += 1; map.set(id, cur);
    }
    return Array.from(map.entries()).map(([property_id, v]) => ({ property_id, ...v })).sort((a,b)=>b.count-a.count).slice(0,10);
  }, [sales]);

  const exportCSV = (filename: string, headers: string[], rows: (string|number)[][]) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      const esc = s.replace(/"/g,'""');
      return /[",\n]/.test(esc) ? `"${esc}"` : esc;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const exportXLS = (filename: string, headers: string[], rows: (string|number)[][]) => {
    // Excel XML 2003 (opens in Excel), .xls
    const xmlHeader = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>';
    const cols = headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('');
    const body = rows.map(r => `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')}</Row>`).join('');
    const xls = `${xmlHeader}\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Sheet1"><Table><Row>${cols}</Row>${body}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const exportFunnel = (type: 'csv'|'xls') => {
    const headers = ['day','views','bookings','sales','payments'];
    const rows = funnel.map(x => [x.day, x.views, x.bookings, x.sales, x.payments]);
    if (type==='csv') exportCSV(`funnel_${start}_${end}.csv`, headers, rows); else exportXLS(`funnel_${start}_${end}.xls`, headers, rows);
  };
  
  const exportRevenue = (type: 'csv'|'xls') => {
    if (!revRows.length) return;
    const headers = ['realtor_id','paid_turnover_usdt','commissions_usdt','paid_invoices','total_sales_requests'];
    const rows = revRows.map(r => [r.realtor_id, r.paid_turnover_usdt, r.commissions_usdt, r.paid_invoices, r.total_sales_requests]);
    if (type==='csv') exportCSV(`revenue_${start}_${end}.csv`, headers, rows); else exportXLS(`revenue_${start}_${end}.xls`, headers, rows);
  };

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{t('analytics.login')}</p>
      </div>
    </div>
  );

  const metricColors = {
    views: 'from-blue-500 to-cyan-500',
    bookings: 'from-purple-500 to-pink-500',
    sales: 'from-green-500 to-emerald-500',
    payments: 'from-orange-500 to-red-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link 
              to="/" 
              className="p-3 bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('analytics.title')}
              </h1>
              <p className="text-gray-600 mt-1">
                {isRealtor ? t('analytics.realtorSubtitle') : isLovePay ? t('analytics.adminSubtitle') : t('analytics.generalSubtitle')}
              </p>
            </div>
          </div>

          {/* Date Filter with improved design */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-gray-900">{t('analytics.period')}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <input 
                  type="date" 
                  value={start} 
                  onChange={(e)=>setStart(e.target.value)} 
                  className="bg-transparent outline-none text-gray-700 font-medium" 
                />
                <span className="text-gray-400 px-2">—</span>
                <input 
                  type="date" 
                  value={end} 
                  onChange={(e)=>setEnd(e.target.value)} 
                  className="bg-transparent outline-none text-gray-700 font-medium" 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={()=>{ setStart(new Date(Date.now()-6*86400000).toISOString().slice(0,10)); setEnd(new Date().toISOString().slice(0,10)); }} 
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 font-medium hover:shadow-md transition-all"
                >
                  {t('analytics.last7')}
                </button>
                <button 
                  onClick={()=>{ setStart(new Date(Date.now()-29*86400000).toISOString().slice(0,10)); setEnd(new Date().toISOString().slice(0,10)); }} 
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 font-medium hover:shadow-md transition-all"
                >
                  {t('analytics.last30')}
                </button>
                <button 
                  onClick={()=>{ setStart(new Date(Date.now()-89*86400000).toISOString().slice(0,10)); setEnd(new Date().toISOString().slice(0,10)); }} 
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 font-medium hover:shadow-md transition-all"
                >
                  {t('analytics.last90')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { 
              key: 'views', 
              icon: Eye, 
              label: t('analytics.views'), 
              value: funnelTotals.views,
              trend: calculateTrend(previousPeriodTotals.views.curr, previousPeriodTotals.views.prev),
              color: 'blue'
            },
            { 
              key: 'bookings', 
              icon: ShoppingBag, 
              label: t('analytics.bookings'), 
              value: funnelTotals.bookings,
              trend: calculateTrend(previousPeriodTotals.bookings.curr, previousPeriodTotals.bookings.prev),
              color: 'purple'
            },
            { 
              key: 'sales', 
              icon: DollarSign, 
              label: t('analytics.sales'), 
              value: funnelTotals.sales,
              trend: calculateTrend(previousPeriodTotals.sales.curr, previousPeriodTotals.sales.prev),
              color: 'green'
            },
            { 
              key: 'payments', 
              icon: CreditCard, 
              label: t('analytics.payments'), 
              value: funnelTotals.payments,
              trend: calculateTrend(previousPeriodTotals.payments.curr, previousPeriodTotals.payments.prev),
              color: 'orange'
            },
          ].map((item) => {
            const Icon = item.icon;
            const trend = parseFloat(item.trend as string);
            const isPositive = trend >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            
            return (
              <button
                key={item.key}
                onClick={() => setSelectedMetric(item.key as any)}
                className={`relative overflow-hidden bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-xl hover:scale-105 ${
                  selectedMetric === item.key 
                    ? `border-${item.color}-500 shadow-lg` 
                    : 'border-gray-100'
                }`}
              >
                {selectedMetric === item.key && (
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-${item.color}-400 to-${item.color}-600 opacity-10 rounded-full -mr-10 -mt-10`} />
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-${item.color}-100 to-${item.color}-200`}>
                    <Icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="font-semibold">{Math.abs(trend)}%</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-gray-600 text-sm mb-1">{item.label}</p>
                  <p className="text-3xl font-black text-gray-900">
                    {loading ? '...' : item.value.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">{t('analytics.funnelByDay')}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={()=>exportFunnel('csv')} 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">CSV</span>
                </button>
                <button 
                  onClick={()=>exportFunnel('xls')} 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Excel</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">{t('analytics.loading')}</p>
                </div>
              </div>
            ) : funnel.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('analytics.noData')}</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="h-64 flex items-end gap-1">
                  {funnel.map((d, index) => {
                    const value = Number(d[selectedMetric] || 0);
                    const height = Math.max(2, (value / maxVal) * 100);
                    const isToday = d.day === new Date().toISOString().slice(0,10);
                    
                    return (
                      <div 
                        key={d.day} 
                        className="flex-1 flex flex-col justify-end items-center group"
                      >
                        <div className="relative w-full">
                          <div 
                            className={`w-full bg-gradient-to-t ${metricColors[selectedMetric]} rounded-t-lg transition-all hover:opacity-80 cursor-pointer`}
                            style={{ height: `${height * 2.4}px` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              {value.toLocaleString()}
                            </div>
                          </div>
                          {isToday && (
                            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                              Today
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-2 -rotate-45 origin-top-left">
                          {new Date(d.day).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Revenue Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">{t('analytics.revenueTitle')}</h2>
              </div>
              {revRows.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={()=>exportRevenue('csv')} 
                    className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {isRealtor ? (
              revRows.length ? (
                <div className="space-y-4">
                  {[
                    { label: t('analytics.turnoverPaid'), value: revRows[0].paid_turnover_usdt, icon: DollarSign, color: 'green' },
                    { label: t('analytics.commissions'), value: revRows[0].commissions_usdt, icon: Award, color: 'blue' },
                    { label: t('analytics.paidInvoices'), value: revRows[0].paid_invoices, icon: CreditCard, color: 'purple' },
                    { label: t('analytics.totalDeals'), value: revRows[0].total_sales_requests, icon: Target, color: 'orange' },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                            <Icon className={`w-4 h-4 text-${item.color}-600`} />
                          </div>
                          <span className="text-gray-700 font-medium">{item.label}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {typeof item.value === 'number' && item.label.includes('USDT') 
                            ? `${item.value.toLocaleString()} USDT`
                            : item.value
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('analytics.noData')}</p>
                </div>
              )
            ) : isLovePay ? (
              revRows.length ? (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="py-2 text-gray-600 font-medium">{t('analytics.table.realtor')}</th>
                        <th className="py-2 text-gray-600 font-medium">{t('analytics.table.turnover')}</th>
                        <th className="py-2 text-gray-600 font-medium">{t('analytics.table.commissions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revRows.slice(0, 5).map((r)=> (
                        <tr key={r.realtor_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{r.realtor_id.slice(0, 8)}...</td>
                          <td className="py-3 text-gray-700">{r.paid_turnover_usdt}</td>
                          <td className="py-3 text-gray-700">{r.commissions_usdt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('analytics.noData')}</p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('analytics.onlyFor')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              title: t('analytics.topViews'), 
              data: topViews, 
              key: 'views',
              icon: Eye,
              color: 'blue',
              gradient: 'from-blue-500 to-cyan-500'
            },
            { 
              title: t('analytics.topBookings'), 
              data: topBookings, 
              key: 'count',
              icon: ShoppingBag,
              color: 'purple',
              gradient: 'from-purple-500 to-pink-500'
            },
            { 
              title: t('analytics.topSales'), 
              data: topSales, 
              key: 'count',
              icon: Target,
              color: 'green',
              gradient: 'from-green-500 to-emerald-500'
            },
          ].map((list, listIndex) => {
            const Icon = list.icon;
            return (
              <div key={listIndex} className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${list.gradient}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{list.title}</h3>
                </div>
                
                {list.data.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">{t('analytics.noData')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {list.data.slice(0, 5).map((item: any, index) => {
                      const isTop3 = index < 3;
                      return (
                        <div 
                          key={item.property_id} 
                          className={`flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-md ${
                            isTop3 ? 'bg-gradient-to-r from-gray-50 to-gray-100' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="text-gray-700 font-medium truncate max-w-[180px]">
                              {item.title}
                            </span>
                          </div>
                          <span className={`font-bold ${isTop3 ? 'text-lg' : 'text-base'} text-gray-900`}>
                            {item[list.key]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
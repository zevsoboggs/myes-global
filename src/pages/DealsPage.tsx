import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Filter, Search, Zap } from 'lucide-react';
import { getSaleStatusLabel, getInvoiceStatusLabel, formatUsdt } from '../lib/status';
import { useAuth } from '../hooks/useAuth';

export function DealsPage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<'all'|'pending'|'invoice_issued'|'payment_pending'|'paid'|'cancelled'>('all');

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('sales_requests')
          .select('id,status,created_at, property:properties(title), invoice:invoices(status,amount_usdt)')
          .order('created_at', { ascending: false });

        // Filter for lawyers to show only their assigned deals
        if (profile?.role === 'lawyer' && user?.id) {
          query = query.eq('lawyer_id', user.id);
        }

        const { data } = await query;
        setRows(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile]);

  const filtered = React.useMemo(() => {
    let arr = [...rows];
    if (status !== 'all') arr = arr.filter(r => r.status === status);
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter(r => String(r.id).toLowerCase().includes(s) || String(r.property?.title || '').toLowerCase().includes(s));
    }
    return arr;
  }, [rows, q, status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Сделки</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-gray-500" />
              <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск по ID или объекту" className="w-full px-3 py-2 rounded-xl border border-gray-200" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm">
                <option value="all">Все статусы</option>
                <option value="pending">pending</option>
                <option value="invoice_issued">invoice_issued</option>
                <option value="payment_pending">payment_pending</option>
                <option value="paid">paid</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600">Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-600 flex items-center justify-center gap-2"><Zap className="w-4 h-4 text-gray-400" /> Ничего не найдено</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 h-full flex flex-col justify-between">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">#{s.id.slice(0,8)}</div>
                  <div className="font-semibold text-gray-900 truncate">{s.property?.title || 'Объект'}</div>
                  <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-700 border-blue-200">{getSaleStatusLabel(s.status)}</span>
                    {s.invoice && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] border bg-yellow-50 text-yellow-700 border-yellow-200">Счёт: {getInvoiceStatusLabel(s.invoice.status)}{s.invoice.amount_usdt ? ` · ${formatUsdt(s.invoice.amount_usdt)}` : ''}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <Link to={`/sales/${s.id}`} className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm shadow-sm">Открыть</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
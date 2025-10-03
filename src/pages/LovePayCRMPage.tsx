import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Timer, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS: Array<'pending'|'invoice_issued'|'payment_pending'|'paid'|'cancelled'> = [
  'pending','invoice_issued','payment_pending','paid','cancelled'
];

export function LovePayCRMPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    if (!profile || profile.role !== 'lovepay') return;
    setLoading(true);
    const { data } = await supabase
      .from('sales_requests')
      .select(`*, property:properties(id,title,address), buyer:profiles(full_name,email), realtor:profiles(full_name,email,agency_name), invoice:invoices(*)`)
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, [profile?.role]);

  const byStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    STATUS.forEach(s => map[s] = []);
    rows.forEach(r => { (map[r.status] ||= []).push(r); });
    return map;
  }, [rows]);

  const isOverSLA = (r: any) => {
    const created = new Date(r.created_at).getTime();
    const now = Date.now();
    const hours = (now - created) / 36e5;
    if (r.status === 'pending' && hours > 24) return true;
    if (r.status === 'invoice_issued' && hours > 48) return true;
    if (r.status === 'payment_pending' && hours > 72) return true;
    return false;
  };

  const setStatus = async (id: string, status: typeof STATUS[number]) => {
    await supabase.from('sales_requests').update({ status }).eq('id', id);
    await load();
  };

  if (loading) return <div className="p-6 text-gray-600 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {STATUS.map(st => (
        <div key={st} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col max-h-[75vh]">
          <div className="p-3 border-b font-semibold text-gray-900 flex items-center justify-between">
            <span>{st}</span>
            <span className="text-xs text-gray-500">{byStatus[st]?.length || 0}</span>
          </div>
          <div className="p-2 overflow-auto space-y-2">
            {(byStatus[st]||[]).map((r) => (
              <div key={r.id} className={`rounded-xl border p-3 text-sm ${isOverSLA(r) ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-gray-900 truncate">{r.property?.title || 'Объект'}</div>
                  {isOverSLA(r) && <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><Timer className="w-3.5 h-3.5" /> SLA</span>}
                </div>
                <div className="text-xs text-gray-600 truncate">{r.property?.address}</div>
                <div className="text-xs text-gray-500 mt-1 truncate">Покупатель: {r.buyer?.full_name || '—'}</div>
                <div className="text-xs text-gray-500 truncate">Риелтор: {r.realtor?.full_name || '—'}</div>
                {typeof r.invoice?.amount_usdt === 'number' && (
                  <div className="text-xs text-gray-700 mt-1">Счет: {r.invoice.amount_usdt} USDT ({r.invoice.status || '—'})</div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Link to={`/lovepay/requests`} className="px-2 py-1 rounded-lg border text-xs">Открыть</Link>
                  {st !== 'paid' && st !== 'cancelled' && (
                    <>
                      {st === 'pending' && (
                        <button onClick={()=>setStatus(r.id, 'invoice_issued')} className="px-2 py-1 rounded-lg border text-xs">Выставлен счет</button>
                      )}
                      {st === 'invoice_issued' && (
                        <button onClick={()=>setStatus(r.id, 'payment_pending')} className="px-2 py-1 rounded-lg border text-xs">Ожидание оплаты</button>
                      )}
                      {st === 'payment_pending' && (
                        <button onClick={()=>setStatus(r.id, 'paid')} className="px-2 py-1 rounded-lg border text-xs">Оплачено</button>
                      )}
                      <button onClick={()=>setStatus(r.id, 'cancelled')} className="px-2 py-1 rounded-lg border text-xs">Отменить</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {(byStatus[st]||[]).length === 0 && (
              <div className="text-xs text-gray-500 p-3">Нет записей</div>
            )}
          </div>
        </div>
      ))}
      {/* Быстрый переход к аналитике */}
      <div className="md:col-span-5">
        <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Для подробных сумм и трендов используйте раздел «Аналитика»</span>
        </div>
      </div>
    </div>
  );
} 
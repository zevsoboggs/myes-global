import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function MyesAnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(()=>{
    (async () => {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: properties } = await supabase.from('properties').select('*', { count: 'exact', head: true });
      const { count: sales } = await supabase.from('sales_requests').select('*', { count: 'exact', head: true });
      const { data: invoicesPaid } = await supabase.from('invoices').select('amount_usdt').eq('status','paid');
      const revenue = (invoicesPaid||[]).reduce((s:any,r:any)=> s + Number(r.amount_usdt||0), 0);
      setMetrics({ users: users||0, properties: properties||0, sales: sales||0, revenue });
    })();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-600">Пользователи</div><div className="text-2xl font-bold">{metrics?.users ?? '—'}</div></div>
      <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-600">Объекты</div><div className="text-2xl font-bold">{metrics?.properties ?? '—'}</div></div>
      <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-600">Сделки</div><div className="text-2xl font-bold">{metrics?.sales ?? '—'}</div></div>
      <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-600">Выручка (USDT)</div><div className="text-2xl font-bold">{metrics?.revenue ?? '—'}</div></div>
    </div>
  );
} 
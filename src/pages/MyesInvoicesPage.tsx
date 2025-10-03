import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpDown, Search } from 'lucide-react';

export function MyesInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<'all'|'created'|'paid'|'expired'|'cancelled'>('all');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'created_at'|'status'|'amount'>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('id, sales_request_id, amount_usdt, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const view = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    const arr = rows
      .filter(r => status==='all' ? true : r.status === status)
      .filter(r => !qq || (r.id||'').toLowerCase().includes(qq) || (r.sales_request_id||'').toLowerCase().includes(qq));
    arr.sort((a:any,b:any)=>{
      let va:any=0, vb:any=0;
      if (sortKey==='created_at'){ va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
      else if (sortKey==='status'){ va = (a.status||'').localeCompare(b.status||''); vb=0; }
      else if (sortKey==='amount'){ va = Number(a.amount_usdt||0); vb = Number(b.amount_usdt||0); }
      const d = va>vb?1:va<vb?-1:0; return sortDir==='asc'?d:-d;
    });
    return arr;
  }, [rows, status, q, sortKey, sortDir]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-500" />
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск по ID/ID сделки" className="bg-transparent outline-none" />
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select value={sortKey} onChange={(e)=>setSortKey(e.target.value as any)} className="bg-transparent outline-none">
              <option value="created_at">По дате</option>
              <option value="status">По статусу</option>
              <option value="amount">По сумме</option>
            </select>
            <button onClick={()=>setSortDir(d=> d==='asc'?'desc':'asc')} className="ml-1 px-2 py-0.5 rounded-lg border">{sortDir==='asc'?'ASC':'DESC'}</button>
          </div>
          <div className="flex items-center gap-1">
            {(['all','created','paid','expired','cancelled'] as const).map(s=>(
              <button key={s} onClick={()=>setStatus(s)} className={`px-2.5 py-1 rounded-lg text-xs border ${status===s?'bg-blue-50 text-blue-700 border-blue-200':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-600">{view.length} найдено</div>
      </div>
      <div className="divide-y">
        {loading ? (<div className="p-6 text-gray-600">Загрузка…</div>) : view.length===0 ? (<div className="p-6 text-gray-600">Ничего не найдено</div>) : view.map(r => (
          <div key={r.id} className="p-3 text-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">Счёт {r.id} • <span className="text-xs font-normal text-gray-600">{r.status}</span></div>
              <div className="text-xs text-gray-600 truncate">Сделка: {r.sales_request_id}</div>
              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="shrink-0 text-xs text-gray-700">{r.amount_usdt} USDT</div>
          </div>
        ))}
      </div>
    </div>
  );
} 
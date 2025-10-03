import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

export function MyesLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<'all'|'new'|'in_progress'|'won'|'lost'>('all');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leads')
      .select('id, status, created_at, realtor:profiles!leads_realtor_id_fkey(full_name), buyer:profiles!leads_buyer_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const view = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    return rows
      .filter(r => status==='all'? true : r.status === status)
      .filter(r => !qq || (r.id||'').toLowerCase().includes(qq) || (r.realtor?.full_name||'').toLowerCase().includes(qq) || (r.buyer?.full_name||'').toLowerCase().includes(qq));
  }, [rows, status, q]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-500" />
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск по ID/участникам" className="bg-transparent outline-none" />
          </div>
          <div className="flex items-center gap-1">
            {(['all','new','in_progress','won','lost'] as const).map(s=>(
              <button key={s} onClick={()=>setStatus(s)} className={`px-2.5 py-1 rounded-lg text-xs border ${status===s?'bg-blue-50 text-blue-700 border-blue-200':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-600">{view.length} найдено</div>
      </div>
      <div className="divide-y">
        {loading ? (<div className="p-6 text-gray-600">Загрузка…</div>) : view.length===0 ? (<div className="p-6 text-gray-600">Ничего не найдено</div>) : view.map(r => (
          <div key={r.id} className="p-3 text-sm flex items-center justify_between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{r.realtor?.full_name || 'Риелтор'} • <span className="text-xs font-normal text-gray-600">{require('../lib/status').getLeadStatusLabel(r.status)}</span></div>
              <div className="text-xs text-gray-600 truncate">Покупатель: {r.buyer?.full_name || '—'}</div>
              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="shrink-0 text-xs text-gray-700">{r.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

export function MyesPropertiesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'all'|'active'|'inactive'>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('properties').select('id, title, address, price_usdt, is_active, created_at').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const view = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    return rows
      .filter(r => active==='all'? true : active==='active'? r.is_active : !r.is_active)
      .filter(r => !qq || (r.title||'').toLowerCase().includes(qq) || (r.address||'').toLowerCase().includes(qq) || (r.id||'').includes(qq));
  }, [rows, active, q]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-500" />
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск по названию/адресу/ID" className="bg-transparent outline-none" />
          </div>
          <select value={active} onChange={(e)=>setActive(e.target.value as any)} className="border rounded-xl px-3 py-1.5 text-sm">
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">{view.length} найдено</div>
      </div>
      <div className="divide-y">
        {loading ? (
          <div className="p-6 text-gray-600">Загрузка…</div>
        ) : view.length === 0 ? (
          <div className="p-6 text-gray-600">Ничего не найдено</div>
        ) : view.map(p => (
          <div key={p.id} className="p-3 text-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{p.title || '—'}</div>
              <div className="text-xs text-gray-600 truncate">{p.address}</div>
              <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()} • {p.is_active ? 'активен' : 'неактивен'}</div>
            </div>
            <div className="shrink-0 text-xs text-gray-700">{p.price_usdt} USDT</div>
          </div>
        ))}
      </div>
    </div>
  );
} 
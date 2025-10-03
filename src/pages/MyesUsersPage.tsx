import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

export function MyesUsersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all'|'buyer'|'realtor'|'lovepay'|'admin'>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('id, email, full_name, role, is_admin, is_verified, created_at').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const view = useMemo(()=>{
    const qq = q.trim().toLowerCase();
    return rows
      .filter(r => role==='all' ? true : r.role === role)
      .filter(r => !qq || (r.email||'').toLowerCase().includes(qq) || (r.full_name||'').toLowerCase().includes(qq) || (r.id||'').includes(qq));
  }, [rows, role, q]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-500" />
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск по имени/почте/ID" className="bg-transparent outline-none" />
          </div>
          <select value={role} onChange={(e)=>setRole(e.target.value as any)} className="border rounded-xl px-3 py-1.5 text-sm">
            <option value="all">Все роли</option>
            <option value="buyer">Покупатели</option>
            <option value="realtor">Риелторы</option>
            <option value="lovepay">Love&Pay</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">{view.length} найдено</div>
      </div>
      <div className="divide-y">
        {loading ? (
          <div className="p-6 text-gray-600">Загрузка…</div>
        ) : view.length === 0 ? (
          <div className="p-6 text-gray-600">Ничего не найдено</div>
        ) : view.map(u => (
          <div key={u.id} className="p-3 text-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{u.full_name || '—'}</div>
              <div className="text-xs text-gray-600 truncate">{u.email}</div>
              <div className="text-xs text-gray-500">{new Date(u.created_at).toLocaleString()} • <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">{u.role || '—'}{u.is_admin ? ' (admin)' : ''}</span>{u.is_verified ? ' • верифицирован' : ''}</div>
            </div>
            <div className="shrink-0 text-xs text-gray-600">{u.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 
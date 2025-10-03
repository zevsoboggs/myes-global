import React, { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Loader2, Check, X, Search, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LovePayVerificationsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'approved'|'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'created_at'|'status'|'user'>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const load = async () => {
    if (!profile || profile.role !== 'lovepay') return;
    setLoading(true);
    const { data } = await supabase
      .from('verification_requests')
      .select('*, user:profiles(full_name,email)')
      .order('created_at', { ascending: false });
    setList(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.role]);

  const view = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = list
      .filter(v => statusFilter==='all' ? true : v.status === statusFilter)
      .filter(v => !q || (v.user?.full_name || '').toLowerCase().includes(q) || (v.user?.email || '').toLowerCase().includes(q) || (v.id || '').includes(q))
      .sort((a, b) => {
        let va: any = 0; let vb: any = 0;
        if (sortKey === 'created_at') { va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
        else if (sortKey === 'status') { va = a.status.localeCompare(b.status); vb = 0; }
        else if (sortKey === 'user') { va = (a.user?.full_name || '').localeCompare(b.user?.full_name || ''); vb = 0; }
        const d = va > vb ? 1 : va < vb ? -1 : 0;
        return sortDir === 'asc' ? d : -d;
      });
    return arr;
  }, [list, statusFilter, search, sortKey, sortDir]);

  const approve = async (id: string) => {
    await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', id);
    await load();
  };
  const reject = async (id: string) => {
    await supabase.from('verification_requests').update({ status: 'rejected' }).eq('id', id);
    await load();
  };

  if (loading) return <div className="p-6 text-gray-600 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center mb-4">
        <div className="flex gap-2">
          {(['all','pending','approved','rejected'] as const).map(st => (
            <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-1.5 rounded-xl text-xs border ${statusFilter===st? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{st}</button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5 w-full md:w-auto md:flex-1">
            <Search className="w-4 h-4 text-gray-500" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={t('common.searchUserOrId')} className="bg-transparent outline-none w-full" />
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select value={sortKey} onChange={(e)=>setSortKey(e.target.value as any)} className="bg-transparent outline-none">
              <option value="created_at">{t('common.sortByDate')}</option>
              <option value="status">{t('common.sortByStatus')}</option>
              <option value="user">{t('common.sortByUser')}</option>
            </select>
            <button onClick={()=>setSortDir(d=> d==='asc'?'desc':'asc')} className="ml-1 px-2 py-0.5 rounded-lg border">{sortDir==='asc'?'ASC':'DESC'}</button>
          </div>
        </div>
      </div>

      <div className="divide-y">
        {view.map(v => (
          <div key={v.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{v.user?.full_name || '—'}</div>
              <div className="text-xs text-gray-600 truncate">{v.user?.email}</div>
              <div className="text-xs text-gray-500">{new Date(v.created_at).toLocaleString()} • <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">{require('../lib/status').getVerificationStatusLabel(v.status)}</span></div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={()=>approve(v.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"><Check className="w-4 h-4" /> {t('common.approve')}</button>
              <button onClick={()=>reject(v.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm"><X className="w-4 h-4" /> {t('common.reject')}</button>
            </div>
          </div>
        ))}
        {view.length === 0 && (
          <div className="p-6 text-gray-600">{t('common.notFound')}</div>
        )}
      </div>
    </div>
  );
} 
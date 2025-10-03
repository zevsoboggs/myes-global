import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Check, X, Wallet, Search, ArrowUpDown, Download } from 'lucide-react';
import { getPayoutStatusLabel } from '../lib/status';

export function LovePayPayoutsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<'all'|'requested'|'approved'|'paid'|'rejected'>('all');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'created_at'|'amount'|'status'>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const load = async () => {
    if (!profile || profile.role !== 'lovepay') return;
    setLoading(true);
    const { data } = await supabase
      .from('payouts')
      .select('*, realtor:profiles(full_name,email,payout_method,payout_details)')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, [profile?.role]);

  const view = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const arr = rows
      .filter(r => status==='all' ? true : r.status === status)
      .filter(r => !qq || (r.realtor?.full_name || '').toLowerCase().includes(qq) || (r.id || '').toLowerCase().includes(qq))
      .sort((a,b)=>{
        let va:any=0, vb:any=0;
        if (sortKey==='created_at'){ va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
        else if (sortKey==='amount'){ va = Number(a.amount_usdt||0); vb = Number(b.amount_usdt||0); }
        else if (sortKey==='status'){ va = (a.status||'').localeCompare(b.status||''); vb=0; }
        const d = va>vb?1:va<vb?-1:0; return sortDir==='asc'?d:-d;
      });
    return arr;
  }, [rows, status, q, sortKey, sortDir]);

  const setStatusDb = async (id: string, status: 'approved'|'paid'|'rejected') => {
    await supabase.from('payouts').update({ status }).eq('id', id);
    await load();
  };

  const exportCSV = () => {
    const headers = ['id','realtor','amount','method','status','created_at'];
    const rowsCsv = view.map(r => [r.id, r.realtor?.full_name, r.amount_usdt, r.method, r.status, r.created_at]);
    const escape = (v:any)=>{ const s=String(v ?? ''); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const csv = [headers.join(','), ...rowsCsv.map(r=>r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download = `payouts_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-gray-600 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {(['all','requested','approved','paid','rejected'] as const).map(st => (
            <button key={st} onClick={()=>setStatus(st)} className={`px-3 py-1.5 rounded-xl text-xs border ${status===st? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{st}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-500" />
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={t('common.searchRealtorOrPayout')} className="bg-transparent outline-none" />
          </div>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select value={sortKey} onChange={(e)=>setSortKey(e.target.value as any)} className="bg-transparent outline-none">
              <option value="created_at">{t('common.sortByDate')}</option>
              <option value="amount">{t('common.sortByAmount')}</option>
              <option value="status">{t('common.sortByStatus')}</option>
            </select>
            <button onClick={()=>setSortDir(d=> d==='asc'?'desc':'asc')} className="ml-1 px-2 py-0.5 rounded-lg border">{sortDir==='asc'?'ASC':'DESC'}</button>
          </div>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white"><Download className="w-4 h-4" /> {t('common.export')}</button>
        </div>
      </div>

      <div className="divide-y">
        {view.map(r => (
          <div key={r.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{t('common.payout')} {r.id}</div>
              <div className="text-xs text-gray-600 truncate">{r.realtor?.full_name}</div>
              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()} • <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">{getPayoutStatusLabel(r.status)}</span></div>
              <div className="text-xs text-gray-500 mt-1">{t('common.method')}: {r.method || r.realtor?.payout_method} • {r.details || r.realtor?.payout_details}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-sm">
              <div className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">{t('common.amount')}: {r.amount_usdt} USDT</div>
              {r.status==='requested' && (
                <button onClick={()=>setStatusDb(r.id, 'approved')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50"><Check className="w-4 h-4" /> {t('common.approve')}</button>
              )}
              {r.status==='approved' && (
                <button onClick={()=>setStatusDb(r.id, 'paid')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50"><Wallet className="w-4 h-4" /> {t('common.paid')}</button>
              )}
              {r.status!=='paid' && (
                <button onClick={()=>setStatusDb(r.id, 'rejected')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50"><X className="w-4 h-4" /> {t('common.reject')}</button>
              )}
            </div>
          </div>
        ))}
        {view.length===0 && (
          <div className="p-6 text-gray-600">{t('common.notFound')}</div>
        )}
      </div>
    </div>
  );
} 
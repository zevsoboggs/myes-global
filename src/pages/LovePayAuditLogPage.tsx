import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translateStatusTokensInText } from '../lib/status';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, History } from 'lucide-react';

export function LovePayAuditLogPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(()=>{
    (async () => {
      if (!profile || profile.role !== 'lovepay') return;
      // В реале лучше отдельная таблица audit_log, тут — соберем из ключевых таблиц
      const { data: inv } = await supabase.from('invoices').select('id,status,updated_at,sales_request_id').order('updated_at', { ascending: false }).limit(20);
      const { data: req } = await supabase.from('sales_requests').select('id,status,updated_at').order('updated_at', { ascending: false }).limit(20);
      const { data: pay } = await supabase.from('payouts').select('id,status,updated_at').order('updated_at', { ascending: false }).limit(20);
      const map = [
        ...(inv||[]).map((r:any)=>({ type: 'invoice', id: r.id, status: r.status, ts: r.updated_at, ref: r.sales_request_id })),
        ...(req||[]).map((r:any)=>({ type: 'request', id: r.id, status: r.status, ts: r.updated_at })),
        ...(pay||[]).map((r:any)=>({ type: 'payout', id: r.id, status: r.status, ts: r.updated_at })),
      ].sort((a,b)=> new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0,50);
      setRows(map);
      setLoading(false);
    })();
  }, [profile?.role]);

  if (loading) return <div className="p-6 text-gray-600 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b font-semibold text-gray-900 flex items-center gap-2"><History className="w-4 h-4" /> {t('lovepay.audit')}</div>
      <div className="divide-y">
        {rows.map((r:any, i:number)=> (
          <div key={i} className="p-3 text-sm text-gray-800 flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200 mr-2">{r.type}</span>
              <span className="text-gray-900">{r.id}</span>
              {r.ref && <span className="text-gray-500 ml-2">({t('lovepay.request')}: {r.ref})</span>}
            </div>
            <div className="text-xs text-gray-600">{new Date(r.ts).toLocaleString()} • {translateStatusTokensInText(r.status)}</div>
          </div>
        ))}
        {rows.length===0 && <div className="p-6 text-gray-600">{t('lovepay.noRecords')}</div>}
      </div>
    </div>
  );
} 
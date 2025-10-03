import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function MyesChatsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('id, created_at, buyer:profiles!conversations_buyer_id_fkey(full_name), realtor:profiles!conversations_realtor_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b font-semibold text-gray-900">Чаты</div>
      <div className="divide-y">
        {loading ? <div className="p-6 text-gray-600">Загрузка…</div> :
          (rows.length === 0 ? <div className="p-6 text-gray-600">Ничего не найдено</div> :
            rows.map(c => (
              <div key={c.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{c.buyer?.full_name || 'Покупатель'} — {c.realtor?.full_name || 'Риелтор'}</div>
                  <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
                </div>
                <div className="shrink-0 text-xs text-gray-700">{c.id}</div>
              </div>
            ))
          )}
      </div>
    </div>
  );
} 
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Save } from 'lucide-react';

export function LovePaySettingsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState<{default_commission?: number, default_payment_instructions?: string}>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // Читаем из таблицы profiles поля глобальных настроек (как упрощение)
      const { data } = await supabase.from('profiles').select('commission_rate').eq('id', profile?.id).maybeSingle();
      setDefaults({ default_commission: data?.commission_rate || 0.01, default_payment_instructions: '' });
      setLoading(false);
    })();
  }, [profile?.id]);

  const save = async () => {
    setSaving(true);
    try {
      if (defaults.default_commission !== undefined) {
        await supabase.from('profiles').update({ commission_rate: defaults.default_commission }).eq('id', profile?.id);
      }
      // Для payment_instructions можно хранить в отдельной таблице settings — тут опускаем
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b font-semibold text-gray-900">Настройки Love&Pay</div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm text-gray-700">Комиссия по умолчанию (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={Number((defaults.default_commission||0)*100).toString()} onChange={(e)=>setDefaults(d=>({...d, default_commission: Number(e.target.value)/100}))} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 max-w-xs" />
        </div>
        <div>
          <label className="text-sm text-gray-700">Шаблон инструкций оплаты</label>
          <textarea value={defaults.default_payment_instructions||''} onChange={(e)=>setDefaults(d=>({...d, default_payment_instructions: e.target.value}))} rows={4} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200" placeholder="Например: Оплата USDT TRC20, адрес кошелька..., примечание..." />
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white"><Save className="w-4 h-4" /> Сохранить</button>
      </div>
    </div>
  );
} 
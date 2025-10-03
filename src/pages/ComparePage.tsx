import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function ComparePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_compare')
      .select('created_at, property_id, property:properties(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4);
    setRows(data || []);
  };
  useEffect(() => { load(); }, [user]);
  const remove = async (pid: string) => { if (!user) return; await supabase.from('user_compare').delete().eq('user_id', user.id).eq('property_id', pid); load(); };
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-700">{t('compare.login')}</div>;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{t('compare.title')}</h1>
        </div>
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-600">{t('compare.none')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {rows.map((r) => {
              const p = r.property;
              const key = p?.id || r.property_id || r.created_at;
              const canOpen = Boolean(p?.id);
              const canRemoveId = p?.id || r.property_id;
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 truncate">{p?.title || t('compare.unavailable')}</div>
                    {canRemoveId && (
                      <button onClick={()=>remove(canRemoveId)} className="p-1 rounded-lg hover:bg-gray-50"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{p?.address || t('compare.na')}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">{t('compare.type')}</span>{p?.property_type || t('compare.na')}</div>
                    <div><span className="text-gray-500">{t('compare.price')}</span>{typeof p?.price_usdt === 'number' ? `${p.price_usdt} USDT` : t('compare.na')}</div>
                    <div><span className="text-gray-500">{t('compare.bedrooms')}</span>{typeof p?.bedrooms === 'number' ? p.bedrooms : t('compare.na')}</div>
                    <div><span className="text-gray-500">{t('compare.bathrooms')}</span>{typeof p?.bathrooms === 'number' ? p.bathrooms : t('compare.na')}</div>
                    <div><span className="text-gray-500">{t('compare.area')}</span>{typeof p?.area_sqm === 'number' ? `${p.area_sqm} м²` : t('compare.na')}</div>
                  </div>
                  <div className="mt-3 text-sm"><span className="text-gray-500">{t('compare.features')}</span>{Array.isArray(p?.features) ? p!.features.join(', ') : t('compare.na')}</div>
                  <div className="mt-3">
                    {canOpen ? (
                      <Link to={`/properties/${p!.id}`} className="text-blue-700">{t('compare.open')}</Link>
                    ) : (
                      <span className="text-gray-500">{t('compare.unavailable')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

export function PreferencesPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<any>({ propertyType: '', minPrice: 0, maxPrice: 0, bedrooms: 0 });
  const [reco, setReco] = useState<any[]>([]);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('buyer_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (data?.prefs) setPrefs(data.prefs);
    const { data: r } = await supabase.from('v_recommended_properties').select('*').limit(8);
    setReco(r || []);
  };
  useEffect(()=>{ load(); }, [user]);
  const save = async () => {
    if (!user) return;
    await supabase.from('buyer_preferences').upsert({ user_id: user.id, prefs });
    load();
  };
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-700">Войдите, чтобы задать предпочтения</div>;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Предпочтения и рекомендации</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={prefs.propertyType} onChange={(e)=>setPrefs({...prefs, propertyType: e.target.value})} className="border rounded-xl px-3 py-2">
              <option value="">Тип: любой</option>
              <option value="apartment">Квартира</option>
              <option value="house">Дом</option>
              <option value="villa">Вилла</option>
              <option value="commercial">Коммерческая</option>
              <option value="land">Земля</option>
            </select>
            <input type="number" value={prefs.minPrice||0} onChange={(e)=>setPrefs({...prefs, minPrice: Number(e.target.value)})} placeholder="Мин. цена" className="border rounded-xl px-3 py-2" />
            <input type="number" value={prefs.maxPrice||0} onChange={(e)=>setPrefs({...prefs, maxPrice: Number(e.target.value)})} placeholder="Макс. цена" className="border rounded-xl px-3 py-2" />
            <select value={prefs.bedrooms||0} onChange={(e)=>setPrefs({...prefs, bedrooms: Number(e.target.value)})} className="border rounded-xl px-3 py-2">
              <option value={0}>Спален: любой</option>
              {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div className="mt-3"><button onClick={save} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">Сохранить</button></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-3"><Sparkles className="w-4 h-4 text-blue-600"/> Рекомендовано</div>
          {reco.length === 0 ? (
            <div className="text-gray-600">Нет рекомендаций</div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reco.map((p)=> (
                <li key={p.id} className="border rounded-xl p-3">
                  <div className="font-semibold text-gray-900 truncate">{p.title}</div>
                  <div className="text-sm text-gray-600 truncate">{p.address}</div>
                  <div className="text-sm text-gray-900 mt-1">{p.price_usdt} USDT • {p.bedrooms} спал. • {p.area_sqm} м²</div>
                  <Link to={`/properties/${p.id}`} className="text-blue-700 text-sm">Открыть</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 
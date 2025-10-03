import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin } from 'lucide-react';

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<any | null>(null);
  useEffect(()=>{ (async ()=>{ const { data } = await supabase.from('properties').select('*, property_images(id,image_url,is_primary)').eq('id', id).maybeSingle(); setP(data||null); })(); }, [id]);
  if (!p) return <div className="min-h-screen flex items-center justify-center text-gray-600">Загрузка…</div>;
  const img = (p.property_images||[]).find((i:any)=>i.is_primary) || p.property_images?.[0];
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-4">
        <div className="mb-4"><Link to={`/properties/${p.id}`} className="inline-flex items-center text-blue-700"><ArrowLeft className="w-4 h-4"/> Назад к объекту</Link></div>
        <div className="rounded-2xl overflow-hidden border">
          {img ? <img src={img.image_url} alt="" className="w-full h-80 object-cover"/> : <div className="h-80 bg-gray-100"/>}
          <div className="p-4">
            <h1 className="text-2xl font-extrabold text-gray-900">{p.title}</h1>
            <div className="text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4"/>{p.address}</div>
            <div className="mt-2 text-lg font-semibold">{p.price_usdt} USDT • {p.bedrooms} спал. • {p.area_sqm} м²</div>
            <div className="mt-3 text-gray-800 whitespace-pre-line">{p.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const COLUMNS = ['new','in_progress','won','lost'] as const;

export function LeadsBoardPage() {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const load = async () => {
    if (!user || profile?.role !== 'realtor') return;
    const { data } = await supabase.from('leads').select('*, buyer:profiles(full_name), property:properties(title)').eq('realtor_id', user.id);
    setLeads(data || []);
  };
  useEffect(()=>{ load(); }, [user, profile?.role]);
  const move = async (id: string, status: any) => { await supabase.from('leads').update({ status }).eq('id', id); load(); };
  if (!user || profile?.role !== 'realtor') return <div className="min-h-screen flex items-center justify-center text-gray-700">Доступно риелторам</div>;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Лиды</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col)=> (
            <div key={col} className="bg-white rounded-2xl border border-gray-100 p-3">
              <div className="font-semibold text-gray-900 mb-2">{col}</div>
              <div className="space-y-2">
                {leads.filter(l=>l.status===col).map((l)=>(
                  <div key={l.id} className="border rounded-xl p-3">
                    <div className="font-semibold text-gray-900 truncate">{l.property?.title || 'Объект'}</div>
                    <div className="text-xs text-gray-600 truncate">Покупатель: {l.buyer?.full_name || '—'}</div>
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      {COLUMNS.filter(c=>c!==col).map((t)=> (
                        <button key={t} onClick={()=>move(l.id,t)} className="px-2 py-1 rounded-lg border">{t}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
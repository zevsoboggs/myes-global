import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Download } from 'lucide-react';

function toICS(title: string, dt: Date, address: string) {
  const pad = (n: number) => (n<10?'0':'')+n;
  const dtutc = new Date(dt.getTime() - dt.getTimezoneOffset()*60000);
  const stamp = `${dtutc.getUTCFullYear()}${pad(dtutc.getUTCMonth()+1)}${pad(dtutc.getUTCDate())}T${pad(dtutc.getUTCHours())}${pad(dtutc.getUTCMinutes())}00Z`;
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MyEstate//Showings//EN\nBEGIN:VEVENT\nDTSTAMP:${stamp}\nDTSTART:${stamp}\nSUMMARY:${title}\nLOCATION:${address}\nEND:VEVENT\nEND:VCALENDAR`;
}

export function ShowingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [dt, setDt] = useState('');
  const [note, setNote] = useState('');
  const [props, setProps] = useState<any[]>([]);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('showings').select('*, property:properties(id,title,address)').or(`buyer_id.eq.${user.id},property.realtor_id.eq.${user.id}`).order('scheduled_at', { ascending: true });
    setRows(data || []);
    const { data: ps } = await supabase.from('properties').select('id,title,address').eq('is_active', true);
    setProps(ps || []);
  };
  useEffect(()=>{ load(); }, [user]);
  const create = async () => {
    if (!user || !propertyId || !dt) return;
    await supabase.from('showings').insert({ buyer_id: user.id, property_id: propertyId, scheduled_at: new Date(dt).toISOString(), note });
    setPropertyId(''); setDt(''); setNote(''); load();
  };
  const downloadICS = (r: any) => {
    const ics = toICS(r.property?.title || 'Показ', new Date(r.scheduled_at), r.property?.address || '');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='showing.ics'; a.click(); URL.revokeObjectURL(url);
  };
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-700">Войдите, чтобы открыть показы</div>;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Календарь показов</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select value={propertyId} onChange={(e)=>setPropertyId(e.target.value)} className="border rounded-xl px-3 py-2">
              <option value="">Выберите объект</option>
              {props.map((p)=> <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <input type="datetime-local" value={dt} onChange={(e)=>setDt(e.target.value)} className="border rounded-xl px-3 py-2" />
            <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Заметка" className="border rounded-xl px-3 py-2" />
            <button onClick={create} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">Назначить</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100">
          <ul className="divide-y">
            {rows.map((r)=> (
              <li key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{r.property?.title || 'Объект'}</div>
                  <div className="text-sm text-gray-600">{new Date(r.scheduled_at).toLocaleString()} • {r.property?.address}</div>
                </div>
                <button onClick={()=>downloadICS(r)} className="px-3 py-2 rounded-xl border text-sm"><Download className="w-4 h-4"/> ICS</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 
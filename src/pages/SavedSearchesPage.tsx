import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Eye, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export function SavedSearchesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, any[]>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('saved_searches').update({ is_active: !isActive }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить сохранённый поиск?')) return;
    await supabase.from('saved_searches').delete().eq('id', id);
    load();
  };

  const openMatches = async (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId === id) return;
    const { data } = await supabase
      .from('saved_search_matches')
      .select('created_at, property:properties(id,title)')
      .eq('saved_search_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMatches((prev) => ({ ...prev, [id]: data || [] }));
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-700">Войдите, чтобы открыть сохранённые поиски</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Мои сохранённые поиски</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="p-6 text-gray-600">Загрузка…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-gray-600">Сохранённых поисков нет</div>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{r.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>toggleActive(r.id, r.is_active)} className="px-3 py-1.5 rounded-xl border text-sm">
                        {r.is_active ? <span className="inline-flex items-center gap-1 text-emerald-700"><ToggleRight className="w-4 h-4"/>Активен</span> : <span className="inline-flex items-center gap-1 text-gray-700"><ToggleLeft className="w-4 h-4"/>Выкл</span>}
                      </button>
                      <button onClick={()=>openMatches(r.id)} className="px-3 py-1.5 rounded-xl border text-sm"><Eye className="w-4 h-4" /> Совпадения</button>
                      <button onClick={()=>remove(r.id)} className="px-3 py-1.5 rounded-xl border text-sm text-red-700"><Trash2 className="w-4 h-4" /> Удалить</button>
                    </div>
                  </div>
                  {expandedId === r.id && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                      {matches[r.id] && matches[r.id].length ? (
                        <ul className="space-y-1 text-sm">
                          {matches[r.id].map((m:any) => (
                            <li key={m.property?.id} className="flex items-center justify-between">
                              <span className="truncate">{m.property?.title || 'Объект'}</span>
                              <Link to={`/properties/${m.property?.id}`} className="text-blue-700">Открыть</Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-600">Совпадений нет</div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 
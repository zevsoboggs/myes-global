import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Users, Building2, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MyesOverviewPage() {
  const [metrics, setMetrics] = useState<{users:number, properties:number, invoices:number} | null>(null);

  useEffect(()=>{
    (async () => {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: properties } = await supabase.from('properties').select('*', { count: 'exact', head: true });
      const { count: invoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      setMetrics({ users: users||0, properties: properties||0, invoices: invoices||0 });
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-600">Пользователи</div>
          <div className="text-2xl font-bold">{metrics?.users ?? '—'}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-600">Объекты</div>
          <div className="text-2xl font-bold">{metrics?.properties ?? '—'}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-600">Счета</div>
          <div className="text-2xl font-bold">{metrics?.invoices ?? '—'}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/myes/analytics" className="rounded-2xl border bg-white p-4 flex items-center gap-2 hover:bg-gray-50">
          <BarChart3 className="w-4 h-4" /> Аналитика
        </Link>
        <Link to="/myes/users" className="rounded-2xl border bg-white p-4 flex items-center gap-2 hover:bg-gray-50">
          <Users className="w-4 h-4" /> Пользователи
        </Link>
        <Link to="/myes/properties" className="rounded-2xl border bg-white p-4 flex items-center gap-2 hover:bg-gray-50">
          <Building2 className="w-4 h-4" /> Объекты
        </Link>
        <Link to="/myes/invoices" className="rounded-2xl border bg-white p-4 flex items-center gap-2 hover:bg-gray-50">
          <Receipt className="w-4 h-4" /> Счета
        </Link>
      </div>
    </div>
  );
} 
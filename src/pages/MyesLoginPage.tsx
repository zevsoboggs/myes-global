import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';

export function MyesLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error('Нет пользователя');
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', uid)
        .single();
      const isAdmin = !!(prof && (prof as any).is_admin);
      const isAdminRole = prof?.role === 'admin';
      if (!(isAdmin || isAdminRole)) {
        await supabase.auth.signOut();
        throw new Error('Доступ только для сотрудников сервиса');
      }
      navigate('/myes');
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-slate-700"><Shield className="w-5 h-5" /><span className="font-semibold">MYES Admin — вход</span></div>
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Пароль</label>
            <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-gray-900 to-slate-700 text-white flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Войти</span>
          </button>
        </form>
      </div>
    </div>
  );
} 
import React, { useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Shield, LayoutGrid, CheckSquare, Coins, Wallet, Settings, History, KanbanSquare, BookOpen } from 'lucide-react';

export function LovePayLayout() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/lovepay/login', { replace: true });
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (profile.role !== 'lovepay') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">Нет доступа</div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80 text-xs uppercase tracking-wider">Админ‑панель</div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">Love&Pay</h1>
            </div>
            <Link to="/lovepay/login" className="text-white/80 hover:text-white text-sm">Выйти</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <aside className="lg:col-span-3">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-1">
              <NavLink
                to="/lovepay/requests"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                Заявки и счета
              </NavLink>
              <NavLink
                to="/lovepay/verifications"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <CheckSquare className="w-4 h-4" />
                Верификации
              </NavLink>
              <NavLink
                to="/lovepay/commissions"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Coins className="w-4 h-4" />
                Комиссии
              </NavLink>
              <NavLink
                to="/lovepay/payouts"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Wallet className="w-4 h-4" />
                Выплаты
              </NavLink>
              <NavLink
                to="/lovepay/crm"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <KanbanSquare className="w-4 h-4" />
                CRM
              </NavLink>
              <NavLink
                to="/lovepay/settings"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Settings className="w-4 h-4" />
                Настройки
              </NavLink>
              <NavLink
                to="/lovepay/instructions"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <BookOpen className="w-4 h-4" />
                Инструкции
              </NavLink>
              <NavLink
                to="/lovepay/audit"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <History className="w-4 h-4" />
                Аудит
              </NavLink>
            </nav>
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Только для сотрудников Love&Pay
            </div>
            <div className="mt-1 text-[11px] text-gray-400">Точка входа: /lovepay/login</div>
          </aside>

          <main className="lg:col-span-9">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
} 
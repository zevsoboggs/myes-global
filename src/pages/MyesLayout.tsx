import React, { useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Shield, Home, Users, Building2, Receipt, FileText, MessageSquare, Bell, BarChart3, ListChecks, Settings2, History, ServerCog, Flag, BookOpen } from 'lucide-react';

export function MyesLayout() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profile) navigate('/myes/login', { replace: true });
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;
  // Доступ только для сотрудников: is_admin флаг или роль 'admin'
  const isAdminFlag = Boolean((profile as any).is_admin);
  const isAdminRole = profile.role === 'admin';
  if (!(isAdminFlag || isAdminRole)) {
    return <div className="min-h-screen flex items-center justify-center text-gray-700">Нет доступа</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900">
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80 text-xs uppercase tracking-wider">Админ‑панель</div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">MYES Admin</h1>
            </div>
            <Link to="/myes/login" className="text-white/80 hover:text-white text-sm">Выйти</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <aside className="lg:col-span-3">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-1">
              <NavLink to="/myes" end className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Home className="w-4 h-4" />
                Обзор
              </NavLink>
              <NavLink to="/myes/users" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Users className="w-4 h-4" />
                Пользователи
              </NavLink>
              <NavLink to="/myes/properties" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Building2 className="w-4 h-4" />
                Объекты
              </NavLink>
              <NavLink to="/myes/sales" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <FileText className="w-4 h-4" />
                Сделки
              </NavLink>
              <NavLink to="/myes/invoices" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-сlate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Receipt className="w-4 h-4" />
                Счета
              </NavLink>
              <NavLink to="/myes/chats" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <MessageSquare className="w-4 h-4" />
                Чаты
              </NavLink>
              <NavLink to="/myes/notifications" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Bell className="w-4 h-4" />
                Уведомления
              </NavLink>
              <NavLink to="/myes/analytics" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <BarChart3 className="w-4 h-4" />
                Аналитика
              </NavLink>
              <NavLink to="/myes/leads" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <ListChecks className="w-4 h-4" />
                Лиды
              </NavLink>
              <NavLink to="/myes/settings" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Settings2 className="w-4 h-4" />
                Настройки
              </NavLink>
              <NavLink to="/myes/audit" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <History className="w-4 h-4" />
                Аудит
              </NavLink>
              <NavLink to="/myes/system" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <ServerCog className="w-4 h-4" />
                Система
              </NavLink>
              <NavLink to="/myes/flags" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <Flag className="w-4 h-4" />
                Фичи
              </NavLink>
              <NavLink to="/myes/instructions" className={({isActive})=>`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isActive?'bg-slate-50 text-slate-800 border border-slate-200':'text-gray-700 hover:bg-gray-50'}`}>
                <BookOpen className="w-4 h-4" />
                Инструкции
              </NavLink>
            </nav>
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Доступ только сотрудникам сервиса
            </div>
          </aside>

          <main className="lg:col-span-9">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
} 
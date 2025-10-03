import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Newspaper, Search, MessageSquare, Settings, Bell, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function BottomNav() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      if (!user) return setUnreadCount(0);
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(data?.length || 0);
    })();
  }, [user]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Hide on admin sections
  if (location.pathname.startsWith('/lovepay') || location.pathname.startsWith('/myes')) return null;

  // Different menu for lawyers
  if (profile?.role === 'lawyer') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="max-w-7xl mx-auto px-2 py-1">
          <div className="grid grid-cols-5 gap-1">
            <Link to="/" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/') ? 'text-blue-600' : 'text-gray-600'}`}>
              <Home className="w-5 h-5" />
              <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.home')}</span>
            </Link>
            <Link to="/feed" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/feed') ? 'text-blue-600' : 'text-gray-600'}`}>
              <Newspaper className="w-5 h-5" />
              <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.feed')}</span>
            </Link>
            <Link to="/deals" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/deals') ? 'text-blue-600' : 'text-gray-600'}`}>
              <TrendingUp className="w-5 h-5" />
              <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.deals')}</span>
            </Link>
            <Link to="/chats" className={`relative flex flex-col items-center py-1 text-[10px] ${isActive('/chats') ? 'text-blue-600' : 'text-gray-600'}`}>
              <MessageSquare className="w-5 h-5" />
              <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.chats')}</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 right-4 text-[10px] bg-red-500 text-white rounded-full px-1">{unreadCount}</span>
              )}
            </Link>
            <Link to="/dashboard" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'}`}>
              <Settings className="w-5 h-5" />
              <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('header.dashboardShort') || t('header.dashboard')}</span>
            </Link>
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md lg:hidden">
      <div className="max-w-7xl mx-auto px-2 py-1">
        <div className="grid grid-cols-5 gap-1">
          <Link to="/" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/') ? 'text-blue-600' : 'text-gray-600'}`}>
            <Home className="w-5 h-5" />
            <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.home')}</span>
          </Link>
          <Link to="/feed" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/feed') ? 'text-blue-600' : 'text-gray-600'}`}>
            <Newspaper className="w-5 h-5" />
            <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.feed')}</span>
          </Link>
          <Link to="/properties" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/properties') ? 'text-blue-600' : 'text-gray-600'}`}>
            <Search className="w-5 h-5" />
            <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.propertiesShort') || t('nav.properties')}</span>
          </Link>
          <Link to="/chats" className={`relative flex flex-col items-center py-1 text-[10px] ${isActive('/chats') ? 'text-blue-600' : 'text-gray-600'}`}>
            <MessageSquare className="w-5 h-5" />
            <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('nav.chats')}</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 right-4 text-[10px] bg-red-500 text-white rounded-full px-1">{unreadCount}</span>
            )}
          </Link>
          <Link to="/dashboard" className={`flex flex-col items-center py-1 text-[10px] ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'}`}>
            <Settings className="w-5 h-5" />
            <span className="mt-0.5 leading-none truncate max-w-[60px]">{t('header.dashboardShort') || t('header.dashboard')}</span>
          </Link>
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

export default BottomNav;



import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Newspaper,
  Building2,
  MessageSquare,
  Heart,
  Settings,
  TrendingUp,
  Scale,
  Megaphone,
  BarChart3,
  Users,
  Layers,
  LogOut,
  User,
  Shield,
  Wallet,
  PlusCircle,
  ChevronDown,
  Calendar,
  Search,
  MapPin,
  Star,
  FileText,
  Bell,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Crown,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Hide sidebar on admin/lovepay routes
  if (location.pathname.startsWith('/lovepay') || location.pathname.startsWith('/myes')) {
    return null;
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowOnMobile(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setShowOnMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      if (!user) return;
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleBadgeStyle = (role: string | undefined) => {
    switch (role) {
      case 'buyer':
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700';
      case 'realtor':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700';
      case 'lawyer':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-700';
      case 'lovepay':
        return 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  interface NavItem {
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    show: boolean;
    badge?: number;
  }

  const mainNavItems: NavItem[] = [
    { path: '/', icon: Home, label: 'nav.home', show: true },
    { path: '/feed', icon: Newspaper, label: 'nav.feed', show: true },
    { path: '/properties', icon: Building2, label: 'nav.properties', show: profile?.role !== 'lawyer' },
    { path: '/rentals', icon: Calendar, label: 'Rentals', show: true },
    { path: '/chats', icon: MessageSquare, label: 'nav.chats', show: !!user, badge: unreadCount },
  ].filter((item) => item.show);

  const discoverItems: NavItem[] = [
    { path: '/lawyers', icon: Scale, label: 'nav.lawyers', show: true },
    { path: '/compare', icon: Layers, label: 'nav.compare', show: !!user && profile?.role !== 'lawyer' },
    { path: '/analytics', icon: BarChart3, label: 'nav.analytics', show: profile?.role === 'realtor' || profile?.role === 'lovepay' },
  ].filter((item) => item.show);

  const toolsItems: NavItem[] = [
    { path: '/deals', icon: TrendingUp, label: 'nav.deals', show: profile?.role === 'buyer' || profile?.role === 'lawyer' },
    { path: '/ads', icon: Megaphone, label: 'nav.ads', show: profile?.role === 'realtor' },
    { path: '/referral', icon: Users, label: 'nav.referral', show: profile?.role === 'buyer' },
    { path: '/favorites', icon: Heart, label: 'nav.favorites', show: !!user },
    { path: '/saved-searches', icon: Search, label: 'nav.savedSearches', show: !!user },
  ].filter((item) => item.show);

  const sections: NavSection[] = [
    { title: 'menu.main', items: mainNavItems },
    { title: 'menu.discover', items: discoverItems },
    { title: 'menu.tools', items: toolsItems },
  ].filter((section) => section.items.length > 0);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`
          group relative flex items-center rounded-xl transition-all duration-300
          ${collapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5 space-x-3'}
          ${
            active
              ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
          }
        `}
      >
        <Icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
        {!collapsed && (
          <>
            <span className="font-medium text-sm flex-1">{t(item.label)}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
        {active && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
        )}
        {collapsed && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
            {t(item.label)}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {showOnMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowOnMobile(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-50
          transition-all duration-300 ease-in-out flex flex-col
          ${collapsed ? 'w-20' : 'w-72'}
          ${showOnMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-gray-200 ${collapsed ? 'px-3 py-4' : 'px-6 py-4'}`}>
          {!collapsed ? (
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-white font-bold text-sm">ME</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-[10px] font-bold">₿</span>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  {t('header.title')}
                </h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">Real Estate & Crypto</p>
              </div>
            </Link>
          ) : (
            <Link to="/" className="w-full flex justify-center">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">ME</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-[10px] font-bold">₿</span>
                </div>
              </div>
            </Link>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setShowOnMobile(false)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className={`border-b border-gray-200 ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
            <Link
              to="/profile/edit"
              className={`flex items-center rounded-xl hover:bg-gray-50 transition-all duration-300 ${
                collapsed ? 'justify-center p-2' : 'space-x-3 p-3'
              }`}
            >
              <div className="relative flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className={`${collapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl object-cover shadow-sm border border-blue-200/50`}
                  />
                ) : (
                  <div className={`${collapsed ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center shadow-sm border border-blue-200/50`}>
                    <User className={`${collapsed ? 'w-5 h-5' : 'w-6 h-6'} text-blue-600`} />
                  </div>
                )}
                {profile?.is_verified && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center border border-white">
                    <UserCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {profile?.full_name || t('header.user')}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  {profile?.role && (
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadgeStyle(profile.role)}`}>
                      {t(`profile.role.${profile.role}`)}
                    </span>
                  )}
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-4' : 'px-4 py-4'} space-y-6`}>
          {/* Add Property Button */}
          {user && profile?.role !== 'buyer' && profile?.role !== 'lawyer' && (
            <Link
              to="/properties/new"
              className={`
                flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-600
                hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl
                shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105
                ${collapsed ? 'p-3' : 'px-4 py-3 space-x-2'}
              `}
            >
              <PlusCircle className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
              {!collapsed && <span className="font-semibold text-sm">{t('header.addProperty')}</span>}
            </Link>
          )}

          {/* Navigation Sections */}
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                  {t(section.title)}
                </h3>
              )}
              <div className="space-y-1">{section.items.map(renderNavItem)}</div>
            </div>
          ))}

          {/* Account Section */}
          {user && (
            <div>
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                  {t('menu.account')}
                </h3>
              )}
              <div className="space-y-1">
                <Link
                  to="/dashboard"
                  className={`
                    group relative flex items-center rounded-xl transition-all duration-300
                    ${collapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5 space-x-3'}
                    ${
                      isActive('/dashboard')
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                    }
                  `}
                >
                  <Settings className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                  {!collapsed && <span className="font-medium text-sm flex-1">{t('header.dashboard')}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {t('header.dashboard')}
                    </div>
                  )}
                </Link>

                {profile?.role !== 'buyer' && !profile?.is_verified && (
                  <Link
                    to="/verification"
                    className={`
                      group relative flex items-center rounded-xl transition-all duration-300
                      ${collapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5 space-x-3'}
                      text-gray-700 hover:bg-gray-50 hover:text-yellow-600
                    `}
                  >
                    <Shield className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                    {!collapsed && <span className="font-medium text-sm flex-1">{t('nav.verification')}</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {t('nav.verification')}
                      </div>
                    )}
                  </Link>
                )}

                {profile?.role === 'lovepay' && (
                  <Link
                    to="/lovepay/requests"
                    className={`
                      group relative flex items-center rounded-xl transition-all duration-300
                      ${collapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5 space-x-3'}
                      text-gray-700 hover:bg-gray-50 hover:text-purple-600
                    `}
                  >
                    <Wallet className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                    {!collapsed && <span className="font-medium text-sm flex-1">Love&Pay</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        Love&Pay
                      </div>
                    )}
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={`border-t border-gray-200 ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
          {user ? (
            <button
              onClick={handleSignOut}
              className={`
                w-full flex items-center rounded-xl text-red-600 hover:bg-red-50 transition-all duration-300
                ${collapsed ? 'justify-center p-3' : 'px-3 py-2.5 space-x-3'}
              `}
            >
              <LogOut className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
              {!collapsed && <span className="font-medium text-sm">{t('header.logout')}</span>}
            </button>
          ) : (
            <div className="space-y-2">
              <Link
                to="/auth"
                className={`
                  flex items-center justify-center border-2 border-blue-600 text-blue-600
                  hover:bg-blue-50 rounded-xl transition-all duration-300
                  ${collapsed ? 'p-2' : 'px-4 py-2'}
                `}
              >
                {!collapsed && <span className="font-semibold text-sm">{t('header.login')}</span>}
                {collapsed && <User className="w-5 h-5" />}
              </Link>
              {!collapsed && (
                <Link
                  to="/auth?mode=register"
                  className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <span className="font-semibold text-sm">{t('header.register')}</span>
                </Link>
              )}
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full mt-3 items-center justify-center p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-300"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Sidebar Toggle Button (Mobile) */}
      <button
        onClick={() => setShowOnMobile(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-3 bg-white border border-gray-200 rounded-xl shadow-lg text-gray-600 hover:text-blue-600 hover:border-blue-600 transition-all duration-300"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </>
  );
}

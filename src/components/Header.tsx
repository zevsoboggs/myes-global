import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  LogOut,
  Settings,
  PlusCircle,
  Heart,
  Menu,
  X,
  Home,
  Search,
  Bell,
  Shield,
  Crown,
  MessageSquare,
  BarChart3,
  Newspaper,
  Layers,
  Building2,
  Wallet,
  TrendingUp,
  UserCheck,
  ChevronDown,
  Scale,
  Megaphone,
  MoreHorizontal,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
    setShowMoreMenu(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unread notifications count
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setShowUserMenu(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getRoleBadgeStyle = (role: string | undefined) => {
    switch(role) {
      case 'buyer':
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-300';
      case 'realtor':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-300';
      case 'lawyer':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-300';
      case 'lovepay':
        return 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Primary navigation items (always visible)
  const primaryNavItems = [
    { path: '/', icon: Home, label: 'nav.home', show: true },
    { path: '/feed', icon: Newspaper, label: 'nav.feed', show: true },
    { path: '/properties', icon: Building2, label: 'nav.properties', show: profile?.role !== 'lawyer' },
    { path: '/rentals', icon: Home, label: 'Rentals', show: true },
    { path: '/chats', icon: MessageSquare, label: 'nav.chats', show: !!user },
  ].filter(item => item.show);

  // Secondary navigation items (in "More" dropdown)
  const secondaryNavItems = [
    { path: '/lawyers', icon: Scale, label: 'nav.lawyers', show: true },
    { path: '/deals', icon: TrendingUp, label: 'nav.deals', show: profile?.role === 'buyer' || profile?.role === 'lawyer' },
    { path: '/compare', icon: Layers, label: 'nav.compare', show: !!user && profile?.role !== 'lawyer' },
    { path: '/ads', icon: Megaphone, label: 'nav.ads', show: profile?.role === 'realtor' },
    { path: '/analytics', icon: BarChart3, label: 'nav.analytics', show: profile?.role === 'realtor' || profile?.role === 'lovepay' },
    { path: '/referral', icon: Users, label: 'nav.referral', show: profile?.role === 'buyer' },
  ].filter(item => item.show);

  return (
    <header className={`
      bg-white/90 backdrop-blur-xl sticky top-0 z-50 
      transition-all duration-300
      ${scrolled ? 'shadow-lg border-b border-gray-200/50' : 'shadow-sm border-b border-gray-100'}
    `}>
      <div className="max-w-7xl mx-auto">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <span className="text-white font-bold text-xs sm:text-sm">ME</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-[8px] font-bold">₿</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  {t('header.title')}
                </h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">Real Estate & Crypto</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center">
              <div className="flex items-center bg-gray-50/80 rounded-full px-1 py-1">
                {/* Primary Nav Items */}
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center space-x-1.5 px-3 py-1.5 rounded-full
                        transition-all duration-300 font-medium text-sm group relative
                        ${active
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 ${active ? '' : 'group-hover:scale-110'} transition-transform duration-300`} />
                      <span>{t(item.label)}</span>
                      {active && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                      )}
                    </Link>
                  );
                })}

                {/* More Dropdown */}
                {secondaryNavItems.length > 0 && (
                  <div className="relative more-menu-container">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={`
                        flex items-center space-x-1.5 px-3 py-1.5 rounded-full
                        transition-all duration-300 font-medium text-sm group
                        ${secondaryNavItems.some(item => isActive(item.path))
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }
                      `}
                    >
                      <MoreHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                      <span>{t('nav.more')}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showMoreMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showMoreMenu && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                        {secondaryNavItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setShowMoreMenu(false)}
                              className={`
                                flex items-center space-x-3 px-4 py-2.5
                                transition-all duration-200
                                ${active
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50'
                                }
                              `}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="font-medium">{t(item.label)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <LanguageSwitcher />
              
              {user ? (
                <>
                  {/* Notifications */}
                  <button 
                    onClick={() => navigate('/dashboard#notifications')} 
                    className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full px-1 text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Add Property Button */}
                  {profile?.role !== 'buyer' && profile?.role !== 'lawyer' && (
                    <Link
                      to="/properties/new"
                      className="hidden sm:flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-3 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105 text-sm font-medium"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{t('header.addProperty')}</span>
                    </Link>
                  )}

                  {/* User Profile Dropdown */}
                  <div className="relative user-menu-container">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-300 group"
                    >
                      <div className="relative">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name || 'User'}
                            className="w-8 h-8 rounded-lg object-cover shadow-sm group-hover:shadow-md transition-all duration-300 border border-blue-200/50"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 border border-blue-200/50">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        {profile?.is_verified && (
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center border border-white">
                            <UserCheck className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="hidden xl:block text-left">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {profile?.full_name || t('header.user')}
                          </span>
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        </div>
                        {profile?.role && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRoleBadgeStyle(profile.role)}`}>
                            {t(`profile.role.${profile.role}`)}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-100 overflow-hidden">
                          {/* User Info Header */}
                          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                {profile?.avatar_url ? (
                                  <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name || 'User'}
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                                    <User className="w-5 h-5 text-blue-600" />
                                  </div>
                                )}
                                {profile?.is_verified && (
                                  <Crown className="absolute -bottom-1 -right-1 w-4 h-4 text-yellow-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">
                                  {profile?.full_name || t('header.user')}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                                {profile?.role && (
                                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRoleBadgeStyle(profile.role)}`}>
                                    {t(`profile.role.${profile.role}`)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Menu Items */}
                          <div className="py-1">
                            <Link
                              to="/dashboard"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-300"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Settings className="w-4 h-4 mr-3 text-blue-600" />
                              {t('header.dashboard')}
                            </Link>

                            <Link
                              to="/profile/edit"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-300"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <User className="w-4 h-4 mr-3 text-purple-600" />
                              {t('header.profile')}
                            </Link>
                            
                            {(profile?.role === 'buyer' || profile?.role === 'lawyer') && (
                              <Link
                                to="/deals"
                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-300"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <TrendingUp className="w-4 h-4 mr-3 text-green-600" />
                                {t('nav.deals')}
                              </Link>
                            )}
                            
                            <Link
                              to="/favorites"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-300"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Heart className="w-4 h-4 mr-3 text-red-500" />
                              {t('nav.favorites')}
                            </Link>
                            
                            {profile?.role !== 'buyer' && !profile?.is_verified && (
                              <Link
                                to="/verification"
                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-300"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Shield className="w-4 h-4 mr-3 text-yellow-600" />
                                {t('nav.verification')}
                              </Link>
                            )}
                            
                            {profile?.role === 'lovepay' && (
                              <Link
                                to="/lovepay/requests"
                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Wallet className="w-4 h-4 mr-3 text-purple-600" />
                                Love&Pay
                              </Link>
                            )}
                            
                            {profile?.role === 'realtor' && (
                              <Link
                                to="/ads"
                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-300"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Megaphone className="w-4 h-4 mr-3 text-purple-600" />
                                {t('nav.ads')}
                              </Link>
                            )}

                            {(profile?.role === 'realtor' || profile?.role === 'lovepay') && (
                              <Link
                                to="/analytics"
                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-300"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <BarChart3 className="w-4 h-4 mr-3 text-blue-600" />
                                {t('nav.analytics')}
                              </Link>
                            )}

                            {profile?.role === 'buyer' && (
                              <Link
                                to="/referral"
                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Users className="w-4 h-4 mr-3 text-purple-600" />
                                {t('nav.referral')}
                              </Link>
                            )}
                          </div>
                          
                          {/* Logout */}
                          <div className="border-t border-gray-100 pt-1">
                            <button
                              onClick={handleSignOut}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-300"
                            >
                              <LogOut className="w-4 h-4 mr-3 text-red-500" />
                              {t('header.logout')}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mobile Menu Toggle */}
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                  >
                    {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/auth"
                    className="text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all duration-300 font-medium text-sm"
                  >
                    {t('header.login')}
                  </Link>
                  <Link
                    to="/auth?mode=register"
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-1.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-xl text-sm font-medium transform hover:scale-105"
                  >
                    {t('header.register')}
                  </Link>
                  
                  {/* Mobile Menu Toggle for non-auth users */}
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                  >
                    {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`
          lg:hidden overflow-hidden transition-all duration-300 ease-in-out
          ${showMobileMenu ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="px-3 py-4 bg-gray-50/50 border-t border-gray-100">
            {/* Mobile Navigation */}
            <nav className="space-y-1">
              {[...primaryNavItems, ...secondaryNavItems].map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-lg
                      transition-all duration-300 font-medium text-sm
                      ${active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-white hover:text-blue-600'
                      }
                    `}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{t(item.label)}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile User Actions */}
            {user && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
                {profile?.role !== 'buyer' && profile?.role !== 'lawyer' && (
                  <Link
                    to="/properties/new"
                    className="flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-2.5 rounded-lg font-medium text-sm"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>{t('header.addProperty')}</span>
                  </Link>
                )}
                
                <Link
                  to="/favorites"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-white hover:text-red-600 transition-all duration-300 text-sm"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Heart className="w-5 h-5" />
                  <span>{t('nav.favorites')}</span>
                </Link>
                
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-all duration-300 text-sm"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Settings className="w-5 h-5" />
                  <span>{t('header.dashboard')}</span>
                </Link>
                
                {profile?.role !== 'buyer' && !profile?.is_verified && (
                  <Link
                    to="/verification"
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-white hover:text-yellow-600 transition-all duration-300 text-sm"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Shield className="w-5 h-5" />
                    <span>{t('nav.verification')}</span>
                  </Link>
                )}
                
                <button
                  onClick={() => {
                    handleSignOut();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-300 text-sm w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('header.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
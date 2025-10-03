import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<Language, string>> = {
  'header.title': { ru: 'MYES.GLOBAL', en: 'MYES.GLOBAL' },
  'header.login': { ru: 'Войти', en: 'Login' },
  'header.register': { ru: 'Регистрация', en: 'Register' },
  'header.logout': { ru: 'Выйти', en: 'Logout' },
  'header.dashboard': { ru: 'Панель', en: 'Dashboard' },
  'header.profile': { ru: 'Профиль', en: 'Profile' },
  'header.user': { ru: 'Пользователь', en: 'User' },
  'header.addProperty': { ru: 'Добавить объект', en: 'Add Property' },
  'header.dashboardShort': { ru: 'Панель', en: 'Dashboard' },
  'nav.home': { ru: 'Главная', en: 'Home' },
  'nav.feed': { ru: 'Лента', en: 'Feed' },
  'nav.properties': { ru: 'Недвижимость', en: 'Properties' },
  'nav.propertiesShort': { ru: 'Поиск', en: 'Search' },
  'nav.chats': { ru: 'Чаты', en: 'Chats' },
  'nav.deals': { ru: 'Сделки', en: 'Deals' },
  'nav.lawyers': { ru: 'Юристы', en: 'Lawyers' },
  'nav.compare': { ru: 'Сравнить', en: 'Compare' },
  'nav.ads': { ru: 'Реклама', en: 'Ads' },
  'nav.analytics': { ru: 'Аналитика', en: 'Analytics' },
  'nav.referral': { ru: 'Реферальная', en: 'Referral' },
  'nav.favorites': { ru: 'Избранное', en: 'Favorites' },
  'nav.savedSearches': { ru: 'Сохраненные', en: 'Saved Searches' },
  'nav.verification': { ru: 'Верификация', en: 'Verification' },
  'nav.more': { ru: 'Ещё', en: 'More' },
  'menu.main': { ru: 'Основное', en: 'Main' },
  'menu.discover': { ru: 'Открыть', en: 'Discover' },
  'menu.tools': { ru: 'Инструменты', en: 'Tools' },
  'menu.account': { ru: 'Аккаунт', en: 'Account' },
  'search.placeholder': { ru: 'Поиск недвижимости, локаций...', en: 'Search properties, locations...' },
  'profile.role.buyer': { ru: 'Покупатель', en: 'Buyer' },
  'profile.role.realtor': { ru: 'Риелтор', en: 'Realtor' },
  'profile.role.lawyer': { ru: 'Юрист', en: 'Lawyer' },
  'profile.role.lovepay': { ru: 'Love&Pay', en: 'Love&Pay' },
  'profile.role.admin': { ru: 'Админ', en: 'Admin' },
  'Rentals': { ru: 'Аренда', en: 'Rentals' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'ru' || saved === 'en') ? saved : 'en';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

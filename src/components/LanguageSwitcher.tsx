import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="relative">
      <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
        <button
          onClick={() => setLanguage('ru')}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-all ${
            language === 'ru'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="text-base">🇷🇺</span>
          <span>RU</span>
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-all ${
            language === 'en'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="text-base">🇺🇸</span>
          <span>EN</span>
        </button>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { ChevronDown, Globe, MapPin } from 'lucide-react';
import { useCountries, Country } from '../hooks/useCountries';
import { useLanguage } from '../contexts/LanguageContext';

interface CountrySelectorProps {
  className?: string;
  showLabel?: boolean;
  onCountryChange?: (country: Country) => void;
}

export function CountrySelector({ className = '', showLabel = true, onCountryChange }: CountrySelectorProps) {
  const { countries, selectedCountry, setSelectedCountry } = useCountries();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    if (onCountryChange) {
      onCountryChange(country);
    }
  };

  const getCountryName = (country: Country) => {
    return language === 'ru' ? country.nameRu : country.name;
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Регион / Region
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:border-gray-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{selectedCountry.flag}</span>
            <div>
              <div className="font-medium text-gray-900">
                {getCountryName(selectedCountry)}
              </div>
              <div className="text-sm text-gray-500">
                {selectedCountry.currency} ({selectedCountry.currencySymbol})
              </div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                  selectedCountry.code === country.code ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {getCountryName(country)}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{country.currency} ({country.currencySymbol})</span>
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">{country.phoneCode}</span>
                  </div>
                </div>
                {selectedCountry.code === country.code && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
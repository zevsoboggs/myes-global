import { useState, useEffect } from 'react';

export type Country = {
  code: string;
  name: string;
  nameRu: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  mapCenter: [number, number];
  mapZoom: number;
  phoneCode: string;
  timezone: string;
};

export const COUNTRIES: Country[] = [
  {
    code: 'ZA',
    name: 'South Africa',
    nameRu: 'ЮАР',
    currency: 'ZAR',
    currencySymbol: 'R',
    flag: '🇿🇦',
    mapCenter: [-25.7461, 28.1881], // Pretoria
    mapZoom: 6,
    phoneCode: '+27',
    timezone: 'Africa/Johannesburg'
  },
  {
    code: 'TH',
    name: 'Thailand',
    nameRu: 'Таиланд',
    currency: 'THB',
    currencySymbol: '฿',
    flag: '🇹🇭',
    mapCenter: [13.7563, 100.5018], // Bangkok
    mapZoom: 6,
    phoneCode: '+66',
    timezone: 'Asia/Bangkok'
  },
  {
    code: 'AE',
    name: 'UAE',
    nameRu: 'ОАЭ',
    currency: 'AED',
    currencySymbol: 'د.إ',
    flag: '🇦🇪',
    mapCenter: [24.2992, 54.6972], // Abu Dhabi
    mapZoom: 6,
    phoneCode: '+971',
    timezone: 'Asia/Dubai'
  },
  {
    code: 'GR',
    name: 'Greece',
    nameRu: 'Греция',
    currency: 'EUR',
    currencySymbol: '€',
    flag: '🇬🇷',
    mapCenter: [39.0742, 21.8243], // Athens area
    mapZoom: 6,
    phoneCode: '+30',
    timezone: 'Europe/Athens'
  },
  {
    code: 'VN',
    name: 'Vietnam',
    nameRu: 'Вьетнам',
    currency: 'VND',
    currencySymbol: '₫',
    flag: '🇻🇳',
    mapCenter: [14.0583, 108.2772], // Central Vietnam
    mapZoom: 6,
    phoneCode: '+84',
    timezone: 'Asia/Ho_Chi_Minh'
  },
  {
    code: 'ID',
    name: 'Indonesia',
    nameRu: 'Индонезия',
    currency: 'IDR',
    currencySymbol: 'Rp',
    flag: '🇮🇩',
    mapCenter: [-6.2088, 106.8456], // Jakarta
    mapZoom: 5,
    phoneCode: '+62',
    timezone: 'Asia/Jakarta'
  },
  {
    code: 'TR',
    name: 'Turkey',
    nameRu: 'Турция',
    currency: 'TRY',
    currencySymbol: '₺',
    flag: '🇹🇷',
    mapCenter: [39.9334, 32.8597], // Ankara
    mapZoom: 6,
    phoneCode: '+90',
    timezone: 'Europe/Istanbul'
  }
];

export function useCountries() {
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    const saved = localStorage.getItem('selectedCountry');
    if (saved) {
      try {
        const countryCode = JSON.parse(saved);
        return COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
      } catch {
        return COUNTRIES[0];
      }
    }
    return COUNTRIES[0]; // Default to South Africa
  });

  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('selectedCountry', JSON.stringify(selectedCountry.code));
  }, [selectedCountry]);

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      // Get exchange rates for all currencies we need
      const currencies = COUNTRIES.map(c => c.currency).join(',');
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/USD`
      );

      if (response.ok) {
        const data = await response.json();
        setExchangeRates(data.rates);
      } else {
        // Fallback rates if API fails
        setExchangeRates({
          ZAR: 18.5,
          THB: 35.2,
          AED: 3.67,
          EUR: 0.85,
          VND: 24500,
          IDR: 15800,
          TRY: 34.2
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback rates
      setExchangeRates({
        ZAR: 18.5,
        THB: 35.2,
        AED: 3.67,
        EUR: 0.85,
        VND: 24500,
        IDR: 15800,
        TRY: 34.2
      });
    } finally {
      setLoading(false);
    }
  };

  const convertFromUSDT = (usdtAmount: number, targetCurrency: string): number => {
    const rate = exchangeRates[targetCurrency];
    if (!rate) return usdtAmount;
    return usdtAmount * rate;
  };

  const formatPrice = (usdtAmount: number, country?: Country): string => {
    const targetCountry = country || selectedCountry;
    const localAmount = convertFromUSDT(usdtAmount, targetCountry.currency);

    // Format based on currency
    if (targetCountry.currency === 'VND' || targetCountry.currency === 'IDR') {
      // For large numbers, show in millions/billions
      if (localAmount >= 1000000000) {
        return `${targetCountry.currencySymbol}${(localAmount / 1000000000).toFixed(1)}B`;
      } else if (localAmount >= 1000000) {
        return `${targetCountry.currencySymbol}${(localAmount / 1000000).toFixed(1)}M`;
      }
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCountry.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(localAmount);
  };

  const getCountryByCode = (code: string): Country | undefined => {
    return COUNTRIES.find(c => c.code === code);
  };

  return {
    countries: COUNTRIES,
    selectedCountry,
    setSelectedCountry,
    exchangeRates,
    loading,
    convertFromUSDT,
    formatPrice,
    getCountryByCode,
    refreshRates: fetchExchangeRates
  };
}
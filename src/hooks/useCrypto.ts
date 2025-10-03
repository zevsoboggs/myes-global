import { useEffect, useState } from 'react';

type CryptoPrice = {
  bitcoin: { usd: number; zar: number; usd_24h_change: number };
  ethereum: { usd: number; zar: number; usd_24h_change: number };
};

export function useCrypto() {
  const [prices, setPrices] = useState<CryptoPrice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-prices`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setPrices(data);
      } catch (error) {
        console.error('Ошибка получения курсов криптовалют:', error);
        
        // Fallback данные если API недоступен
        setPrices({
          bitcoin: { 
            usd: 45000, 
            zar: 850000, 
            usd_24h_change: 2.5 
          },
          ethereum: { 
            usd: 2800, 
            zar: 53000, 
            usd_24h_change: 1.8 
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Обновляем каждую минуту

    return () => clearInterval(interval);
  }, []);

  return { prices, loading };
}
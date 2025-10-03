// Supabase Edge Function: crypto-prices
// Fetches crypto prices from CoinGecko and returns normalized JSON with CORS headers

// deno-lint-ignore no-explicit-any
const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=30, max-age=15',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  });

const handleOptions = () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  });

async function fetchCoinGecko() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,zar&include_24hr_change=true';
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) {
    throw new Error(`coingecko_http_${res.status}`);
  }
  const data = await res.json();
  return data;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return handleOptions();
    if (req.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405);

    const data = await fetchCoinGecko();
    // Expected shape: { bitcoin: { usd, zar, usd_24h_change, zar_24h_change }, ethereum: {...} }
    return jsonResponse(data, 200);
  } catch (e) {
    // Fallback values
    const fallback = {
      bitcoin: { usd: 45000, zar: 850000, usd_24h_change: 0 },
      ethereum: { usd: 2800, zar: 53000, usd_24h_change: 0 }
    };
    return jsonResponse({ ...fallback, _error: String(e) }, 200);
  }
});



// @ts-nocheck
// Supabase Edge Function: Create Veriff verification session
// Env required: VERIFF_API_KEY, VERIFF_SHARED_SECRET, (optional VERIFF_BASE_URL, VERIFF_INTEGRATION_ID), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type CreateSessionResponse = {
  status: string;
  verification: { id: string; url: string };
};

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const veriffApiKey = Deno.env.get('VERIFF_API_KEY');
    const veriffSecret = Deno.env.get('VERIFF_SHARED_SECRET');
    const veriffBase = (Deno.env.get('VERIFF_BASE_URL') || 'https://stationapi.veriff.com').replace(/\/$/, '');
    const veriffIntegrationId = Deno.env.get('VERIFF_INTEGRATION_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!veriffApiKey || !veriffSecret || !supabaseUrl || !serviceKey) {
      return new Response('Missing env', { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    const jwt = authHeader.replace('Bearer ', '').trim();
    const { data: userRes } = await supabase.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // Optional: fetch profile to pass name/email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name,email')
      .eq('id', user.id)
      .maybeSingle();

    const callbackUrl = `${supabaseUrl}/functions/v1/veriff-webhook`;
    const payload = {
      verification: {
        callback: callbackUrl,
        vendorData: user.id,
        person: {
          firstName: (profile?.full_name || 'User').split(' ')[0] || 'User',
          lastName: (profile?.full_name || 'MYES').split(' ').slice(1).join(' ') || 'MYES',
        },
      },
    };

    const url = `${veriffBase}/v1/sessions`;
    const signature = await hmacHex(veriffSecret, JSON.stringify(payload));
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'accept': 'application/json',
      'x-auth-client': veriffApiKey,
      'x-hmac-signature': signature,
    };
    if (veriffIntegrationId) headers['vrf-integration-id'] = veriffIntegrationId;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(`Veriff error: ${res.status} ${errText}`, { status: 500, headers: corsHeaders });
    }
    const data = (await res.json()) as CreateSessionResponse;
    return new Response(JSON.stringify({ url: data.verification.url, id: data.verification.id }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    return new Response(`Error: ${e?.message || e}`, { status: 500, headers: corsHeaders });
  }
});



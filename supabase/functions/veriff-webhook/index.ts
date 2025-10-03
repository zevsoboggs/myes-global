// @ts-nocheck
// Supabase Edge Function: Veriff webhook receiver
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Seamless redirect for browser hits (GET) to frontend callback
  if (req.method === 'GET') {
    const redirectTo = Deno.env.get('FRONTEND_CALLBACK_URL') || 'https://myes.global/veriff/callback';
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectTo } });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const veriffSecret = Deno.env.get('VERIFF_SHARED_SECRET');
    if (!supabaseUrl || !serviceKey) return new Response('Missing env', { status: 500, headers: corsHeaders });
    const supabase = createClient(supabaseUrl, serviceKey);

    const bodyText = await req.text();
    // Verify signature if shared secret is provided
    if (veriffSecret) {
      const sig = req.headers.get('x-hmac-signature') || req.headers.get('X-HMAC-SIGNATURE') || '';
      const expected = await hmacHex(veriffSecret, bodyText);
      if (!sig || sig.toLowerCase() !== expected.toLowerCase()) {
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
    }
    let body: any = {};
    try { body = JSON.parse(bodyText || '{}'); } catch { body = {}; }

    // Extract vendorData (user id) & decision across possible shapes
    const v = body?.verification || body;
    const vendorDataRaw = v?.vendorData || body?.vendorData || v?.session?.vendorData || v?.session?.vendor_data;
    const vendorData = vendorDataRaw ? String(vendorDataRaw) : null;
    if (!vendorData) return new Response('No vendorData', { status: 400, headers: corsHeaders });

    const decisionObj = v?.decision || body?.decision || v?.result || v;
    const statusStr = (decisionObj?.status || decisionObj?.decision || v?.status || '').toString().toLowerCase();
    const isVerified = statusStr === 'approved' || statusStr === 'approved_manual';

    await supabase.from('profiles').update({ is_verified: isVerified }).eq('id', vendorData);

    // Build concise admin notes
    const reason = decisionObj?.reason || decisionObj?.reasonCode || decisionObj?.code || null;
    const riskScore = body?.riskScore?.score ?? body?.verification?.riskScore?.score ?? null;
    const verifId = v?.id || body?.verification?.id || null;
    const summaryParts = [
      `status=${statusStr || 'unknown'}`,
      verifId ? `id=${verifId}` : '',
      reason ? `reason=${reason}` : '',
      (typeof riskScore === 'number') ? `risk=${String(riskScore)}` : '',
    ].filter(Boolean);
    const summary = `veriff: ${summaryParts.join(', ')}`;
    await supabase.from('verification_requests').insert({
      user_id: vendorData,
      document_url: '',
      status: isVerified ? 'approved' : 'rejected',
      admin_notes: summary,
    });

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(`Error: ${e?.message || e}`, { status: 500, headers: corsHeaders });
  }
});



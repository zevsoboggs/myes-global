// @ts-nocheck
// Supabase Edge Function: Properties API with filtering
// Public API endpoint for fetching properties with photos and filters
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return new Response('Server configuration error', { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse query parameters
    const url = new URL(req.url);
    const country = url.searchParams.get('country');
    const propertyType = url.searchParams.get('type');
    const minPrice = url.searchParams.get('min_price');
    const maxPrice = url.searchParams.get('max_price');
    const bedrooms = url.searchParams.get('bedrooms');
    const bathrooms = url.searchParams.get('bathrooms');
    const minArea = url.searchParams.get('min_area');
    const maxArea = url.searchParams.get('max_area');
    const status = url.searchParams.get('status') || 'active';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    const search = url.searchParams.get('search');

    // Build query
    let query = supabase
      .from('properties')
      .select(`
        id,
        title,
        description,
        address,
        latitude,
        longitude,
        property_type,
        price_usdt,
        area_sqm,
        bedrooms,
        bathrooms,
        features,
        is_active,
        views_count,
        created_at,
        updated_at,
        property_images (
          id,
          image_url,
          is_primary
        ),
        realtor:realtor_id (
          id,
          full_name,
          agency_name,
          phone,
          email
        )
      `, { count: 'exact' });

    // Apply filters
    if (country) {
      // Search in address field since there's no country field
      query = query.ilike('address', `%${country}%`);
    }

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    if (minPrice) {
      query = query.gte('price_usdt', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('price_usdt', parseFloat(maxPrice));
    }

    if (bedrooms) {
      query = query.eq('bedrooms', parseInt(bedrooms));
    }

    if (bathrooms) {
      query = query.eq('bathrooms', parseInt(bathrooms));
    }

    if (minArea) {
      query = query.gte('area_sqm', parseFloat(minArea));
    }

    if (maxArea) {
      query = query.lte('area_sqm', parseFloat(maxArea));
    }

    // Use is_active instead of status
    if (status === 'active' || !status) {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: 'Database query failed', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Transform data to include primary image
    const properties = (data || []).map(property => {
      const images = property.property_images || [];
      const primaryImage = images.find(img => img.is_primary) || images[0];

      return {
        ...property,
        primary_image: primaryImage?.image_url || null,
        images: images.map((img, index) => ({
          url: img.image_url,
          is_primary: img.is_primary,
          order: index
        })),
        property_images: undefined // Remove raw data
      };
    });

    // Prepare response
    const response = {
      success: true,
      data: properties,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0)
      },
      filters: {
        country,
        property_type: propertyType,
        min_price: minPrice,
        max_price: maxPrice,
        bedrooms,
        bathrooms,
        min_area: minArea,
        max_area: maxArea,
        status,
        search
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: e?.message || String(e)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
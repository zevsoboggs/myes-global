import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'myes-auth-token',
    storage: window.localStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  agency_name?: string;
  license_number?: string;
  is_verified: boolean;
  avatar_url?: string;
  bio?: string;
  role?: 'buyer' | 'realtor' | 'lawyer' | 'lovepay' | 'admin';
  is_admin?: boolean;
  payout_method?: 'fiat' | 'usdt';
  payout_details?: string;
  commission_rate?: number;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  realtor_id: string;
  title: string;
  description: string;
  price_usdt: number;
  property_type: 'apartment' | 'house' | 'villa' | 'commercial' | 'land';
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  address: string;
  latitude: number;
  longitude: number;
  features: string[];
  is_active: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  property_images?: PropertyImage[];
  virtual_tour_url?: string;
  video_url?: string;
};

export type PropertyImage = {
  id: string;
  property_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
};

export type VerificationRequest = {
  id: string;
  user_id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
};
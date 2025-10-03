-- Extend existing profiles table for lawyer functionality
-- First, update the role constraint to include 'lawyer' if not already present
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('buyer','realtor','lovepay','admin','lawyer'));

-- Add lawyer-specific columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[];

-- Create specializations lookup table
CREATE TABLE IF NOT EXISTS lawyer_specializations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ru TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- lucide icon name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lawyer-specialization junction table
CREATE TABLE IF NOT EXISTS lawyer_specialization_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  specialization_id UUID REFERENCES lawyer_specializations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lawyer_id, specialization_id)
);

-- Create lawyer reviews table
CREATE TABLE IF NOT EXISTS lawyer_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  case_type TEXT, -- what kind of legal case
  is_verified BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop existing lawyer_stats view if it exists and create table instead
DROP VIEW IF EXISTS lawyer_stats;

-- Create lawyer stats table for aggregated data
CREATE TABLE IF NOT EXISTS lawyer_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_cases INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0, -- percentage
  response_time_hours INTEGER DEFAULT 24,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_lawyer_verified ON profiles(role, is_verified) WHERE role = 'lawyer';
CREATE INDEX IF NOT EXISTS idx_profiles_lawyer_location ON profiles(location_country, location_city) WHERE role = 'lawyer';
CREATE INDEX IF NOT EXISTS idx_lawyer_reviews_lawyer_id ON lawyer_reviews(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_reviews_rating ON lawyer_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_lawyer_specialization_links_lawyer ON lawyer_specialization_links(lawyer_id);

-- Create function to update lawyer stats
CREATE OR REPLACE FUNCTION update_lawyer_stats(lawyer_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO lawyer_stats (lawyer_id, total_reviews, average_rating, updated_at)
  SELECT
    lawyer_uuid,
    COUNT(lr.id)::INTEGER,
    ROUND(AVG(lr.rating), 2),
    CURRENT_TIMESTAMP
  FROM lawyer_reviews lr
  WHERE lr.lawyer_id = lawyer_uuid
    AND lr.is_public = TRUE
  ON CONFLICT (lawyer_id)
  DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Create trigger to automatically update stats when reviews change
CREATE OR REPLACE FUNCTION trigger_update_lawyer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_lawyer_stats(OLD.lawyer_id);
    RETURN OLD;
  ELSE
    PERFORM update_lawyer_stats(NEW.lawyer_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS lawyer_reviews_stats_trigger ON lawyer_reviews;
CREATE TRIGGER lawyer_reviews_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON lawyer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_lawyer_stats();

-- Enable RLS on new tables only (not on existing profiles)
ALTER TABLE lawyer_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_specialization_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
-- Specializations: Anyone can read
CREATE POLICY "Anyone can view specializations" ON lawyer_specializations
  FOR SELECT TO PUBLIC USING (TRUE);

-- Specialization links: Anyone can view
CREATE POLICY "Anyone can view lawyer specializations" ON lawyer_specialization_links
  FOR SELECT TO PUBLIC USING (TRUE);

-- Reviews: Anyone can read public reviews, reviewers can manage their own
CREATE POLICY "Anyone can view public reviews" ON lawyer_reviews
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can manage their own reviews" ON lawyer_reviews
  FOR ALL USING (auth.uid() = reviewer_id);

-- Stats: Anyone can read
CREATE POLICY "Anyone can view lawyer stats" ON lawyer_stats
  FOR SELECT TO PUBLIC USING (TRUE);
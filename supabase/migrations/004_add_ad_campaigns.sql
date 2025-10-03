-- Create ad_campaigns table for managing property advertisements
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  realtor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Campaign details
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Status
  status TEXT CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'rejected')) DEFAULT 'draft',

  -- Budget
  daily_budget_usdt DECIMAL(10, 2),
  total_budget_usdt DECIMAL(10, 2),
  spent_usdt DECIMAL(10, 2) DEFAULT 0,

  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE,

  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0, -- Click-through rate
  cpc DECIMAL(10, 2) DEFAULT 0, -- Cost per click

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_budget CHECK (
    (daily_budget_usdt IS NOT NULL AND daily_budget_usdt > 0) OR
    (total_budget_usdt IS NOT NULL AND total_budget_usdt > 0)
  ),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create ad_campaign_analytics table for detailed tracking
CREATE TABLE IF NOT EXISTS ad_campaign_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend_usdt DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_ad_campaigns_realtor_id ON ad_campaigns(realtor_id);
CREATE INDEX idx_ad_campaigns_property_id ON ad_campaigns(property_id);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);
CREATE INDEX idx_ad_campaign_analytics_campaign_date ON ad_campaign_analytics(campaign_id, date);

-- Enable Row Level Security
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaign_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for ad_campaigns
-- Realtors can view and manage their own campaigns
CREATE POLICY "Realtors can view own campaigns" ON ad_campaigns
  FOR SELECT USING (auth.uid() = realtor_id);

CREATE POLICY "Realtors can insert own campaigns" ON ad_campaigns
  FOR INSERT WITH CHECK (auth.uid() = realtor_id);

CREATE POLICY "Realtors can update own campaigns" ON ad_campaigns
  FOR UPDATE USING (auth.uid() = realtor_id);

CREATE POLICY "Realtors can delete own campaigns" ON ad_campaigns
  FOR DELETE USING (auth.uid() = realtor_id);

-- Public can view active campaigns (for displaying ads)
CREATE POLICY "Public can view active campaigns" ON ad_campaigns
  FOR SELECT USING (status = 'active');

-- Policies for ad_campaign_analytics
-- Realtors can view analytics for their campaigns
CREATE POLICY "Realtors can view own campaign analytics" ON ad_campaign_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      WHERE ad_campaigns.id = ad_campaign_analytics.campaign_id
      AND ad_campaigns.realtor_id = auth.uid()
    )
  );

-- System can insert analytics (through backend/functions)
CREATE POLICY "System can insert analytics" ON ad_campaign_analytics
  FOR INSERT WITH CHECK (true);

-- Function to update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the campaign's total metrics
  UPDATE ad_campaigns
  SET
    impressions = impressions + NEW.impressions,
    clicks = clicks + NEW.clicks,
    conversions = conversions + NEW.conversions,
    spent_usdt = spent_usdt + NEW.spend_usdt,
    ctr = CASE
      WHEN (impressions + NEW.impressions) > 0
      THEN ((clicks + NEW.clicks)::DECIMAL / (impressions + NEW.impressions)) * 100
      ELSE 0
    END,
    cpc = CASE
      WHEN (clicks + NEW.clicks) > 0
      THEN (spent_usdt + NEW.spend_usdt) / (clicks + NEW.clicks)
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating campaign metrics
CREATE TRIGGER trigger_update_campaign_metrics
  AFTER INSERT ON ad_campaign_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics();

-- Function to auto-complete campaigns that have ended
CREATE OR REPLACE FUNCTION auto_complete_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE ad_campaigns
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-start campaigns
CREATE OR REPLACE FUNCTION auto_start_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE ad_campaigns
  SET status = 'active', updated_at = NOW()
  WHERE status = 'pending'
    AND start_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
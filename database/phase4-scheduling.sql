-- =====================================================
-- AgriTrack Phase 4: Dynamic Harvest Scheduler Schema
-- =====================================================
-- This migration adds support for:
-- 1. Harvest scheduling with cluster-based windows
-- 2. Green credits incentive system
-- 3. Advisory SMS tracking
-- 4. Machine availability tracking
--
-- Run this in Supabase SQL Editor after phase3-farmers.sql

-- =====================================================
-- HELPER FUNCTION (if not exists)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HARVEST CLUSTERS TABLE
-- Groups districts/areas into harvest windows based on NDVI
-- =====================================================
CREATE TABLE IF NOT EXISTS harvest_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_name VARCHAR(100) NOT NULL,  -- e.g., "Cluster A - Ludhiana Early"
  region VARCHAR(100) NOT NULL,        -- e.g., "Punjab", "Haryana"
  districts TEXT[] NOT NULL,           -- Array of district names in this cluster
  
  -- Harvest window assignment
  window_start_date DATE NOT NULL,
  window_end_date DATE NOT NULL,
  
  -- NDVI-based prediction data
  avg_ndvi DECIMAL(5, 4),
  predicted_harvest_date DATE,
  priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
  
  -- Machine allocation
  machines_allocated INTEGER DEFAULT 0,
  machines_required INTEGER DEFAULT 0,
  
  -- Season tracking
  season VARCHAR(50) NOT NULL DEFAULT 'Kharif 2025', -- e.g., "Kharif 2025", "Rabi 2025-26"
  crop_type VARCHAR(50) DEFAULT 'rice',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- =====================================================
-- FARMER HARVEST SCHEDULES TABLE
-- Links farmers to their assigned harvest windows
-- =====================================================
CREATE TABLE IF NOT EXISTS farmer_harvest_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES harvest_clusters(id) ON DELETE SET NULL,
  field_id UUID REFERENCES farmer_fields(id) ON DELETE SET NULL,
  
  -- Crop information
  crop_type VARCHAR(100) NOT NULL DEFAULT 'rice',  -- 'rice', 'wheat', 'sugarcane', etc.
  crop_stage VARCHAR(50) DEFAULT 'growing',        -- 'growing', 'maturing', 'harvest_ready', 'harvested'
  
  -- NDVI data for this specific field
  current_ndvi DECIMAL(5, 4),
  ndvi_decline_rate DECIMAL(8, 6),
  last_ndvi_update TIMESTAMPTZ,
  
  -- Assigned harvest window
  assigned_window_start DATE,
  assigned_window_end DATE,
  optimal_harvest_date DATE,
  
  -- Farmer response
  farmer_accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  preferred_date DATE,  -- If farmer requests different date
  rejection_reason TEXT,
  
  -- Booking priority (earned by following schedule)
  priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('normal', 'priority', 'premium')),
  priority_booking_enabled BOOLEAN DEFAULT FALSE,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting for NDVI analysis
    'scheduled',    -- Window assigned
    'notified',     -- SMS sent
    'accepted',     -- Farmer accepted
    'booking_open', -- Can book machines
    'in_progress',  -- Harvesting started
    'completed',    -- Harvesting done
    'missed'        -- Farmer missed window
  )),
  
  -- Season
  season VARCHAR(50) NOT NULL DEFAULT 'Kharif 2025',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per farmer per season
  UNIQUE(farmer_id, season, field_id)
);

-- =====================================================
-- GREEN CREDITS TABLE
-- Incentive system for farmers following schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS green_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES farmer_harvest_schedules(id) ON DELETE SET NULL,
  
  -- Credit details
  credits_earned INTEGER NOT NULL DEFAULT 0,
  credit_type VARCHAR(50) NOT NULL CHECK (credit_type IN (
    'schedule_accepted',    -- +10 credits for accepting schedule
    'on_time_harvest',      -- +50 credits for harvesting in window
    'no_burning',           -- +100 credits for verified no-burn
    'referral',             -- +20 credits for referring other farmers
    'early_booking',        -- +15 credits for booking 7+ days ahead
    'feedback_bonus',       -- +5 credits for providing feedback
    'first_time_bonus'      -- +25 credits for first-time users
  )),
  
  -- Description
  description TEXT,
  
  -- Redemption
  credits_redeemed INTEGER DEFAULT 0,
  redeemed_for VARCHAR(255),  -- e.g., "Discount on next booking"
  redeemed_at TIMESTAMPTZ,
  
  -- Verification (for no_burning credits)
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(50), -- 'satellite', 'field_visit', 'auto'
  
  -- Metadata
  season VARCHAR(50) DEFAULT 'Kharif 2025',
  expires_at TIMESTAMPTZ, -- Credits expire after 1 year
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADVISORY SMS LOGS TABLE
-- Track all SMS sent for scheduling advisories
-- (NOT for machine faults - those stay on dashboard only)
-- =====================================================
CREATE TABLE IF NOT EXISTS advisory_sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES farmer_harvest_schedules(id) ON DELETE SET NULL,
  
  -- SMS details
  phone_number VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
    'schedule_assigned',    -- Initial window assignment
    'reminder_3day',        -- Reminder 3 days before window
    'reminder_1day',        -- Reminder 1 day before window
    'booking_open',         -- Booking window opened
    'booking_confirmed',    -- Machine booking confirmed
    'weather_alert',        -- Weather affecting schedule
    'incentive_earned',     -- Green credits notification
    'window_closing',       -- Window closing soon
    'thank_you'             -- Post-harvest thank you
  )),
  message_content TEXT NOT NULL,
  language VARCHAR(20) DEFAULT 'hindi',
  
  -- Twilio response
  twilio_sid VARCHAR(100),
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'queued', 'sent', 'delivered', 'failed', 'undelivered'
  )),
  error_code VARCHAR(20),
  error_message TEXT,
  
  -- Cost tracking
  message_segments INTEGER DEFAULT 1,
  cost_inr DECIMAL(10, 4),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MACHINE AVAILABILITY TABLE
-- Track machine availability per region/date for scheduling
-- =====================================================
CREATE TABLE IF NOT EXISTS machine_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  
  -- Availability window
  available_date DATE NOT NULL,
  available_from TIME DEFAULT '06:00',
  available_until TIME DEFAULT '18:00',
  
  -- Location
  district VARCHAR(100),
  state VARCHAR(100),
  cluster_id UUID REFERENCES harvest_clusters(id) ON DELETE SET NULL,
  
  -- Capacity
  max_acres_per_day DECIMAL(10, 2) DEFAULT 10,
  acres_booked DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  is_available BOOLEAN DEFAULT TRUE,
  booked_by UUID REFERENCES farmer_profiles(id),
  booking_id UUID REFERENCES bookings(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent double booking
  UNIQUE(machine_id, available_date)
);

-- =====================================================
-- NDVI FIELD DATA TABLE
-- Store NDVI readings for farmer fields
-- =====================================================
CREATE TABLE IF NOT EXISTS field_ndvi_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_id UUID NOT NULL REFERENCES farmer_fields(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  
  -- NDVI reading
  ndvi_value DECIMAL(5, 4) NOT NULL CHECK (ndvi_value >= -1 AND ndvi_value <= 1),
  reading_date DATE NOT NULL,
  
  -- Source
  data_source VARCHAR(50) DEFAULT 'sentinel2', -- 'sentinel2', 'landsat', 'simulated'
  cloud_cover_percentage DECIMAL(5, 2),
  
  -- Derived values
  crop_health VARCHAR(20), -- 'excellent', 'good', 'moderate', 'poor', 'critical'
  growth_stage VARCHAR(50), -- 'vegetative', 'reproductive', 'ripening', 'harvest_ready'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One reading per field per day
  UNIQUE(field_id, reading_date)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_harvest_clusters_dates 
  ON harvest_clusters(window_start_date, window_end_date);
CREATE INDEX IF NOT EXISTS idx_harvest_clusters_region 
  ON harvest_clusters(region);
CREATE INDEX IF NOT EXISTS idx_harvest_clusters_status 
  ON harvest_clusters(status);
CREATE INDEX IF NOT EXISTS idx_harvest_clusters_season 
  ON harvest_clusters(season);

CREATE INDEX IF NOT EXISTS idx_farmer_schedules_farmer 
  ON farmer_harvest_schedules(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_schedules_cluster 
  ON farmer_harvest_schedules(cluster_id);
CREATE INDEX IF NOT EXISTS idx_farmer_schedules_status 
  ON farmer_harvest_schedules(status);
CREATE INDEX IF NOT EXISTS idx_farmer_schedules_dates 
  ON farmer_harvest_schedules(assigned_window_start, assigned_window_end);
CREATE INDEX IF NOT EXISTS idx_farmer_schedules_crop 
  ON farmer_harvest_schedules(crop_type, crop_stage);
CREATE INDEX IF NOT EXISTS idx_farmer_schedules_season 
  ON farmer_harvest_schedules(season);

CREATE INDEX IF NOT EXISTS idx_green_credits_farmer 
  ON green_credits(farmer_id);
CREATE INDEX IF NOT EXISTS idx_green_credits_season 
  ON green_credits(season);
CREATE INDEX IF NOT EXISTS idx_green_credits_type 
  ON green_credits(credit_type);

CREATE INDEX IF NOT EXISTS idx_advisory_sms_farmer 
  ON advisory_sms_logs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_advisory_sms_status 
  ON advisory_sms_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_advisory_sms_type 
  ON advisory_sms_logs(message_type);

CREATE INDEX IF NOT EXISTS idx_machine_availability_date 
  ON machine_availability(available_date);
CREATE INDEX IF NOT EXISTS idx_machine_availability_district 
  ON machine_availability(district);
CREATE INDEX IF NOT EXISTS idx_machine_availability_cluster 
  ON machine_availability(cluster_id);

CREATE INDEX IF NOT EXISTS idx_field_ndvi_field 
  ON field_ndvi_data(field_id);
CREATE INDEX IF NOT EXISTS idx_field_ndvi_date 
  ON field_ndvi_data(reading_date);
CREATE INDEX IF NOT EXISTS idx_field_ndvi_farmer 
  ON field_ndvi_data(farmer_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS harvest_clusters_updated_at ON harvest_clusters;
CREATE TRIGGER harvest_clusters_updated_at 
  BEFORE UPDATE ON harvest_clusters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS farmer_schedules_updated_at ON farmer_harvest_schedules;
CREATE TRIGGER farmer_schedules_updated_at 
  BEFORE UPDATE ON farmer_harvest_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS machine_availability_updated_at ON machine_availability;
CREATE TRIGGER machine_availability_updated_at 
  BEFORE UPDATE ON machine_availability 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================
ALTER TABLE harvest_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_harvest_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_ndvi_data ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on harvest_clusters" 
  ON harvest_clusters FOR ALL USING (true);
CREATE POLICY "Service role full access on farmer_harvest_schedules" 
  ON farmer_harvest_schedules FOR ALL USING (true);
CREATE POLICY "Service role full access on green_credits" 
  ON green_credits FOR ALL USING (true);
CREATE POLICY "Service role full access on advisory_sms_logs" 
  ON advisory_sms_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on machine_availability" 
  ON machine_availability FOR ALL USING (true);
CREATE POLICY "Service role full access on field_ndvi_data" 
  ON field_ndvi_data FOR ALL USING (true);

-- =====================================================
-- UPDATE FARMER_FIELDS TABLE
-- Add NDVI tracking columns if not exists
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'farmer_fields' AND column_name = 'current_ndvi') THEN
    ALTER TABLE farmer_fields ADD COLUMN current_ndvi DECIMAL(5, 4);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'farmer_fields' AND column_name = 'ndvi_history') THEN
    ALTER TABLE farmer_fields ADD COLUMN ndvi_history JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'farmer_fields' AND column_name = 'last_ndvi_update') THEN
    ALTER TABLE farmer_fields ADD COLUMN last_ndvi_update TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'farmer_fields' AND column_name = 'predicted_harvest_date') THEN
    ALTER TABLE farmer_fields ADD COLUMN predicted_harvest_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'farmer_fields' AND column_name = 'harvest_window_start') THEN
    ALTER TABLE farmer_fields ADD COLUMN harvest_window_start DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'farmer_fields' AND column_name = 'harvest_window_end') THEN
    ALTER TABLE farmer_fields ADD COLUMN harvest_window_end DATE;
  END IF;
END $$;

-- =====================================================
-- VIEWS FOR DASHBOARD
-- =====================================================

-- View: Cluster Overview with Machine Stats
CREATE OR REPLACE VIEW v_cluster_overview AS
SELECT 
  hc.id,
  hc.cluster_name,
  hc.region,
  hc.districts,
  hc.window_start_date,
  hc.window_end_date,
  hc.avg_ndvi,
  hc.priority_score,
  hc.status,
  hc.season,
  hc.machines_allocated,
  hc.machines_required,
  COUNT(DISTINCT fhs.farmer_id) as farmers_count,
  COUNT(DISTINCT CASE WHEN fhs.farmer_accepted THEN fhs.farmer_id END) as farmers_accepted,
  ROUND(
    COUNT(DISTINCT CASE WHEN fhs.farmer_accepted THEN fhs.farmer_id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT fhs.farmer_id), 0) * 100, 2
  ) as acceptance_rate
FROM harvest_clusters hc
LEFT JOIN farmer_harvest_schedules fhs ON fhs.cluster_id = hc.id
GROUP BY hc.id;

-- View: Farmer Schedule Summary with Green Credits
CREATE OR REPLACE VIEW v_farmer_schedule_summary AS
SELECT 
  fhs.id,
  fhs.farmer_id,
  fp.full_name as farmer_name,
  fp.phone as farmer_phone,
  fp.district,
  fhs.crop_type,
  fhs.crop_stage,
  fhs.current_ndvi,
  fhs.assigned_window_start,
  fhs.assigned_window_end,
  fhs.optimal_harvest_date,
  fhs.farmer_accepted,
  fhs.priority_level,
  fhs.status,
  fhs.season,
  hc.cluster_name,
  COALESCE(SUM(gc.credits_earned - gc.credits_redeemed), 0) as total_green_credits
FROM farmer_harvest_schedules fhs
JOIN farmer_profiles fp ON fp.id = fhs.farmer_id
LEFT JOIN harvest_clusters hc ON hc.id = fhs.cluster_id
LEFT JOIN green_credits gc ON gc.farmer_id = fhs.farmer_id AND gc.verified = true
GROUP BY fhs.id, fp.full_name, fp.phone, fp.district, hc.cluster_name;

-- View: Machine Availability Heatmap Data
CREATE OR REPLACE VIEW v_machine_availability_heatmap AS
SELECT 
  ma.available_date,
  ma.district,
  ma.state,
  COUNT(*) as total_machines,
  COUNT(CASE WHEN ma.is_available THEN 1 END) as available_machines,
  COUNT(CASE WHEN NOT ma.is_available THEN 1 END) as booked_machines,
  SUM(ma.max_acres_per_day) as total_capacity_acres,
  SUM(ma.acres_booked) as booked_acres,
  ROUND(
    COUNT(CASE WHEN ma.is_available THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as availability_percentage
FROM machine_availability ma
GROUP BY ma.available_date, ma.district, ma.state
ORDER BY ma.available_date, ma.district;

-- View: Green Credits Leaderboard
CREATE OR REPLACE VIEW v_green_credits_leaderboard AS
SELECT 
  fp.id as farmer_id,
  fp.full_name,
  fp.district,
  fp.state,
  COALESCE(SUM(gc.credits_earned), 0) as total_earned,
  COALESCE(SUM(gc.credits_redeemed), 0) as total_redeemed,
  COALESCE(SUM(gc.credits_earned - gc.credits_redeemed), 0) as available_credits,
  COUNT(gc.id) as total_transactions,
  MAX(gc.created_at) as last_activity
FROM farmer_profiles fp
LEFT JOIN green_credits gc ON gc.farmer_id = fp.id
GROUP BY fp.id, fp.full_name, fp.district, fp.state
ORDER BY available_credits DESC;

-- View: SMS Campaign Stats
CREATE OR REPLACE VIEW v_sms_campaign_stats AS
SELECT 
  DATE(created_at) as date,
  message_type,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as delivery_rate,
  SUM(cost_inr) as total_cost
FROM advisory_sms_logs
GROUP BY DATE(created_at), message_type
ORDER BY date DESC, message_type;

-- =====================================================
-- FUNCTIONS FOR SCHEDULING
-- =====================================================

-- Function: Calculate farmer's total green credits
CREATE OR REPLACE FUNCTION get_farmer_green_credits(p_farmer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(credits_earned - credits_redeemed)
     FROM green_credits
     WHERE farmer_id = p_farmer_id
       AND verified = true
       AND (expires_at IS NULL OR expires_at > NOW())),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Award green credits to farmer
CREATE OR REPLACE FUNCTION award_green_credits(
  p_farmer_id UUID,
  p_credit_type VARCHAR(50),
  p_credits INTEGER,
  p_schedule_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  INSERT INTO green_credits (
    farmer_id, schedule_id, credits_earned, credit_type, 
    description, verified, verified_at, verification_method,
    expires_at, season
  ) VALUES (
    p_farmer_id, p_schedule_id, p_credits, p_credit_type,
    COALESCE(p_description, 'Awarded for ' || p_credit_type),
    true, NOW(), 'auto',
    NOW() + INTERVAL '1 year', 'Kharif 2025'
  )
  RETURNING id INTO v_credit_id;
  
  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get farmer's current harvest schedule
CREATE OR REPLACE FUNCTION get_farmer_harvest_schedule(p_farmer_id UUID, p_season VARCHAR DEFAULT 'Kharif 2025')
RETURNS TABLE (
  schedule_id UUID,
  cluster_name VARCHAR,
  window_start DATE,
  window_end DATE,
  optimal_date DATE,
  status VARCHAR,
  priority_level VARCHAR,
  green_credits INTEGER,
  booking_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fhs.id,
    hc.cluster_name,
    fhs.assigned_window_start,
    fhs.assigned_window_end,
    fhs.optimal_harvest_date,
    fhs.status,
    fhs.priority_level,
    get_farmer_green_credits(p_farmer_id),
    fhs.priority_booking_enabled
  FROM farmer_harvest_schedules fhs
  LEFT JOIN harvest_clusters hc ON hc.id = fhs.cluster_id
  WHERE fhs.farmer_id = p_farmer_id
    AND fhs.season = p_season
  ORDER BY fhs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- =====================================================

-- Uncomment to insert sample clusters for testing
/*
INSERT INTO harvest_clusters (cluster_name, region, districts, window_start_date, window_end_date, avg_ndvi, priority_score, machines_required, machines_allocated, status) VALUES
('Cluster A - Ludhiana Early', 'Punjab', ARRAY['Ludhiana', 'Moga'], '2025-10-15', '2025-10-20', 0.42, 8, 15, 12, 'active'),
('Cluster B - Patiala Mid', 'Punjab', ARRAY['Patiala', 'Sangrur', 'Barnala'], '2025-10-20', '2025-10-25', 0.48, 7, 20, 18, 'pending'),
('Cluster C - Amritsar Late', 'Punjab', ARRAY['Amritsar', 'Tarn Taran', 'Gurdaspur'], '2025-10-25', '2025-10-30', 0.55, 5, 18, 15, 'pending'),
('Cluster D - Karnal Early', 'Haryana', ARRAY['Karnal', 'Kaithal'], '2025-10-18', '2025-10-23', 0.45, 7, 12, 10, 'pending'),
('Cluster E - Hisar Mid', 'Haryana', ARRAY['Hisar', 'Fatehabad', 'Sirsa'], '2025-10-23', '2025-10-28', 0.50, 6, 16, 14, 'pending');
*/

COMMENT ON TABLE harvest_clusters IS 'Groups districts into harvest windows based on NDVI analysis to normalize machine demand';
COMMENT ON TABLE farmer_harvest_schedules IS 'Individual farmer assignments to harvest clusters with status tracking';
COMMENT ON TABLE green_credits IS 'Incentive system rewarding farmers for following schedules and avoiding stubble burning';
COMMENT ON TABLE advisory_sms_logs IS 'Tracks SMS sent for harvest advisories (NOT machine faults)';
COMMENT ON TABLE machine_availability IS 'Daily machine availability by location for scheduling optimization';
COMMENT ON TABLE field_ndvi_data IS 'Historical NDVI readings for farmer fields from satellite data';

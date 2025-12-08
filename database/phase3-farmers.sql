-- AgriTrack Phase 3: Enhanced Farmer Features
-- Run this in Supabase SQL Editor after the main schema

-- =====================================================
-- FARMER PROFILES (Enhanced user data for farmers)
-- =====================================================

CREATE TABLE farmer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  -- Personal Info
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  email VARCHAR(255),
  profile_image_url TEXT,
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  village VARCHAR(255),
  district VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  pincode VARCHAR(10),
  -- Identification
  aadhaar_number VARCHAR(12), -- Last 4 digits stored or encrypted
  pan_number VARCHAR(10),
  -- Farming Info
  farming_experience_years INTEGER DEFAULT 0,
  primary_crops TEXT[], -- Array of crop types
  -- Preferences
  preferred_language VARCHAR(50) DEFAULT 'hindi',
  notification_language VARCHAR(50) DEFAULT 'hindi',
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FARMER FIELDS/FARMS
-- =====================================================

CREATE TABLE farmer_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE NOT NULL,
  -- Field Info
  name VARCHAR(255) NOT NULL, -- e.g., "Main Field", "North Plot"
  area_acres DECIMAL(10, 2) NOT NULL,
  -- Location
  village VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  -- GPS Coordinates (center of field)
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  -- Boundary polygon (optional)
  boundary_coords JSONB, -- Array of {lat, lng} for polygon
  -- Soil & Crop Info
  soil_type VARCHAR(100), -- 'alluvial', 'black', 'red', 'laterite', etc.
  irrigation_type VARCHAR(100), -- 'canal', 'tubewell', 'rainfed', etc.
  current_crop VARCHAR(100),
  last_harvest_date DATE,
  next_sowing_date DATE,
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FARMER SERVICE HISTORY
-- =====================================================

CREATE TABLE farmer_service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  field_id UUID REFERENCES farmer_fields(id),
  machine_id UUID REFERENCES machines(id),
  -- Service Details
  service_type VARCHAR(100) NOT NULL, -- 'harvesting', 'baling', 'plowing', etc.
  service_date DATE NOT NULL,
  acres_serviced DECIMAL(10, 2),
  hours_worked DECIMAL(5, 2),
  -- Pricing
  rate_per_acre DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed', 'refunded')),
  payment_method VARCHAR(50), -- 'cash', 'upi', 'bank_transfer', etc.
  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FARMER PAYMENTS/TRANSACTIONS
-- =====================================================

CREATE TABLE farmer_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  service_history_id UUID REFERENCES farmer_service_history(id),
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'deposit', 'advance')),
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_reference VARCHAR(255), -- UPI/Bank ref number
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  -- Timestamps
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FARMER NOTIFICATIONS LOG
-- =====================================================

CREATE TABLE farmer_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE NOT NULL,
  -- Notification Details
  type VARCHAR(100) NOT NULL, -- 'booking_confirmed', 'machine_arriving', 'payment_due', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  -- Delivery
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('sms', 'push', 'email', 'whatsapp')),
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  -- Read Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_farmer_profiles_user_id ON farmer_profiles(user_id);
CREATE INDEX idx_farmer_profiles_district ON farmer_profiles(district);
CREATE INDEX idx_farmer_profiles_phone ON farmer_profiles(phone);
CREATE INDEX idx_farmer_fields_farmer_id ON farmer_fields(farmer_id);
CREATE INDEX idx_farmer_fields_district ON farmer_fields(district);
CREATE INDEX idx_farmer_service_history_farmer_id ON farmer_service_history(farmer_id);
CREATE INDEX idx_farmer_service_history_date ON farmer_service_history(service_date DESC);
CREATE INDEX idx_farmer_transactions_farmer_id ON farmer_transactions(farmer_id);
CREATE INDEX idx_farmer_notifications_farmer_id ON farmer_notifications(farmer_id);
CREATE INDEX idx_farmer_notifications_created_at ON farmer_notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_notifications ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access on farmer_profiles" ON farmer_profiles FOR ALL USING (true);
CREATE POLICY "Service role full access on farmer_fields" ON farmer_fields FOR ALL USING (true);
CREATE POLICY "Service role full access on farmer_service_history" ON farmer_service_history FOR ALL USING (true);
CREATE POLICY "Service role full access on farmer_transactions" ON farmer_transactions FOR ALL USING (true);
CREATE POLICY "Service role full access on farmer_notifications" ON farmer_notifications FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER farmer_profiles_updated_at BEFORE UPDATE ON farmer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER farmer_fields_updated_at BEFORE UPDATE ON farmer_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER farmer_service_history_updated_at BEFORE UPDATE ON farmer_service_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- First, insert sample users as farmers
INSERT INTO users (id, clerk_id, email, name, phone, role) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'farmer_001', 'ranjit@example.com', 'Ranjit Singh', '+919876543210', 'farmer'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'farmer_002', 'gurpreet@example.com', 'Gurpreet Kaur', '+919876543211', 'farmer'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'farmer_003', 'harinder@example.com', 'Harinder Pal', '+919876543212', 'farmer')
ON CONFLICT (clerk_id) DO NOTHING;

-- Insert farmer profiles
INSERT INTO farmer_profiles (user_id, full_name, phone, district, state, village, farming_experience_years, primary_crops, is_verified) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ranjit Singh', '+919876543210', 'Ludhiana', 'Punjab', 'Khanna', 15, ARRAY['wheat', 'rice', 'cotton'], true),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Gurpreet Kaur', '+919876543211', 'Amritsar', 'Punjab', 'Ajnala', 10, ARRAY['wheat', 'paddy'], true),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Harinder Pal', '+919876543212', 'Karnal', 'Haryana', 'Nissing', 8, ARRAY['wheat', 'sugarcane'], false);

-- Insert farmer fields
INSERT INTO farmer_fields (farmer_id, name, area_acres, village, district, state, latitude, longitude, soil_type, irrigation_type, current_crop) 
SELECT 
  fp.id,
  'Main Field',
  12.5,
  fp.village,
  fp.district,
  fp.state,
  30.8990 + (random() * 0.1),
  75.8500 + (random() * 0.1),
  'alluvial',
  'tubewell',
  'wheat'
FROM farmer_profiles fp
WHERE fp.full_name = 'Ranjit Singh';

INSERT INTO farmer_fields (farmer_id, name, area_acres, village, district, state, latitude, longitude, soil_type, irrigation_type, current_crop) 
SELECT 
  fp.id,
  'North Plot',
  8.0,
  fp.village,
  fp.district,
  fp.state,
  31.6340 + (random() * 0.1),
  74.8723 + (random() * 0.1),
  'alluvial',
  'canal',
  'paddy'
FROM farmer_profiles fp
WHERE fp.full_name = 'Gurpreet Kaur';

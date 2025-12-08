-- AgriTrack Phase 6: Farmers Authentication Table
-- Run this in Supabase SQL Editor to enable farmer registration

-- Farmers table for mobile app authentication
CREATE TABLE IF NOT EXISTS farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  pin_hash VARCHAR(255) NOT NULL, -- In production, use proper hashing
  name VARCHAR(255) NOT NULL,
  village VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  total_land_area DECIMAL(10, 2) DEFAULT 0,
  aadhaar_last4 VARCHAR(4),
  green_certified BOOLEAN DEFAULT FALSE,
  green_credits INTEGER DEFAULT 0,
  crops JSONB DEFAULT '[]'::jsonb,
  language_preference VARCHAR(20) DEFAULT 'hindi',
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Green credit transaction logs
CREATE TABLE IF NOT EXISTS green_credit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL,
  reason TEXT,
  balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district);
CREATE INDEX IF NOT EXISTS idx_farmers_green_certified ON farmers(green_certified);
CREATE INDEX IF NOT EXISTS idx_green_credit_logs_farmer_id ON green_credit_logs(farmer_id);

-- Enable RLS
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_credit_logs ENABLE ROW LEVEL SECURITY;

-- Service role policies (for backend API)
CREATE POLICY "Service role full access on farmers" ON farmers FOR ALL USING (true);
CREATE POLICY "Service role full access on green_credit_logs" ON green_credit_logs FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert demo farmers (optional - for testing)
INSERT INTO farmers (phone, pin_hash, name, village, district, state, total_land_area, green_certified, green_credits, crops)
VALUES 
  ('9876543210', '1234', 'Gurpreet Singh', 'Jagraon', 'Ludhiana', 'Punjab', 15, true, 250, '["Rice", "Wheat"]'::jsonb),
  ('9123456789', '5678', 'Rajender Kumar', 'Nissing', 'Karnal', 'Haryana', 8, false, 75, '["Rice"]'::jsonb),
  ('8765432109', '4321', 'Harjinder Kaur', 'Rajpura', 'Patiala', 'Punjab', 22, true, 450, '["Rice", "Wheat", "Sugarcane"]'::jsonb),
  ('7654321098', '9876', 'Sukhdev Singh', 'Ajnala', 'Amritsar', 'Punjab', 12, true, 320, '["Rice", "Wheat"]'::jsonb),
  ('6543210987', '1111', 'Balwinder Kaur', 'Malerkotla', 'Sangrur', 'Punjab', 18, false, 50, '["Rice"]'::jsonb),
  ('7980638514', '1234', 'Srijbasu', '', '', '', 0, false, 0, '[]'::jsonb)
ON CONFLICT (phone) DO NOTHING;

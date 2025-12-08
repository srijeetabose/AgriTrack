-- Phase 5: Green Farmers and Marketplace Schema
-- This migration adds tables for green certification and mandi integration

-- Table for farmer green certification
CREATE TABLE IF NOT EXISTS farmer_green_certification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id),
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    green_credits INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    total_straw_managed DECIMAL(10, 2) DEFAULT 0, -- in tonnes
    co2_prevented DECIMAL(10, 2) DEFAULT 0, -- in tonnes
    verified_by VARCHAR(255),
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Green farmer activities log
CREATE TABLE IF NOT EXISTS green_farmer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id),
    activity_type VARCHAR(50) NOT NULL, -- 'booking', 'completion', 'referral', 'bonus'
    credits_earned INTEGER NOT NULL,
    description TEXT,
    booking_id UUID REFERENCES bookings(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Mandi prices table (updated regularly)
CREATE TABLE IF NOT EXISTS mandi_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    market VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    modal_price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'Quintal',
    arrival_date DATE NOT NULL,
    trend VARCHAR(10) DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    trend_percent DECIMAL(5, 2) DEFAULT 0,
    green_premium_percent DECIMAL(5, 2) DEFAULT 20, -- Premium for green farmers
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Farmer sell requests through portal
CREATE TABLE IF NOT EXISTS farmer_sell_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id),
    commodity VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'Quintal',
    requested_price DECIMAL(10, 2) NOT NULL,
    is_green_farmer BOOLEAN DEFAULT false,
    green_premium_applied BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    approved_price DECIMAL(10, 2),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Green farmer benefits claimed
CREATE TABLE IF NOT EXISTS green_farmer_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES farmers(id),
    benefit_type VARCHAR(50) NOT NULL, -- 'premium_price', 'priority_booking', 'subsidy', 'equipment_discount'
    benefit_value DECIMAL(10, 2),
    benefit_description TEXT,
    claimed_at TIMESTAMP DEFAULT NOW(),
    reference_id UUID, -- Can reference booking_id, sell_request_id, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_green_cert_farmer ON farmer_green_certification(farmer_id);
CREATE INDEX IF NOT EXISTS idx_green_cert_active ON farmer_green_certification(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_green_activities_farmer ON green_farmer_activities(farmer_id);
CREATE INDEX IF NOT EXISTS idx_mandi_commodity ON mandi_prices(commodity);
CREATE INDEX IF NOT EXISTS idx_mandi_market ON mandi_prices(market);
CREATE INDEX IF NOT EXISTS idx_mandi_date ON mandi_prices(arrival_date);
CREATE INDEX IF NOT EXISTS idx_sell_requests_farmer ON farmer_sell_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON farmer_sell_requests(status);

-- Insert sample mandi prices
INSERT INTO mandi_prices (commodity, variety, market, state, district, min_price, max_price, modal_price, arrival_date, trend, trend_percent, green_premium_percent)
VALUES 
    ('Wheat', 'Lokwan', 'Azadpur', 'Delhi', 'New Delhi', 2200, 2600, 2400, CURRENT_DATE, 'up', 3.5, 20),
    ('Rice', 'Basmati', 'Azadpur', 'Delhi', 'New Delhi', 4800, 5500, 5200, CURRENT_DATE, 'up', 2.1, 18),
    ('Paddy', 'Common', 'Ludhiana', 'Punjab', 'Ludhiana', 2100, 2300, 2183, CURRENT_DATE, 'stable', 0.5, 22),
    ('Mustard', 'Yellow', 'Jaipur', 'Rajasthan', 'Jaipur', 5200, 5800, 5500, CURRENT_DATE, 'down', 1.2, 15),
    ('Cotton', 'Medium Staple', 'Nagpur', 'Maharashtra', 'Nagpur', 6400, 6900, 6700, CURRENT_DATE, 'up', 4.2, 25),
    ('Sugarcane', 'Hybrid', 'Meerut', 'Uttar Pradesh', 'Meerut', 350, 380, 365, CURRENT_DATE, 'stable', 0.3, 18),
    ('Maize', 'Yellow', 'Guntur', 'Andhra Pradesh', 'Guntur', 1900, 2200, 2050, CURRENT_DATE, 'up', 1.8, 20),
    ('Soybean', 'Yellow', 'Indore', 'Madhya Pradesh', 'Indore', 4600, 5100, 4850, CURRENT_DATE, 'down', 2.5, 22),
    ('Potato', 'Red', 'Agra', 'Uttar Pradesh', 'Agra', 1200, 1500, 1350, CURRENT_DATE, 'up', 5.2, 15),
    ('Onion', 'Red', 'Nashik', 'Maharashtra', 'Nashik', 1800, 2200, 2000, CURRENT_DATE, 'up', 8.5, 18)
ON CONFLICT DO NOTHING;

-- Update farmers table to add green certification fields (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmers' AND column_name = 'is_green_farmer') THEN
        ALTER TABLE farmers ADD COLUMN is_green_farmer BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmers' AND column_name = 'green_credits') THEN
        ALTER TABLE farmers ADD COLUMN green_credits INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farmers' AND column_name = 'green_tier') THEN
        ALTER TABLE farmers ADD COLUMN green_tier VARCHAR(20) DEFAULT 'bronze';
    END IF;
END $$;

-- Function to update green tier based on credits
CREATE OR REPLACE FUNCTION update_green_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.green_tier := CASE
        WHEN NEW.green_credits >= 1001 THEN 'platinum'
        WHEN NEW.green_credits >= 501 THEN 'gold'
        WHEN NEW.green_credits >= 101 THEN 'silver'
        ELSE 'bronze'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tier when credits change
DROP TRIGGER IF EXISTS trigger_update_green_tier ON farmers;
CREATE TRIGGER trigger_update_green_tier
BEFORE UPDATE OF green_credits ON farmers
FOR EACH ROW
EXECUTE FUNCTION update_green_tier();

-- Sample green certification for demo farmer
-- This will be inserted only if the demo farmer exists
DO $$
DECLARE
    demo_farmer_id UUID;
BEGIN
    SELECT id INTO demo_farmer_id FROM farmers WHERE phone = '+91 9876543210' LIMIT 1;
    IF demo_farmer_id IS NOT NULL THEN
        INSERT INTO farmer_green_certification (
            farmer_id, 
            certificate_number, 
            issue_date, 
            expiry_date, 
            green_credits, 
            tier,
            total_straw_managed,
            co2_prevented,
            verified_by,
            verification_date
        ) VALUES (
            demo_farmer_id,
            'GC-PB-2024-001234',
            CURRENT_DATE - INTERVAL '6 months',
            CURRENT_DATE + INTERVAL '18 months',
            750,
            'gold',
            45.5,
            82.0,
            'Punjab Agriculture Department',
            CURRENT_DATE - INTERVAL '6 months'
        ) ON CONFLICT (certificate_number) DO NOTHING;
        
        -- Update farmer as green
        UPDATE farmers SET is_green_farmer = true, green_credits = 750, green_tier = 'gold'
        WHERE id = demo_farmer_id;
    END IF;
END $$;

COMMENT ON TABLE farmer_green_certification IS 'Stores green certification details for farmers who practice sustainable farming';
COMMENT ON TABLE green_farmer_activities IS 'Logs activities that earn green credits for farmers';
COMMENT ON TABLE mandi_prices IS 'Real-time mandi prices fetched from data.gov.in API';
COMMENT ON TABLE farmer_sell_requests IS 'Farmers sell requests through the marketplace portal';
COMMENT ON TABLE green_farmer_benefits IS 'Benefits claimed by green certified farmers';

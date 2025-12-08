-- AgriTrack Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin', 'operator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines table
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'tractor', 'harvester', 'baler', etc.
  model VARCHAR(255),
  owner_id UUID REFERENCES users(id),
  district VARCHAR(255),
  state VARCHAR(255),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
  last_location JSONB, -- { lat, lng }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  farmer_id UUID REFERENCES users(id) NOT NULL,
  scheduled_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  acres_covered DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor logs table (time-series data)
CREATE TABLE sensor_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  temperature DECIMAL(5, 2),
  vibration_x DECIMAL(10, 6),
  vibration_y DECIMAL(10, 6),
  vibration_z DECIMAL(10, 6),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  speed DECIMAL(6, 2),
  state VARCHAR(50),
  alerts JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'overheat', 'vibration', 'geofence', 'idle'
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sensor_logs_machine_id ON sensor_logs(machine_id);
CREATE INDEX idx_sensor_logs_timestamp ON sensor_logs(timestamp DESC);
CREATE INDEX idx_sensor_logs_device_id ON sensor_logs(device_id);
CREATE INDEX idx_bookings_farmer_id ON bookings(farmer_id);
CREATE INDEX idx_bookings_machine_id ON bookings(machine_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_alerts_machine_id ON alerts(machine_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Service role can access everything (for backend)
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access on machines" ON machines FOR ALL USING (true);
CREATE POLICY "Service role full access on bookings" ON bookings FOR ALL USING (true);
CREATE POLICY "Service role full access on sensor_logs" ON sensor_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on alerts" ON alerts FOR ALL USING (true);

-- Insert sample machines for testing
INSERT INTO machines (device_id, name, type, model, district, state, status) VALUES
  ('sim_001', 'Tractor Alpha', 'tractor', 'John Deere 5050D', 'Ludhiana', 'Punjab', 'available'),
  ('sim_002', 'Harvester Beta', 'harvester', 'Mahindra Arjun 605', 'Amritsar', 'Punjab', 'available'),
  ('sim_003', 'Baler Gamma', 'baler', 'New Holland 3630', 'Karnal', 'Haryana', 'available'),
  ('sim_004', 'Tractor Delta', 'tractor', 'Swaraj 744 FE', 'Rohtak', 'Haryana', 'available'),
  ('sim_005', 'Tractor Epsilon', 'tractor', 'Sonalika DI 750', 'Hisar', 'Haryana', 'available'),
  ('real_01', 'Real Device 01', 'tractor', 'ESP32 Prototype', 'Delhi', 'Delhi', 'available');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER machines_updated_at BEFORE UPDATE ON machines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- PHASE 2: Enhanced Features Tables
-- =====================================================

-- Notification Preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'overheat', 'vibration', 'geofence', 'maintenance', 'fuel', etc.
  sms_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

-- Push tokens table (for Firebase)
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token TEXT NOT NULL,
  device_type VARCHAR(50), -- 'ios', 'android', 'web'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences table
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('circle', 'polygon')),
  center_lat DECIMAL(10, 7),
  center_lng DECIMAL(10, 7),
  radius_meters DECIMAL(10, 2),
  polygon_coords JSONB, -- Array of {lat, lng} for polygon type
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence machine assignments
CREATE TABLE geofence_machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(geofence_id, machine_id)
);

-- Geofence breach logs
CREATE TABLE geofence_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id),
  machine_id UUID REFERENCES machines(id),
  breach_type VARCHAR(20) CHECK (breach_type IN ('entered', 'exited')),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel logs table
CREATE TABLE fuel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  fuel_level DECIMAL(5, 2) NOT NULL, -- percentage 0-100
  previous_level DECIMAL(5, 2),
  consumption_rate DECIMAL(8, 4), -- liters per hour
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  engine_hours DECIMAL(10, 2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Refueling events table
CREATE TABLE refueling_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  amount_liters DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  odometer_reading DECIMAL(10, 2),
  engine_hours DECIMAL(10, 2),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance schedules table
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  maintenance_type VARCHAR(100) NOT NULL, -- 'oil_change', 'filter_replacement', 'full_service', etc.
  due_date DATE,
  due_mileage DECIMAL(10, 2),
  due_hours DECIMAL(10, 2),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
  notes TEXT,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  assigned_to UUID REFERENCES users(id),
  completed_date TIMESTAMPTZ,
  recurring_interval_days INTEGER,
  recurring_interval_mileage DECIMAL(10, 2),
  recurring_interval_hours DECIMAL(10, 2),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance history table
CREATE TABLE maintenance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  schedule_id UUID REFERENCES maintenance_schedules(id),
  maintenance_type VARCHAR(100) NOT NULL,
  completed_date TIMESTAMPTZ NOT NULL,
  performed_by VARCHAR(255),
  cost DECIMAL(10, 2),
  notes TEXT,
  parts_replaced JSONB, -- Array of parts
  mileage_at_service DECIMAL(10, 2),
  hours_at_service DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for Phase 2 tables
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_geofences_owner_id ON geofences(owner_id);
CREATE INDEX idx_geofence_machines_geofence_id ON geofence_machines(geofence_id);
CREATE INDEX idx_geofence_machines_machine_id ON geofence_machines(machine_id);
CREATE INDEX idx_geofence_breaches_machine_id ON geofence_breaches(machine_id);
CREATE INDEX idx_geofence_breaches_timestamp ON geofence_breaches(timestamp DESC);
CREATE INDEX idx_fuel_logs_machine_id ON fuel_logs(machine_id);
CREATE INDEX idx_fuel_logs_timestamp ON fuel_logs(timestamp DESC);
CREATE INDEX idx_refueling_events_machine_id ON refueling_events(machine_id);
CREATE INDEX idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id);
CREATE INDEX idx_maintenance_schedules_status ON maintenance_schedules(status);
CREATE INDEX idx_maintenance_schedules_due_date ON maintenance_schedules(due_date);
CREATE INDEX idx_maintenance_history_machine_id ON maintenance_history(machine_id);

-- RLS for Phase 2 tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refueling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;

-- Service role policies for Phase 2 tables
CREATE POLICY "Service role full access on notification_preferences" ON notification_preferences FOR ALL USING (true);
CREATE POLICY "Service role full access on push_tokens" ON push_tokens FOR ALL USING (true);
CREATE POLICY "Service role full access on geofences" ON geofences FOR ALL USING (true);
CREATE POLICY "Service role full access on geofence_machines" ON geofence_machines FOR ALL USING (true);
CREATE POLICY "Service role full access on geofence_breaches" ON geofence_breaches FOR ALL USING (true);
CREATE POLICY "Service role full access on fuel_logs" ON fuel_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on refueling_events" ON refueling_events FOR ALL USING (true);
CREATE POLICY "Service role full access on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true);
CREATE POLICY "Service role full access on maintenance_history" ON maintenance_history FOR ALL USING (true);

-- Triggers for Phase 2 tables
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER geofences_updated_at BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

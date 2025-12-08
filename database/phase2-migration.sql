-- =====================================================
-- PHASE 2: Enhanced Features Migration
-- Run this AFTER the initial schema.sql has been applied
-- This script only creates new tables, won't affect existing data
-- =====================================================

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
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
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token TEXT NOT NULL,
  device_type VARCHAR(50), -- 'ios', 'android', 'web'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences table
CREATE TABLE IF NOT EXISTS geofences (
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
CREATE TABLE IF NOT EXISTS geofence_machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(geofence_id, machine_id)
);

-- Geofence breach logs
CREATE TABLE IF NOT EXISTS geofence_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id),
  machine_id UUID REFERENCES machines(id),
  breach_type VARCHAR(20) CHECK (breach_type IN ('entered', 'exited')),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
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
CREATE TABLE IF NOT EXISTS refueling_events (
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
CREATE TABLE IF NOT EXISTS maintenance_schedules (
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
CREATE TABLE IF NOT EXISTS maintenance_history (
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

-- Create indexes for Phase 2 tables (IF NOT EXISTS not supported, using DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_preferences_user_id') THEN
    CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_push_tokens_user_id') THEN
    CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_geofences_owner_id') THEN
    CREATE INDEX idx_geofences_owner_id ON geofences(owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_geofence_machines_geofence_id') THEN
    CREATE INDEX idx_geofence_machines_geofence_id ON geofence_machines(geofence_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_geofence_machines_machine_id') THEN
    CREATE INDEX idx_geofence_machines_machine_id ON geofence_machines(machine_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_geofence_breaches_machine_id') THEN
    CREATE INDEX idx_geofence_breaches_machine_id ON geofence_breaches(machine_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_geofence_breaches_timestamp') THEN
    CREATE INDEX idx_geofence_breaches_timestamp ON geofence_breaches(timestamp DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fuel_logs_machine_id') THEN
    CREATE INDEX idx_fuel_logs_machine_id ON fuel_logs(machine_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fuel_logs_timestamp') THEN
    CREATE INDEX idx_fuel_logs_timestamp ON fuel_logs(timestamp DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refueling_events_machine_id') THEN
    CREATE INDEX idx_refueling_events_machine_id ON refueling_events(machine_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_schedules_machine_id') THEN
    CREATE INDEX idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_schedules_status') THEN
    CREATE INDEX idx_maintenance_schedules_status ON maintenance_schedules(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_schedules_due_date') THEN
    CREATE INDEX idx_maintenance_schedules_due_date ON maintenance_schedules(due_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_history_machine_id') THEN
    CREATE INDEX idx_maintenance_history_machine_id ON maintenance_history(machine_id);
  END IF;
END $$;

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

-- Service role policies for Phase 2 tables (drop if exists, then create)
DROP POLICY IF EXISTS "Service role full access on notification_preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Service role full access on push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Service role full access on geofences" ON geofences;
DROP POLICY IF EXISTS "Service role full access on geofence_machines" ON geofence_machines;
DROP POLICY IF EXISTS "Service role full access on geofence_breaches" ON geofence_breaches;
DROP POLICY IF EXISTS "Service role full access on fuel_logs" ON fuel_logs;
DROP POLICY IF EXISTS "Service role full access on refueling_events" ON refueling_events;
DROP POLICY IF EXISTS "Service role full access on maintenance_schedules" ON maintenance_schedules;
DROP POLICY IF EXISTS "Service role full access on maintenance_history" ON maintenance_history;

CREATE POLICY "Service role full access on notification_preferences" ON notification_preferences FOR ALL USING (true);
CREATE POLICY "Service role full access on push_tokens" ON push_tokens FOR ALL USING (true);
CREATE POLICY "Service role full access on geofences" ON geofences FOR ALL USING (true);
CREATE POLICY "Service role full access on geofence_machines" ON geofence_machines FOR ALL USING (true);
CREATE POLICY "Service role full access on geofence_breaches" ON geofence_breaches FOR ALL USING (true);
CREATE POLICY "Service role full access on fuel_logs" ON fuel_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on refueling_events" ON refueling_events FOR ALL USING (true);
CREATE POLICY "Service role full access on maintenance_schedules" ON maintenance_schedules FOR ALL USING (true);
CREATE POLICY "Service role full access on maintenance_history" ON maintenance_history FOR ALL USING (true);

-- Triggers for Phase 2 tables (drop if exists, then create)
DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS push_tokens_updated_at ON push_tokens;
DROP TRIGGER IF EXISTS geofences_updated_at ON geofences;
DROP TRIGGER IF EXISTS maintenance_schedules_updated_at ON maintenance_schedules;

CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER geofences_updated_at BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Success message
DO $$ BEGIN RAISE NOTICE 'Phase 2 migration completed successfully!'; END $$;

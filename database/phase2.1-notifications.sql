-- Phase 2.1: Add owner contact fields to machines table for notifications
-- Run this migration to enable SMS/Push notifications to machine owners

-- Add owner contact fields to machines table
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS owner_push_token TEXT;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_machines_owner_phone ON machines(owner_phone) WHERE owner_phone IS NOT NULL;

-- Add notification_sent timestamp to alerts table
ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;

-- Create notification_log table to track all sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id),
  device_id VARCHAR(50),
  notification_type VARCHAR(20) NOT NULL, -- 'sms', 'push', 'email'
  alert_type VARCHAR(50),
  recipient VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
  external_id VARCHAR(100), -- Twilio SID or Firebase message ID
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for querying notification history
CREATE INDEX IF NOT EXISTS idx_notification_log_machine ON notification_log(machine_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type, alert_type);

-- Update some sample machines with owner phone for testing
-- (Replace with actual phone numbers)
UPDATE machines 
SET owner_phone = '+919903026854'
WHERE device_id IN ('sim_001', 'sim_002', 'sim_003')
AND owner_phone IS NULL;

COMMENT ON COLUMN machines.owner_phone IS 'Machine owner phone number for SMS alerts';
COMMENT ON COLUMN machines.owner_email IS 'Machine owner email for email alerts';
COMMENT ON COLUMN machines.owner_push_token IS 'Firebase push token for mobile notifications';

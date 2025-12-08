/**
 * Notifications API Routes
 */
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notifications');
const db = require('../services/database');

/**
 * GET /api/notifications/preferences/:userId
 * Get notification preferences for a user
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', req.params.userId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/preferences
 * Save notification preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { userId, alertType, smsEnabled, pushEnabled, emailEnabled } = req.body;

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        alert_type: alertType,
        sms_enabled: smsEnabled ?? true,
        push_enabled: pushEnabled ?? true,
        email_enabled: emailEnabled ?? false
      }, { onConflict: 'user_id,alert_type' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/push-token
 * Register push notification token
 */
router.post('/push-token', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { userId, token, deviceType } = req.body;

    // Check if token already exists
    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .single();

    if (existing) {
      return res.json({ message: 'Token already registered', id: existing.id });
    }

    const { data, error } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token,
        device_type: deviceType
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/notifications/push-token
 * Remove push notification token
 */
router.delete('/push-token', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { token } = req.body;

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) throw error;
    res.json({ message: 'Token removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/send
 * Send a notification (admin only)
 */
router.post('/send', async (req, res) => {
  try {
    const { type, userId, title, message, data } = req.body;

    let result = {};

    if (type === 'sms' && req.body.phone) {
      const smsResult = await notificationService.sendSms(req.body.phone, message);
      result.sms = smsResult ? 'sent' : 'failed';
    }

    if (type === 'push' && req.body.token) {
      const pushResult = await notificationService.sendPushNotification(
        req.body.token,
        title,
        message,
        data
      );
      result.push = pushResult ? 'sent' : 'failed';
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/bulk-sms
 * Send bulk SMS (admin only)
 */
router.post('/bulk-sms', async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'phoneNumbers must be an array' });
    }

    const results = await notificationService.sendBulkSms(phoneNumbers, message);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import alert manager for testing routes
const alertManager = require('../services/alertManager');

/**
 * POST /api/notifications/test-alert
 * Send a test alert to verify notification system
 */
router.post('/test-alert', async (req, res) => {
  try {
    const { deviceId, phone, alertType } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Send test alert
    const result = await alertManager.sendTestAlert(deviceId || 'test_device', phone);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test alert sent successfully!' : 'Failed to send test alert',
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/simulate-alert
 * Simulate different types of alerts for testing
 */
router.post('/simulate-alert', async (req, res) => {
  try {
    const { deviceId, alertType, value } = req.body;

    if (!deviceId || !alertType) {
      return res.status(400).json({ error: 'deviceId and alertType are required' });
    }

    let result;
    switch (alertType) {
      case 'overheat':
        result = await alertManager.handleOverheatAlert(deviceId, value || 95, 90);
        break;
      case 'vibration':
        result = await alertManager.handleVibrationAlert(deviceId, value || 0.8, 0.5);
        break;
      case 'fuel_low':
        result = await alertManager.handleFuelAlert(deviceId, value || 15);
        break;
      case 'fuel_critical':
        result = await alertManager.handleFuelAlert(deviceId, value || 5);
        break;
      case 'geofence':
        result = await alertManager.handleGeofenceAlert(deviceId, 'Test Zone', 'exited', {
          lat: 30.9010,
          lng: 75.8573
        });
        break;
      case 'maintenance':
        result = await alertManager.handleMaintenanceAlert(deviceId, 'Oil Change', '2025-12-10');
        break;
      default:
        return res.status(400).json({ error: `Unknown alert type: ${alertType}` });
    }

    res.json({
      success: true,
      alertType,
      deviceId,
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/notifications/alert-stats
 * Get alert statistics
 */
router.get('/alert-stats', async (req, res) => {
  try {
    const stats = alertManager.getAlertStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/register-owner
 * Register machine owner contact for notifications
 */
router.post('/register-owner', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { deviceId, phone, email, pushToken } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Update machine with owner contact info
    const { data, error } = await supabase
      .from('machines')
      .update({
        owner_phone: phone,
        owner_email: email,
        owner_push_token: pushToken,
        updated_at: new Date().toISOString()
      })
      .eq('device_id', deviceId)
      .select()
      .single();

    if (error) throw error;

    // Reload machine owners cache
    alertManager.loadMachineOwners();

    res.json({
      success: true,
      message: 'Owner contact registered successfully',
      machine: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

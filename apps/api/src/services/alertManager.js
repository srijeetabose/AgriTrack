/**
 * Alert Manager Service
 * Centralized alert handling with SMS, Push, and database persistence
 * Integrates all Phase 2 features for automated notifications
 */

const notificationService = require('./notifications');

class AlertManager {
  constructor() {
    this.db = null;
    this.machineOwners = new Map(); // Cache: machineId -> owner contact info
    this.alertHistory = new Map(); // Track recent alerts for rate limiting
    
    // Alert cooldowns (ms) - prevent spam
    this.cooldowns = {
      overheat: 5 * 60 * 1000,      // 5 minutes
      vibration: 10 * 60 * 1000,    // 10 minutes
      geofence: 15 * 60 * 1000,     // 15 minutes
      fuel_low: 30 * 60 * 1000,     // 30 minutes
      fuel_critical: 10 * 60 * 1000, // 10 minutes
      maintenance: 24 * 60 * 60 * 1000, // 24 hours
      anomaly: 5 * 60 * 1000,       // 5 minutes
      default: 5 * 60 * 1000        // 5 minutes
    };

    // SMS recipients for different alert types
    // NOTE: Machine fault SMS disabled to save Twilio credits
    // SMS is only used for scheduling/advisory notifications to farmers
    this.alertConfig = {
      overheat: { sms: false, push: true, severity: 'critical' },      // SMS disabled - dashboard only
      vibration: { sms: false, push: true, severity: 'warning' },      // SMS disabled - dashboard only
      geofence: { sms: false, push: true, severity: 'warning' },       // SMS disabled - dashboard only
      fuel_low: { sms: false, push: true, severity: 'warning' },       // SMS disabled - dashboard only
      fuel_critical: { sms: false, push: true, severity: 'critical' }, // SMS disabled - dashboard only
      maintenance: { sms: false, push: true, severity: 'info' },       // SMS disabled - dashboard only
      anomaly: { sms: false, push: true, severity: 'critical' },       // SMS disabled - dashboard only
      default: { sms: false, push: true, severity: 'info' }
    };

    // Admin phone for critical alerts - DISABLED for machine faults
    // Only used for scheduling system now
    this.adminPhone = null; // Disabled: process.env.ADMIN_PHONE
  }

  setSupabase(client) {
    this.db = client;
    this.loadMachineOwners();
  }

  /**
   * Load machine owners from database for notification routing
   */
  async loadMachineOwners() {
    if (!this.db) return;

    try {
      const { data: machines } = await this.db
        .from('machines')
        .select('id, device_id, name, owner_phone, owner_email, owner_push_token');

      if (machines) {
        machines.forEach(m => {
          this.machineOwners.set(m.device_id, {
            machineId: m.id,
            name: m.name,
            phone: m.owner_phone,
            email: m.owner_email,
            pushToken: m.owner_push_token
          });
        });
        console.log(`📋 Loaded ${machines.length} machine owner contacts`);
      }
    } catch (err) {
      console.error('Error loading machine owners:', err.message);
    }
  }

  /**
   * Check if alert should be sent (rate limiting)
   */
  shouldSendAlert(deviceId, alertType) {
    const key = `${deviceId}_${alertType}`;
    const lastSent = this.alertHistory.get(key);
    const cooldown = this.cooldowns[alertType] || this.cooldowns.default;

    if (lastSent && Date.now() - lastSent < cooldown) {
      return false;
    }

    this.alertHistory.set(key, Date.now());
    return true;
  }

  /**
   * Process and send alert notification
   */
  async processAlert(deviceId, alert) {
    const { type, message, severity: alertSeverity, data } = alert;
    
    // Check rate limit
    if (!this.shouldSendAlert(deviceId, type)) {
      console.log(`⏳ Alert rate-limited: ${deviceId} - ${type}`);
      return { sent: false, reason: 'rate_limited' };
    }

    // Get configuration for this alert type
    const config = this.alertConfig[type] || this.alertConfig.default;
    const severity = alertSeverity || config.severity;

    // Get machine owner info
    const owner = this.machineOwners.get(deviceId) || {};
    const machineName = owner.name || deviceId;

    console.log(`🚨 Processing ${severity.toUpperCase()} alert for ${machineName}: ${type}`);

    const results = { sms: null, push: null, db: null };

    // Persist alert to database
    if (this.db) {
      try {
        const { data: alertRecord } = await this.db
          .from('alerts')
          .insert({
            machine_id: owner.machineId,
            device_id: deviceId,
            alert_type: type,
            severity,
            message,
            data: data || {},
            acknowledged: false
          })
          .select()
          .single();
        
        results.db = { success: true, id: alertRecord?.id };
      } catch (err) {
        console.error('Error persisting alert:', err.message);
        results.db = { success: false, error: err.message };
      }
    }

    // Build notification content
    const title = this.getAlertTitle(type, severity);
    const body = `${machineName}: ${message}`;
    const smsBody = this.formatSmsAlert(type, machineName, message, severity);

    // Send SMS for configured alert types
    if (config.sms) {
      const phoneToUse = owner.phone || this.adminPhone;
      if (phoneToUse) {
        results.sms = await notificationService.sendSMS(phoneToUse, smsBody);
        if (results.sms.success) {
          console.log(`📱 SMS sent for ${type} alert to ${phoneToUse}`);
        }
      } else {
        console.log(`📵 No phone number for ${type} alert - skipping SMS`);
      }
    }

    // Send Push notification
    if (config.push && owner.pushToken) {
      results.push = await notificationService.sendPushNotification(
        owner.pushToken,
        title,
        body,
        { deviceId, alertType: type, severity, timestamp: Date.now().toString() }
      );
    }

    // For critical alerts, also notify admin - DISABLED for machine faults
    // if (severity === 'critical' && this.adminPhone && this.adminPhone !== owner.phone) {
    //   await notificationService.sendSMS(this.adminPhone, `[ADMIN] ${smsBody}`);
    // }

    return { sent: true, results };
  }

  /**
   * Get alert title based on type
   */
  getAlertTitle(type, severity) {
    const icons = {
      overheat: '🔥',
      vibration: '📳',
      geofence: '📍',
      fuel_low: '⛽',
      fuel_critical: '🚨⛽',
      maintenance: '🔧',
      anomaly: '⚠️',
      default: '🔔'
    };

    const icon = icons[type] || icons.default;
    const severityBadge = severity === 'critical' ? '🚨' : '';
    
    return `${severityBadge}${icon} AgriTrack: ${type.replace('_', ' ').toUpperCase()}`;
  }

  /**
   * Format SMS alert message
   */
  formatSmsAlert(type, machineName, message, severity) {
    const timestamp = new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });

    return `[AgriTrack] ${severity.toUpperCase()} ALERT
Machine: ${machineName}
Type: ${type.replace('_', ' ')}
${message}
Time: ${timestamp}
---
Reply STOP to unsubscribe`;
  }

  /**
   * Process overheat alert
   */
  async handleOverheatAlert(deviceId, temperature, threshold) {
    return this.processAlert(deviceId, {
      type: 'overheat',
      message: `Engine temperature ${temperature}°C exceeds safe limit (${threshold}°C). Stop operation immediately!`,
      severity: 'critical',
      data: { temperature, threshold }
    });
  }

  /**
   * Process vibration alert
   */
  async handleVibrationAlert(deviceId, magnitude, threshold) {
    const severity = magnitude > threshold * 1.5 ? 'critical' : 'warning';
    return this.processAlert(deviceId, {
      type: 'vibration',
      message: `Abnormal vibration detected (${magnitude.toFixed(3)}g). Check for mechanical issues.`,
      severity,
      data: { magnitude, threshold }
    });
  }

  /**
   * Process geofence breach alert
   */
  async handleGeofenceAlert(deviceId, geofenceName, breachType, location) {
    return this.processAlert(deviceId, {
      type: 'geofence',
      message: `Machine ${breachType} designated zone "${geofenceName}". Location: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
      severity: 'warning',
      data: { geofenceName, breachType, location }
    });
  }

  /**
   * Process fuel alert
   */
  async handleFuelAlert(deviceId, fuelLevel) {
    const type = fuelLevel < 10 ? 'fuel_critical' : 'fuel_low';
    const severity = fuelLevel < 10 ? 'critical' : 'warning';
    
    return this.processAlert(deviceId, {
      type,
      message: `Fuel level at ${fuelLevel}%. ${fuelLevel < 10 ? 'Refuel immediately!' : 'Refueling recommended.'}`,
      severity,
      data: { fuelLevel }
    });
  }

  /**
   * Process maintenance due alert
   */
  async handleMaintenanceAlert(deviceId, maintenanceType, dueDate) {
    return this.processAlert(deviceId, {
      type: 'maintenance',
      message: `Scheduled ${maintenanceType} is due on ${dueDate}. Please schedule service.`,
      severity: 'info',
      data: { maintenanceType, dueDate }
    });
  }

  /**
   * Process AI anomaly detection alert
   */
  async handleAnomalyAlert(deviceId, anomalyType, details) {
    return this.processAlert(deviceId, {
      type: 'anomaly',
      message: `AI detected ${anomalyType}: ${details}. Investigation recommended.`,
      severity: 'critical',
      data: { anomalyType, details }
    });
  }

  /**
   * Send test notification (for testing purposes)
   */
  async sendTestAlert(deviceId, phone) {
    const owner = this.machineOwners.get(deviceId);
    const machineName = owner?.name || deviceId;

    const smsBody = `[AgriTrack] TEST ALERT
Machine: ${machineName}
This is a test notification.
Your alert system is working correctly!
Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    return notificationService.sendSMS(phone, smsBody);
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const stats = {
      rateLimitedAlerts: this.alertHistory.size,
      cachedOwners: this.machineOwners.size,
      recentAlerts: []
    };

    // Get recent alerts
    for (const [key, timestamp] of this.alertHistory) {
      stats.recentAlerts.push({
        key,
        timestamp: new Date(timestamp).toISOString()
      });
    }

    return stats;
  }
}

module.exports = new AlertManager();

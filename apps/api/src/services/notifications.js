/**
 * Notifications Service
 * Handles SMS (Twilio), Push Notifications (Firebase), and Email alerts
 */

class NotificationService {
  constructor() {
    this.twilioClient = null;
    this.firebaseAdmin = null;
    this.isInitialized = false;
    
    // SMS enabled flag - set to false to save credits during development
    this.smsEnabled = process.env.SMS_ENABLED !== 'false';
    
    // Rate limiting to prevent alert spam
    this.sentAlerts = new Map(); // key: `${machineId}_${alertType}`, value: timestamp
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes between same alerts
    
    this.init();
  }

  init() {
    // Initialize Twilio
    if (!this.smsEnabled) {
      console.log('📵 SMS disabled (SMS_ENABLED=false) - saving Twilio credits');
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio');
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ Twilio SMS service initialized');
    } else {
      console.log('⚠️ Twilio not configured - SMS alerts disabled');
    }

    // Initialize Firebase Admin
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      const admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
      }
      
      this.firebaseAdmin = admin;
      console.log('✅ Firebase Push Notifications initialized');
    } else {
      console.log('⚠️ Firebase not configured - Push notifications disabled');
    }

    this.isInitialized = true;
  }

  /**
   * Check if alert should be sent (rate limiting)
   */
  shouldSendAlert(machineId, alertType) {
    const key = `${machineId}_${alertType}`;
    const lastSent = this.sentAlerts.get(key);
    
    if (lastSent && Date.now() - lastSent < this.alertCooldown) {
      return false;
    }
    
    this.sentAlerts.set(key, Date.now());
    return true;
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to, message, options = {}) {
    // Check if SMS is disabled
    if (!this.smsEnabled) {
      console.log('📵 SMS skipped (disabled for development):', message.substring(0, 50));
      return { success: false, reason: 'sms_disabled', message: 'SMS disabled to save credits' };
    }
    
    if (!this.twilioClient) {
      console.log('📵 SMS skipped (Twilio not configured):', message.substring(0, 50));
      return { success: false, reason: 'twilio_not_configured' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });

      console.log(`📱 SMS sent to ${to}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (err) {
      console.error('❌ SMS send error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Alias for backwards compatibility
  async sendSms(to, message, options = {}) {
    return this.sendSMS(to, message, options);
  }

  /**
   * Send Push Notification via Firebase
   */
  async sendPushNotification(token, title, body, data = {}) {
    if (!this.firebaseAdmin) {
      console.log('🔕 Push skipped (Firebase not configured):', title);
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      const message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        token
      };

      const result = await this.firebaseAdmin.messaging().send(message);
      console.log(`🔔 Push sent: ${result}`);
      return { success: true, messageId: result };
    } catch (err) {
      console.error('❌ Push notification error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Push to multiple devices (topic or multiple tokens)
   */
  async sendPushToTopic(topic, title, body, data = {}) {
    if (!this.firebaseAdmin) {
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        topic
      };

      const result = await this.firebaseAdmin.messaging().send(message);
      console.log(`🔔 Topic push sent to ${topic}: ${result}`);
      return { success: true, messageId: result };
    } catch (err) {
      console.error('❌ Topic push error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send alert notification (Push only) for critical events
   * NOTE: SMS disabled for machine alerts - only dashboard/push notifications
   */
  async sendAlert(alert) {
    const { machineId, machineName, type, severity, message, ownerPhone, ownerPushToken } = alert;

    // Rate limit check
    if (!this.shouldSendAlert(machineId, type)) {
      console.log(`⏳ Alert rate-limited: ${machineId} - ${type}`);
      return { sent: false, reason: 'rate_limited' };
    }

    const results = { sms: null, push: null };

    // Construct message
    const alertTitle = `🚨 AgriTrack Alert: ${type.toUpperCase()}`;
    const alertBody = `${machineName || machineId}: ${message}`;
    // SMS disabled for machine alerts - saved for scheduling notifications only
    // const smsMessage = `[AgriTrack] ${severity.toUpperCase()} ALERT\n${machineName || machineId}\n${message}\nTime: ${new Date().toLocaleString('en-IN')}`;

    // SMS DISABLED for machine alerts to save Twilio credits
    // if (ownerPhone && (severity === 'critical' || alert.forceSMS)) {
    //   results.sms = await this.sendSMS(ownerPhone, smsMessage);
    // }

    // Send Push notification
    if (ownerPushToken) {
      results.push = await this.sendPushNotification(
        ownerPushToken,
        alertTitle,
        alertBody,
        {
          machineId,
          alertType: type,
          severity,
          timestamp: Date.now().toString()
        }
      );
    }

    // Also send to admin topic for all critical alerts (push only)
    if (severity === 'critical') {
      await this.sendPushToTopic('admin_alerts', alertTitle, alertBody, {
        machineId,
        alertType: type,
        severity
      });
    }

    return { sent: true, results };
  }

  /**
   * Send geofence breach alert (Push only - SMS disabled)
   */
  async sendGeofenceAlert(machineId, machineName, geofenceName, location, contacts) {
    const message = `Machine "${machineName}" has left geofence "${geofenceName}". Current location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    
    return this.sendAlert({
      machineId,
      machineName,
      type: 'geofence',
      severity: 'warning',
      message,
      ownerPhone: null, // SMS disabled for machine alerts
      ownerPushToken: contacts?.pushToken,
      forceSMS: false // SMS disabled
    });
  }

  /**
   * Send maintenance reminder (Push only - SMS disabled)
   */
  async sendMaintenanceReminder(machineId, machineName, maintenanceType, dueDate, contacts) {
    const message = `Scheduled ${maintenanceType} for "${machineName}" is due on ${dueDate}. Please schedule service.`;
    
    // Send to topic for all maintenance personnel (push only)
    await this.sendPushToTopic('maintenance_team', 
      '🔧 Maintenance Due', 
      message,
      { machineId, maintenanceType, dueDate }
    );

    // SMS disabled for maintenance alerts - dashboard only
    // if (contacts?.phone) {
    //   await this.sendSMS(contacts.phone, `[AgriTrack] MAINTENANCE REMINDER\n${message}`);
    // }
  }

  /**
   * Send fuel low alert (Push only - SMS disabled)
   */
  async sendFuelAlert(machineId, machineName, fuelLevel, contacts) {
    const message = `Fuel level critically low (${fuelLevel}%) for "${machineName}". Refueling needed.`;
    
    return this.sendAlert({
      machineId,
      machineName,
      type: 'fuel_low',
      severity: fuelLevel < 10 ? 'critical' : 'warning',
      message,
      ownerPhone: null, // SMS disabled for machine alerts
      ownerPushToken: contacts?.pushToken
    });
  }

  // =========================================================================
  // ADVISORY SMS METHODS (for Harvest Scheduling - NOT machine faults)
  // These are the ONLY SMS methods that should send to farmers
  // Machine faults stay on admin dashboard only
  // =========================================================================

  /**
   * Send harvest schedule assigned notification
   * @param {Object} farmer - Farmer details {phone, name, language}
   * @param {Object} schedule - Schedule details {window_start, window_end, cluster_name}
   */
  async sendScheduleAssignedSMS(farmer, schedule) {
    const { phone, name, language = 'hindi' } = farmer;
    const { window_start, window_end, cluster_name } = schedule;

    // Format dates
    const startDate = new Date(window_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const endDate = new Date(window_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    let message;
    if (language === 'hindi') {
      message = `प्रिय ${name}, आपकी फसल कटाई की तारीख ${startDate} से ${endDate} के बीच है। मशीन बुक करने के लिए AgriTrack ऐप पर जाएं। समय पर बुकिंग पर Green Credits मिलेंगे! - AgriTrack`;
    } else {
      message = `Dear ${name}, your optimal harvest window is ${startDate} to ${endDate}. Book now on AgriTrack app for priority access. Earn Green Credits for on-time booking! - AgriTrack`;
    }

    const result = await this.sendSMS(phone, message, { type: 'schedule_assigned' });
    
    // Log to advisory_sms_logs would happen here via database service
    return {
      ...result,
      message_type: 'schedule_assigned',
      farmer_id: farmer.id,
      language
    };
  }

  /**
   * Send reminder SMS (3 days before window)
   */
  async sendScheduleReminderSMS(farmer, schedule, daysUntil = 3) {
    const { phone, name, language = 'hindi' } = farmer;
    const startDate = new Date(schedule.window_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    let message;
    if (language === 'hindi') {
      message = `रिमाइंडर: ${name}, आपकी हार्वेस्ट विंडो ${daysUntil} दिन में शुरू होगी (${startDate})। अभी मशीन बुक करें! - AgriTrack`;
    } else {
      message = `Reminder: ${name}, your harvest window starts in ${daysUntil} days (${startDate}). Book your machine now! - AgriTrack`;
    }

    return this.sendSMS(phone, message, { type: 'reminder' });
  }

  /**
   * Send booking window open notification
   */
  async sendBookingOpenSMS(farmer, schedule) {
    const { phone, name, language = 'hindi', priority_level = 'normal' } = farmer;

    let message;
    if (language === 'hindi') {
      message = `${name}, आपकी बुकिंग विंडो अब खुली है! AgriTrack ऐप पर जाएं और मशीन बुक करें। Priority: ${priority_level.toUpperCase()} - AgriTrack`;
    } else {
      message = `${name}, your booking window is now OPEN! Visit AgriTrack app to book your machine. Priority: ${priority_level.toUpperCase()} - AgriTrack`;
    }

    return this.sendSMS(phone, message, { type: 'booking_open' });
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmationSMS(farmer, booking) {
    const { phone, name, language = 'hindi' } = farmer;
    const { machine_name, scheduled_date, time_slot } = booking;

    const bookingDate = new Date(scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    let message;
    if (language === 'hindi') {
      message = `बुकिंग कन्फर्म! ${name}, आपकी ${machine_name} बुकिंग ${bookingDate} ${time_slot || ''} के लिए पक्की है। Green Credits +15! - AgriTrack`;
    } else {
      message = `Booking Confirmed! ${name}, your ${machine_name} is booked for ${bookingDate} ${time_slot || ''}. Green Credits +15! - AgriTrack`;
    }

    return this.sendSMS(phone, message, { type: 'booking_confirmed' });
  }

  /**
   * Send green credits earned notification
   */
  async sendGreenCreditsEarnedSMS(farmer, credits, reason) {
    const { phone, name, language = 'hindi' } = farmer;

    let message;
    if (language === 'hindi') {
      message = `बधाई हो ${name}! आपने ${credits} Green Credits कमाए (${reason})। अपना बैलेंस देखने के लिए AgriTrack ऐप खोलें। - AgriTrack`;
    } else {
      message = `Congratulations ${name}! You earned ${credits} Green Credits (${reason}). Open AgriTrack app to view your balance. - AgriTrack`;
    }

    return this.sendSMS(phone, message, { type: 'incentive_earned' });
  }

  /**
   * Send weather alert affecting harvest schedule
   */
  async sendWeatherAlertSMS(farmer, schedule, weatherInfo) {
    const { phone, name, language = 'hindi' } = farmer;
    const { condition, advisory } = weatherInfo;

    let message;
    if (language === 'hindi') {
      message = `मौसम अलर्ट: ${name}, ${condition}। ${advisory} कृपया अपनी हार्वेस्ट प्लान करें। - AgriTrack`;
    } else {
      message = `Weather Alert: ${name}, ${condition}. ${advisory} Please plan your harvest accordingly. - AgriTrack`;
    }

    return this.sendSMS(phone, message, { type: 'weather_alert' });
  }

  /**
   * Bulk send schedule notifications to multiple farmers
   * Used when generating cluster schedules
   */
  async sendBulkScheduleNotifications(farmers, scheduleDetails) {
    const results = {
      total: farmers.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const farmer of farmers) {
      try {
        if (!farmer.phone) {
          results.skipped++;
          continue;
        }

        const result = await this.sendScheduleAssignedSMS(farmer, scheduleDetails);
        
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          if (result.reason !== 'sms_disabled') {
            results.errors.push({ farmer_id: farmer.id, error: result.reason || result.error });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        results.failed++;
        results.errors.push({ farmer_id: farmer.id, error: err.message });
      }
    }

    console.log(`📱 Bulk SMS: ${results.sent}/${results.total} sent, ${results.failed} failed, ${results.skipped} skipped`);
    return results;
  }
}

module.exports = new NotificationService();

/**
 * Scheduling Routes
 * API endpoints for the Dynamic Harvest Scheduler
 * 
 * These endpoints connect to the Python crop-residue service
 * and manage scheduling data in the database.
 */

const express = require('express');
const router = express.Router();
const db = require('../services/database');
const notificationService = require('../services/notifications');

const CROP_RESIDUE_URL = process.env.CROP_RESIDUE_URL || 'http://crop-residue:8001';

// =========================================================================
// PROXY ROUTES TO PYTHON SCHEDULER SERVICE
// =========================================================================

/**
 * GET /api/v1/scheduling/dashboard
 * Get complete scheduling dashboard from Python service
 */
router.get('/dashboard', async (req, res) => {
  try {
    const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch from scheduler service');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching scheduling dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/clusters
 * Get harvest clusters
 */
router.get('/clusters', async (req, res) => {
  try {
    const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/clusters`);
    if (!response.ok) throw new Error('Failed to fetch clusters');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching clusters:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/schedules
 * Get farmer schedules
 */
router.get('/schedules', async (req, res) => {
  try {
    const { district, status, priority, limit } = req.query;
    let url = `${CROP_RESIDUE_URL}/api/scheduling/schedules?`;
    if (district) url += `district=${district}&`;
    if (status) url += `status=${status}&`;
    if (priority) url += `priority=${priority}&`;
    if (limit) url += `limit=${limit}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch schedules');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/gantt
 * Get Gantt chart data
 */
router.get('/gantt', async (req, res) => {
  try {
    const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/gantt`);
    if (!response.ok) throw new Error('Failed to fetch gantt data');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching gantt:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/heatmap
 * Get machine availability heatmap
 */
router.get('/heatmap', async (req, res) => {
  try {
    const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/heatmap`);
    if (!response.ok) throw new Error('Failed to fetch heatmap');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching heatmap:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// DATABASE ROUTES (Store/Retrieve from Supabase)
// =========================================================================

/**
 * GET /api/v1/scheduling/farmer/:farmerId
 * Get farmer's current harvest schedule from database
 */
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_harvest_schedules')
      .select(`
        *,
        cluster:harvest_clusters(id, cluster_name, window_start_date, window_end_date, priority_score),
        field:farmer_fields(id, name, area_acres, current_ndvi)
      `)
      .eq('farmer_id', req.params.farmerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'No schedule found for farmer' });
    }

    // Get green credits balance
    const { data: credits } = await supabase
      .from('green_credits')
      .select('credits_earned, credits_redeemed')
      .eq('farmer_id', req.params.farmerId)
      .eq('verified', true);

    const totalCredits = (credits || []).reduce(
      (sum, c) => sum + (c.credits_earned - c.credits_redeemed), 
      0
    );

    res.json({
      ...data,
      green_credits_balance: totalCredits
    });
  } catch (err) {
    console.error('Error fetching farmer schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/scheduling/farmer/:farmerId/accept
 * Farmer accepts their harvest schedule
 */
router.post('/farmer/:farmerId/accept', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const { schedule_id, preferred_date } = req.body;

    // Update schedule
    const { data, error } = await supabase
      .from('farmer_harvest_schedules')
      .update({
        farmer_accepted: true,
        accepted_at: new Date().toISOString(),
        preferred_date: preferred_date || null,
        status: 'accepted',
        priority_booking_enabled: true
      })
      .eq('id', schedule_id)
      .eq('farmer_id', req.params.farmerId)
      .select()
      .single();

    if (error) throw error;

    // Award green credits for accepting schedule
    await supabase
      .from('green_credits')
      .insert({
        farmer_id: req.params.farmerId,
        schedule_id: schedule_id,
        credits_earned: 10,
        credit_type: 'schedule_accepted',
        description: 'Accepted harvest schedule',
        verified: true,
        verified_at: new Date().toISOString(),
        verification_method: 'auto'
      });

    res.json({
      success: true,
      message: 'Schedule accepted',
      credits_earned: 10,
      schedule: data
    });
  } catch (err) {
    console.error('Error accepting schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/farmer/:farmerId/credits
 * Get farmer's green credits history
 */
router.get('/farmer/:farmerId/credits', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('green_credits')
      .select('*')
      .eq('farmer_id', req.params.farmerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const balance = (data || []).reduce(
      (sum, c) => sum + (c.credits_earned - c.credits_redeemed),
      0
    );

    res.json({
      balance,
      total_earned: data.reduce((sum, c) => sum + c.credits_earned, 0),
      total_redeemed: data.reduce((sum, c) => sum + c.credits_redeemed, 0),
      transactions: data
    });
  } catch (err) {
    console.error('Error fetching credits:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// SMS NOTIFICATION ROUTES
// =========================================================================

/**
 * POST /api/v1/scheduling/sms/send
 * Send advisory SMS to farmers (admin only)
 */
router.post('/sms/send', async (req, res) => {
  try {
    const { farmer_ids, message_type, custom_message } = req.body;

    if (!farmer_ids || !Array.isArray(farmer_ids) || farmer_ids.length === 0) {
      return res.status(400).json({ error: 'farmer_ids array required' });
    }

    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();

    // Get farmer details
    const { data: farmers, error } = await supabase
      .from('farmer_profiles')
      .select('id, full_name, phone, preferred_language')
      .in('id', farmer_ids);

    if (error) throw error;

    // Get their schedules
    const { data: schedules } = await supabase
      .from('farmer_harvest_schedules')
      .select('*')
      .in('farmer_id', farmer_ids);

    const scheduleMap = {};
    (schedules || []).forEach(s => {
      scheduleMap[s.farmer_id] = s;
    });

    const results = {
      total: farmers.length,
      sent: 0,
      failed: 0,
      details: []
    };

    for (const farmer of farmers) {
      const schedule = scheduleMap[farmer.id];
      let result;

      try {
        switch (message_type) {
          case 'schedule_assigned':
            result = await notificationService.sendScheduleAssignedSMS(
              { ...farmer, name: farmer.full_name, language: farmer.preferred_language },
              schedule || {}
            );
            break;
          case 'reminder':
            result = await notificationService.sendScheduleReminderSMS(
              { ...farmer, name: farmer.full_name, language: farmer.preferred_language },
              schedule || {}
            );
            break;
          case 'booking_open':
            result = await notificationService.sendBookingOpenSMS(
              { ...farmer, name: farmer.full_name, language: farmer.preferred_language },
              schedule || {}
            );
            break;
          default:
            result = { success: false, reason: 'invalid_message_type' };
        }

        if (result.success) {
          results.sent++;
          
          // Log to advisory_sms_logs
          await supabase.from('advisory_sms_logs').insert({
            farmer_id: farmer.id,
            schedule_id: schedule?.id,
            phone_number: farmer.phone,
            message_type,
            message_content: custom_message || `[${message_type}]`,
            language: farmer.preferred_language || 'hindi',
            twilio_sid: result.sid,
            delivery_status: 'sent',
            sent_at: new Date().toISOString()
          });
        } else {
          results.failed++;
        }

        results.details.push({
          farmer_id: farmer.id,
          success: result.success,
          reason: result.reason || result.error
        });
      } catch (err) {
        results.failed++;
        results.details.push({
          farmer_id: farmer.id,
          success: false,
          reason: err.message
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Error sending SMS:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/sms/preview
 * Preview SMS messages before sending
 */
router.get('/sms/preview', async (req, res) => {
  try {
    const { message_type = 'schedule_assigned', limit = 10 } = req.query;
    
    const response = await fetch(
      `${CROP_RESIDUE_URL}/api/scheduling/sms/preview?message_type=${message_type}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch SMS preview');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching SMS preview:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/scheduling/sms/stats
 * Get SMS campaign statistics
 */
router.get('/sms/stats', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    
    // Get stats by message type
    const { data, error } = await supabase
      .from('advisory_sms_logs')
      .select('message_type, delivery_status, cost_inr');

    if (error) throw error;

    const stats = {
      total_sent: data.length,
      by_type: {},
      by_status: {},
      total_cost: 0
    };

    data.forEach(sms => {
      // By type
      if (!stats.by_type[sms.message_type]) {
        stats.by_type[sms.message_type] = 0;
      }
      stats.by_type[sms.message_type]++;

      // By status
      if (!stats.by_status[sms.delivery_status]) {
        stats.by_status[sms.delivery_status] = 0;
      }
      stats.by_status[sms.delivery_status]++;

      // Cost
      stats.total_cost += sms.cost_inr || 0;
    });

    res.json(stats);
  } catch (err) {
    console.error('Error fetching SMS stats:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/scheduling/sms/test
 * Send a test scheduling SMS to a specific phone number (for testing)
 */
router.post('/sms/test', async (req, res) => {
  try {
    const { phone, message_type = 'schedule_assigned', farmer_name = 'Test Farmer' } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Clean phone number - ensure it has country code
    let cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('91')) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+91' + cleanPhone;
      }
    }

    // Create mock schedule data for test message
    const mockSchedule = {
      window_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      window_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      cluster_name: 'Ludhiana Central',
      schedule_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      slot_time: '9:00 AM - 12:00 PM'
    };

    let result;
    let messageContent = '';

    // Short messages for Twilio trial accounts (max 160 chars per segment)
    switch (message_type) {
      case 'schedule_assigned':
        const startDate = new Date(mockSchedule.window_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const endDate = new Date(mockSchedule.window_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        messageContent = `AgriTrack: ${farmer_name}, harvest window ${startDate}-${endDate}. Book now for priority access! -Test`;
        break;

      case 'reminder':
        const scheduleDate = new Date(mockSchedule.schedule_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        messageContent = `AgriTrack: ${farmer_name}, booking on ${scheduleDate}, ${mockSchedule.slot_time}. Field ready? -Test`;
        break;

      case 'booking_confirmed':
        messageContent = `AgriTrack: ${farmer_name}, booking confirmed! +10 Green Credits earned. -Test`;
        break;

      case 'booking_open':
        messageContent = `AgriTrack: ${farmer_name}, bookings open! Book early for priority slots. -Test`;
        break;

      default:
        messageContent = `AgriTrack Test: Hi ${farmer_name}! SMS working. CRM tracking, scheduling, green credits. -SIH2025`;
    }

    // Send SMS using notification service
    result = await notificationService.sendSMS(cleanPhone, messageContent, { type: 'test' });

    // Log for debugging
    console.log(`📱 Test SMS to ${cleanPhone}:`, result);

    res.json({
      success: result.success,
      phone: cleanPhone,
      message_type,
      message_preview: messageContent.substring(0, 100) + '...',
      sid: result.sid || null,
      reason: result.reason || null,
      error: result.error || null
    });
  } catch (err) {
    console.error('Error sending test SMS:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

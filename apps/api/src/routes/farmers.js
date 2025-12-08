/**
 * Farmer Routes
 * API endpoints for farmer registration, profile management, fields, and dashboard
 */

const express = require('express');
const router = express.Router();
const db = require('../services/database');

// =====================================================
// FARMER PROFILE ENDPOINTS
// =====================================================

/**
 * GET /api/v1/farmers
 * List all farmers (admin only)
 */
router.get('/', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ farmers: [], message: 'Database not configured' });
    }

    const { district, state, verified, limit = 50, offset = 0 } = req.query;
    const supabase = db.getClient();

    let query = supabase
      .from('farmer_profiles')
      .select(`
        *,
        user:users(id, email, clerk_id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (district) query = query.eq('district', district);
    if (state) query = query.eq('state', state);
    if (verified !== undefined) query = query.eq('is_verified', verified === 'true');

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      farmers: data || [],
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching farmers:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/farmers/:id
 * Get farmer profile by ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_profiles')
      .select(`
        *,
        user:users(id, email, clerk_id),
        fields:farmer_fields(*),
        service_history:farmer_service_history(
          *,
          machine:machines(id, name, type)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching farmer:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/farmers/phone/:phone
 * Get farmer by phone number
 */
router.get('/phone/:phone', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const phone = req.params.phone.startsWith('+') ? req.params.phone : `+91${req.params.phone}`;
    
    const { data, error } = await supabase
      .from('farmer_profiles')
      .select(`
        *,
        user:users(id, email, clerk_id),
        fields:farmer_fields(*)
      `)
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ error: 'Farmer not found', phone });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching farmer by phone:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/farmers
 * Register a new farmer
 */
router.post('/', async (req, res) => {
  try {
    const {
      full_name,
      phone,
      email,
      alternate_phone,
      address_line1,
      address_line2,
      village,
      district,
      state,
      pincode,
      farming_experience_years,
      primary_crops,
      preferred_language
    } = req.body;

    // Validation
    if (!full_name || !phone || !district || !state) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['full_name', 'phone', 'district', 'state']
      });
    }

    if (!db.isConfigured()) {
      // Mock response for testing without DB
      return res.status(201).json({
        id: `farmer_${Date.now()}`,
        full_name,
        phone,
        district,
        state,
        is_verified: false,
        created_at: new Date().toISOString(),
        message: 'Mock farmer created (database not configured)'
      });
    }

    const supabase = db.getClient();
    const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    // Check if farmer already exists
    const { data: existing } = await supabase
      .from('farmer_profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Farmer with this phone number already exists',
        farmer_id: existing.id
      });
    }

    // Create user first
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_id: `farmer_${Date.now()}`,
        email: email || null,
        name: full_name,
        phone: normalizedPhone,
        role: 'farmer'
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create farmer profile
    const { data: farmer, error: farmerError } = await supabase
      .from('farmer_profiles')
      .insert({
        user_id: user.id,
        full_name,
        phone: normalizedPhone,
        email,
        alternate_phone,
        address_line1,
        address_line2,
        village,
        district,
        state,
        pincode,
        farming_experience_years: farming_experience_years || 0,
        primary_crops: primary_crops || [],
        preferred_language: preferred_language || 'hindi',
        is_verified: false
      })
      .select()
      .single();

    if (farmerError) throw farmerError;

    console.log(`👨‍🌾 New farmer registered: ${full_name} (${district}, ${state})`);

    res.status(201).json({
      success: true,
      farmer,
      user_id: user.id
    });
  } catch (err) {
    console.error('Error registering farmer:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/farmers/:id
 * Update farmer profile
 */
router.put('/:id', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('farmer_profiles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json({ success: true, farmer: data });
  } catch (err) {
    console.error('Error updating farmer:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/farmers/:id/verify
 * Mark farmer as verified (admin only)
 */
router.post('/:id/verify', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_profiles')
      .update({
        is_verified: true,
        verification_date: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, farmer: data });
  } catch (err) {
    console.error('Error verifying farmer:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// FARMER FIELDS ENDPOINTS
// =====================================================

/**
 * GET /api/v1/farmers/:id/fields
 * Get all fields for a farmer
 */
router.get('/:id/fields', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ fields: [] });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_fields')
      .select('*')
      .eq('farmer_id', req.params.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ fields: data || [] });
  } catch (err) {
    console.error('Error fetching farmer fields:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/farmers/:id/fields
 * Add a new field for a farmer
 */
router.post('/:id/fields', async (req, res) => {
  try {
    const {
      name,
      area_acres,
      village,
      district,
      state,
      latitude,
      longitude,
      boundary_coords,
      soil_type,
      irrigation_type,
      current_crop
    } = req.body;

    if (!name || !area_acres) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'area_acres']
      });
    }

    if (!db.isConfigured()) {
      return res.status(201).json({
        id: `field_${Date.now()}`,
        farmer_id: req.params.id,
        name,
        area_acres,
        message: 'Mock field created'
      });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_fields')
      .insert({
        farmer_id: req.params.id,
        name,
        area_acres,
        village,
        district,
        state,
        latitude,
        longitude,
        boundary_coords,
        soil_type,
        irrigation_type,
        current_crop
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, field: data });
  } catch (err) {
    console.error('Error adding farmer field:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/farmers/:farmerId/fields/:fieldId
 * Update a farmer's field
 */
router.put('/:farmerId/fields/:fieldId', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const updates = req.body;
    delete updates.id;
    delete updates.farmer_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('farmer_fields')
      .update(updates)
      .eq('id', req.params.fieldId)
      .eq('farmer_id', req.params.farmerId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, field: data });
  } catch (err) {
    console.error('Error updating field:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/farmers/:farmerId/fields/:fieldId
 * Soft delete a farmer's field
 */
router.delete('/:farmerId/fields/:fieldId', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const supabase = db.getClient();
    const { error } = await supabase
      .from('farmer_fields')
      .update({ is_active: false })
      .eq('id', req.params.fieldId)
      .eq('farmer_id', req.params.farmerId);

    if (error) throw error;

    res.json({ success: true, message: 'Field deleted' });
  } catch (err) {
    console.error('Error deleting field:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// FARMER DASHBOARD & ANALYTICS
// =====================================================

/**
 * GET /api/v1/farmers/:id/dashboard
 * Get farmer dashboard data
 */
router.get('/:id/dashboard', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({
        profile: null,
        stats: {
          total_fields: 0,
          total_acres: 0,
          total_bookings: 0,
          completed_services: 0,
          pending_payments: 0
        },
        recent_bookings: [],
        upcoming_services: []
      });
    }

    const supabase = db.getClient();
    const farmerId = req.params.id;

    // Get farmer profile with fields
    const { data: profile } = await supabase
      .from('farmer_profiles')
      .select(`
        *,
        fields:farmer_fields(*)
      `)
      .eq('id', farmerId)
      .single();

    // Get booking stats
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, machine:machines(name, type)')
      .eq('farmer_id', profile?.user_id)
      .order('created_at', { ascending: false });

    // Get service history
    const { data: services } = await supabase
      .from('farmer_service_history')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('service_date', { ascending: false })
      .limit(10);

    // Calculate stats
    const fields = profile?.fields || [];
    const totalAcres = fields.reduce((sum, f) => sum + parseFloat(f.area_acres || 0), 0);
    const completedBookings = (bookings || []).filter(b => b.status === 'completed').length;
    const pendingPayments = (services || []).filter(s => s.payment_status === 'pending').length;

    // Get upcoming bookings
    const today = new Date().toISOString().split('T')[0];
    const upcomingBookings = (bookings || []).filter(
      b => b.scheduled_date >= today && ['pending', 'confirmed'].includes(b.status)
    ).slice(0, 5);

    res.json({
      profile,
      stats: {
        total_fields: fields.length,
        total_acres: totalAcres,
        total_bookings: (bookings || []).length,
        completed_services: completedBookings,
        pending_payments: pendingPayments
      },
      recent_bookings: (bookings || []).slice(0, 5),
      upcoming_services: upcomingBookings,
      service_history: services || []
    });
  } catch (err) {
    console.error('Error fetching farmer dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/farmers/:id/bookings
 * Get all bookings for a farmer
 */
router.get('/:id/bookings', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ bookings: [] });
    }

    const supabase = db.getClient();
    
    // First get the user_id from farmer profile
    const { data: profile } = await supabase
      .from('farmer_profiles')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const { status } = req.query;
    let query = supabase
      .from('bookings')
      .select(`
        *,
        machine:machines(id, name, type, model)
      `)
      .eq('farmer_id', profile.user_id)
      .order('scheduled_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ bookings: data || [] });
  } catch (err) {
    console.error('Error fetching farmer bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/farmers/:id/transactions
 * Get payment/transaction history for a farmer
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ transactions: [] });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_transactions')
      .select('*')
      .eq('farmer_id', req.params.id)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    res.json({ transactions: data || [] });
  } catch (err) {
    console.error('Error fetching farmer transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/farmers/:id/notifications
 * Get notifications for a farmer
 */
router.get('/:id/notifications', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ notifications: [] });
    }

    const supabase = db.getClient();
    const { unread_only } = req.query;

    let query = supabase
      .from('farmer_notifications')
      .select('*')
      .eq('farmer_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ notifications: data || [] });
  } catch (err) {
    console.error('Error fetching farmer notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/farmers/:id/notifications/:notifId/read
 * Mark a notification as read
 */
router.post('/:id/notifications/:notifId/read', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ success: true });
    }

    const supabase = db.getClient();
    const { error } = await supabase
      .from('farmer_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', req.params.notifId)
      .eq('farmer_id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// SERVICE HISTORY
// =====================================================

/**
 * POST /api/v1/farmers/:id/services
 * Record a service for a farmer
 */
router.post('/:id/services', async (req, res) => {
  try {
    const {
      booking_id,
      field_id,
      machine_id,
      service_type,
      service_date,
      acres_serviced,
      hours_worked,
      rate_per_acre,
      total_amount,
      payment_method
    } = req.body;

    if (!service_type || !service_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['service_type', 'service_date']
      });
    }

    if (!db.isConfigured()) {
      return res.status(201).json({
        id: `service_${Date.now()}`,
        farmer_id: req.params.id,
        service_type,
        service_date,
        message: 'Mock service recorded'
      });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_service_history')
      .insert({
        farmer_id: req.params.id,
        booking_id,
        field_id,
        machine_id,
        service_type,
        service_date,
        acres_serviced,
        hours_worked,
        rate_per_acre,
        total_amount,
        payment_method,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, service: data });
  } catch (err) {
    console.error('Error recording service:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/farmers/:id/services/:serviceId/feedback
 * Add feedback/rating for a service
 */
router.post('/:id/services/:serviceId/feedback', async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (!db.isConfigured()) {
      return res.json({ success: true });
    }

    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('farmer_service_history')
      .update({ rating, feedback })
      .eq('id', req.params.serviceId)
      .eq('farmer_id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, service: data });
  } catch (err) {
    console.error('Error adding feedback:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

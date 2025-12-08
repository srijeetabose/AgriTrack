/**
 * Geofence API Routes
 */
const express = require('express');
const router = express.Router();
const geofenceService = require('../services/geofence');
const db = require('../services/database');

/**
 * GET /api/geofences
 * Get all geofences (optionally filter by owner)
 */
router.get('/', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    let query = supabase.from('geofences').select('*');
    
    if (req.query.ownerId) {
      query = query.eq('owner_id', req.query.ownerId);
    }
    
    if (req.query.active !== undefined) {
      query = query.eq('active', req.query.active === 'true');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/geofences/:id
 * Get a specific geofence with assigned machines
 */
router.get('/:id', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { data: geofence, error } = await supabase
      .from('geofences')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    // Get assigned machines
    const { data: assignments } = await supabase
      .from('geofence_machines')
      .select('machine:machines(id, device_id, name, type)')
      .eq('geofence_id', req.params.id);

    geofence.machines = assignments?.map(a => a.machine) || [];
    res.json(geofence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/geofences
 * Create a new geofence
 */
router.post('/', async (req, res) => {
  try {
    const result = await geofenceService.createGeofence(req.body);
    if (!result) {
      return res.status(400).json({ error: 'Failed to create geofence' });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/geofences/:id
 * Update a geofence
 */
router.put('/:id', async (req, res) => {
  try {
    const result = await geofenceService.updateGeofence(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ error: 'Geofence not found or update failed' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/geofences/:id
 * Delete a geofence
 */
router.delete('/:id', async (req, res) => {
  try {
    const success = await geofenceService.deleteGeofence(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Geofence not found or delete failed' });
    }
    res.json({ message: 'Geofence deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/geofences/:id/machines
 * Assign machines to a geofence
 */
router.post('/:id/machines', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { machineIds } = req.body;
    if (!Array.isArray(machineIds)) {
      return res.status(400).json({ error: 'machineIds must be an array' });
    }

    const assignments = machineIds.map(machineId => ({
      geofence_id: req.params.id,
      machine_id: machineId
    }));

    const { data, error } = await supabase
      .from('geofence_machines')
      .upsert(assignments, { onConflict: 'geofence_id,machine_id' })
      .select();

    if (error) throw error;
    
    await geofenceService.loadGeofences();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/geofences/:id/machines/:machineId
 * Remove a machine from a geofence
 */
router.delete('/:id/machines/:machineId', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { error } = await supabase
      .from('geofence_machines')
      .delete()
      .eq('geofence_id', req.params.id)
      .eq('machine_id', req.params.machineId);

    if (error) throw error;
    
    await geofenceService.loadGeofences();
    res.json({ message: 'Machine removed from geofence' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/geofences/:id/breaches
 * Get breach history for a geofence
 */
router.get('/:id/breaches', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const limit = parseInt(req.query.limit) || 50;

    const { data, error } = await supabase
      .from('geofence_breaches')
      .select('*, machine:machines(device_id, name)')
      .eq('geofence_id', req.params.id)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/geofences/check
 * Check if a point is inside any geofence
 */
router.post('/check', async (req, res) => {
  try {
    const { lat, lng, machineId } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const result = await geofenceService.checkGeofence(machineId || 'check', lat, lng);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

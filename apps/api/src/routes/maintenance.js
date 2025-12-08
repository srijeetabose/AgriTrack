/**
 * Maintenance Scheduling API Routes
 */
const express = require('express');
const router = express.Router();
const maintenanceService = require('../services/maintenance');
const db = require('../services/database');

/**
 * GET /api/maintenance/types
 * Get available maintenance types
 */
router.get('/types', (req, res) => {
  res.json(maintenanceService.getMaintenanceTypes());
});

/**
 * GET /api/maintenance/summary
 * Get maintenance summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await maintenanceService.getMaintenanceSummary();
    if (!summary) {
      return res.status(503).json({ error: 'Unable to get summary' });
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/maintenance/upcoming
 * Get upcoming maintenance (fleet-wide)
 */
router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const upcoming = await maintenanceService.getUpcomingMaintenance(days);
    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/maintenance/overdue
 * Get overdue maintenance (fleet-wide)
 */
router.get('/overdue', async (req, res) => {
  try {
    const overdue = await maintenanceService.getOverdueMaintenance();
    res.json(overdue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/maintenance/machine/:machineId
 * Get maintenance schedules for a specific machine
 */
router.get('/machine/:machineId', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get machine ID from device_id
    const { data: machine } = await supabase
      .from('machines')
      .select('id')
      .eq('device_id', req.params.machineId)
      .single();

    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const includeCompleted = req.query.includeCompleted === 'true';
    const schedules = await maintenanceService.getSchedulesForMachine(machine.id, includeCompleted);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/maintenance/machine/:machineId/history
 * Get maintenance history for a specific machine
 */
router.get('/machine/:machineId/history', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get machine ID from device_id
    const { data: machine } = await supabase
      .from('machines')
      .select('id')
      .eq('device_id', req.params.machineId)
      .single();

    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const history = await maintenanceService.getHistoryForMachine(machine.id, limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/maintenance
 * Create a new maintenance schedule
 */
router.post('/', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { machineId, ...scheduleData } = req.body;

    // Get machine ID from device_id
    const { data: machine } = await supabase
      .from('machines')
      .select('id')
      .eq('device_id', machineId)
      .single();

    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const result = await maintenanceService.createSchedule(machine.id, scheduleData);
    if (!result) {
      return res.status(400).json({ error: 'Failed to create schedule' });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/maintenance/:scheduleId
 * Update a maintenance schedule
 */
router.put('/:scheduleId', async (req, res) => {
  try {
    const result = await maintenanceService.updateSchedule(req.params.scheduleId, req.body);
    if (!result) {
      return res.status(404).json({ error: 'Schedule not found or update failed' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/maintenance/:scheduleId/complete
 * Mark maintenance as completed
 */
router.post('/:scheduleId/complete', async (req, res) => {
  try {
    const result = await maintenanceService.completeMaintenance(req.params.scheduleId, req.body);
    if (!result) {
      return res.status(404).json({ error: 'Schedule not found or completion failed' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/maintenance/:scheduleId
 * Cancel/delete a maintenance schedule
 */
router.delete('/:scheduleId', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { error } = await supabase
      .from('maintenance_schedules')
      .update({ status: 'cancelled' })
      .eq('id', req.params.scheduleId);

    if (error) throw error;
    res.json({ message: 'Schedule cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

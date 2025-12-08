/**
 * Fuel Tracking API Routes
 */
const express = require('express');
const router = express.Router();
const fuelService = require('../services/fuel');
const db = require('../services/database');

/**
 * GET /api/fuel/fleet/summary
 * Get fleet-wide fuel summary
 * NOTE: This route must come BEFORE /:machineId to avoid being caught by the wildcard
 */
router.get('/fleet/summary', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get all machines with latest fuel levels
    const { data: machines } = await supabase
      .from('machines')
      .select('id, device_id, name, type');

    const summary = {
      totalMachines: machines?.length || 0,
      lowFuelCount: 0,
      criticalFuelCount: 0,
      averageFuelLevel: 0,
      totalRefuelingCost24h: 0,
      machines: []
    };

    if (machines) {
      let totalFuel = 0;
      let machineCount = 0;

      for (const machine of machines) {
        const { data: latestFuel } = await supabase
          .from('fuel_logs')
          .select('fuel_level')
          .eq('machine_id', machine.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (latestFuel) {
          totalFuel += latestFuel.fuel_level;
          machineCount++;

          if (latestFuel.fuel_level < 10) {
            summary.criticalFuelCount++;
          } else if (latestFuel.fuel_level < 20) {
            summary.lowFuelCount++;
          }

          summary.machines.push({
            deviceId: machine.device_id,
            name: machine.name,
            fuelLevel: latestFuel.fuel_level
          });
        }
      }

      summary.averageFuelLevel = machineCount > 0 ? Math.round(totalFuel / machineCount) : 0;

      // Get refueling costs in last 24h
      const { data: refuelingCosts } = await supabase
        .from('refueling_events')
        .select('cost')
        .gte('timestamp', twentyFourHoursAgo);

      summary.totalRefuelingCost24h = refuelingCosts?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
    }

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fuel/:machineId
 * Get fuel status for a machine
 */
router.get('/:machineId', async (req, res) => {
  try {
    const stats = await fuelService.getFuelStats(req.params.machineId);
    if (!stats) {
      return res.status(404).json({ error: 'Machine not found or no fuel data' });
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fuel/:machineId/history
 * Get fuel level history for a machine
 */
router.get('/:machineId/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = await fuelService.getFuelHistory(req.params.machineId, hours);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fuel/:machineId/refueling
 * Get refueling events for a machine
 */
router.get('/:machineId/refueling', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const events = await fuelService.getRefuelingEvents(req.params.machineId, limit);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/fuel/:machineId/refueling
 * Record a refueling event
 */
router.post('/:machineId/refueling', async (req, res) => {
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

    const {
      amountLiters,
      cost,
      odometerReading,
      engineHours,
      latitude,
      longitude,
      notes,
      recordedBy
    } = req.body;

    const { data, error } = await supabase
      .from('refueling_events')
      .insert({
        machine_id: machine.id,
        amount_liters: amountLiters,
        cost,
        odometer_reading: odometerReading,
        engine_hours: engineHours,
        latitude,
        longitude,
        notes,
        recorded_by: recordedBy
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/fuel/:machineId/estimate
 * Estimate remaining range
 */
router.get('/:machineId/estimate', async (req, res) => {
  try {
    const tankCapacity = parseFloat(req.query.tankCapacity) || 100;
    const estimate = await fuelService.estimateRange(req.params.machineId, tankCapacity);
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

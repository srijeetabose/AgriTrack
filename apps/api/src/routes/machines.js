const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { calculateDistance, calculateETA, formatETA, getDirection } = require('../utils/location');

// GET /api/v1/machines/available - Get available machines for farmers (sorted by distance)
router.get('/available', async (req, res) => {
  try {
    const machineStates = req.app.get('machineStates');
    const { lat, lng, limit = 10 } = req.query;
    
    // Get all machines
    let machines = [];
    
    if (db.isConfigured()) {
      const { data, error } = await db.getMachines();
      if (error) throw error;
      
      machines = (data || []).map(machine => ({
        ...machine,
        ...machineStates.get(machine.device_id)
      }));
    } else {
      machines = Array.from(machineStates.values());
    }
    
    // Filter only idle or active machines (not in maintenance or error state)
    const availableMachines = machines.filter(m => 
      m.state === 'idle' || m.state === 'active'
    );
    
    // If user location provided, calculate distance and sort
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      availableMachines.forEach(machine => {
        if (machine.gps && machine.gps.lat && machine.gps.lng) {
          const distance = calculateDistance(
            userLat, 
            userLng, 
            machine.gps.lat, 
            machine.gps.lng
          );
          
          const etaMinutes = calculateETA(distance, machine.speed || 0);
          
          machine.distance = {
            km: Math.round(distance * 10) / 10, // Round to 1 decimal
            direction: getDirection(userLat, userLng, machine.gps.lat, machine.gps.lng),
            eta: {
              minutes: etaMinutes,
              formatted: formatETA(etaMinutes)
            }
          };
        } else {
          machine.distance = null;
        }
      });
      
      // Sort by distance (closest first)
      availableMachines.sort((a, b) => {
        if (!a.distance && !b.distance) return 0;
        if (!a.distance) return 1;
        if (!b.distance) return -1;
        return a.distance.km - b.distance.km;
      });
    }
    
    // Limit results
    const limitedMachines = availableMachines.slice(0, parseInt(limit));
    
    res.json({
      machines: limitedMachines,
      total: availableMachines.length,
      showing: limitedMachines.length,
      userLocation: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/machines - List all machines
router.get('/', async (req, res) => {
  try {
    const machineStates = req.app.get('machineStates');
    
    // If database is configured, merge with DB data
    if (db.isConfigured()) {
      const { data, error } = await db.getMachines();

      if (error) throw error;

      const machinesWithState = (data || []).map(machine => ({
        ...machine,
        realtime: machineStates.get(machine.device_id) || null
      }));

      return res.json(machinesWithState);
    }
    
    // Without database, just return real-time data
    res.json(Array.from(machineStates.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/machines/realtime/all - Get all real-time states (must be before :id route)
router.get('/realtime/all', (req, res) => {
  const machineStates = req.app.get('machineStates');
  res.json(Array.from(machineStates.values()));
});

// GET /api/v1/machines/:id - Get single machine
router.get('/:id', async (req, res) => {
  try {
    const machineStates = req.app.get('machineStates');
    const realtimeState = machineStates.get(req.params.id);
    
    if (db.isConfigured()) {
      // Try to find by device_id first
      let { data, error } = await db.getMachineByDeviceId(req.params.id);

      if (!data) {
        // Try by UUID
        const { data: machines } = await db.getMachines();
        data = machines?.find(m => m.id === req.params.id);
      }

      if (data) {
        return res.json({
          ...data,
          realtime: machineStates.get(data.device_id) || realtimeState || null
        });
      }
    }
    
    if (realtimeState) {
      return res.json(realtimeState);
    }
    
    res.status(404).json({ error: 'Machine not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/machines/:id/logs - Get sensor logs
router.get('/:id/logs', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ message: 'Database not configured', logs: [] });
    }
    
    const { limit = 100, start_date, end_date } = req.query;
    
    const { data, error } = await db.getSensorLogs(req.params.id, {
      limit: parseInt(limit),
      startDate: start_date,
      endDate: end_date
    });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/machines/:id/alerts - Get alerts for a machine
router.get('/:id/alerts', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ message: 'Database not configured', alerts: [] });
    }
    
    const { limit = 50, unacknowledged } = req.query;
    
    // First get the machine UUID
    const { data: machine } = await db.getMachineByDeviceId(req.params.id);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const { data, error } = await db.getAlerts(machine.id, {
      limit: parseInt(limit),
      unacknowledgedOnly: unacknowledged === 'true'
    });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

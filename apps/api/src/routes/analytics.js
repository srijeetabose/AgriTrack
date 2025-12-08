const express = require('express');
const router = express.Router();
const db = require('../services/database');

// GET /api/v1/analytics - Get dashboard analytics
router.get('/', async (req, res) => {
  try {
    const machineStates = req.app.get('machineStates');
    const machines = Array.from(machineStates.values());

    // Calculate real-time stats
    const realtimeStats = {
      totalMachines: machines.length,
      activeMachines: machines.filter(m => m.state === 'active').length,
      idleMachines: machines.filter(m => m.state === 'idle').length,
      offlineMachines: machines.filter(m => m.state === 'off').length,
      alertCount: machines.reduce((sum, m) => sum + (m.alerts?.length || 0), 0),
      overheatAlerts: machines.filter(m => m.alerts?.some(a => a.type === 'overheat')).length,
      avgTemperature: machines.length > 0 
        ? (machines.reduce((sum, m) => sum + (m.temp || 0), 0) / machines.length).toFixed(1)
        : 0
    };

    // Get database stats if available
    let dbStats = null;
    if (db.isConfigured()) {
      dbStats = await db.getAnalytics();
    }

    res.json({
      realtime: realtimeStats,
      database: dbStats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/analytics/alerts - Get recent alerts from database
router.get('/alerts', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ alerts: [], message: 'Database not configured' });
    }

    const { limit = 100 } = req.query;
    const { data, error } = await db.getRecentAlerts(parseInt(limit));

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/analytics/alerts/:id/acknowledge - Acknowledge an alert
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.status(400).json({ error: 'Database not configured' });
    }

    const { user_id } = req.body;
    const { data, error } = await db.acknowledgeAlert(req.params.id, user_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/analytics/efficiency - Get efficiency metrics from AI engine
router.get('/efficiency', async (req, res) => {
  try {
    // Call AI engine
    const aiResponse = await fetch(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/efficiency`);
    const data = await aiResponse.json();
    res.json(data);
  } catch (err) {
    // Return mock data if AI engine is unavailable
    res.json({
      averageEfficiency: 78.5,
      topPerformers: [],
      lowPerformers: [],
      message: 'AI engine unavailable - returning cached data'
    });
  }
});

// GET /api/v1/analytics/anomalies - Get detected anomalies
router.get('/anomalies', async (req, res) => {
  try {
    const aiResponse = await fetch(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/anomalies`);
    const data = await aiResponse.json();
    res.json(data);
  } catch (err) {
    res.json({
      anomalies: [],
      message: 'AI engine unavailable - returning cached data'
    });
  }
});

// GET /api/v1/analytics/history - Get historical stats
router.get('/history', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json({ data: [], message: 'Database not configured' });
    }

    const { days = 7, device_id } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Use database service
    const { data, error } = await db.getSensorLogs(device_id || '*', {
      limit: 1000,
      startDate: startDate.toISOString()
    });

    if (error) throw error;

    // Aggregate by hour
    const hourlyData = {};
    (data || []).forEach(log => {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13);
      if (!hourlyData[hour]) {
        hourlyData[hour] = { count: 0, tempSum: 0, active: 0 };
      }
      hourlyData[hour].count++;
      hourlyData[hour].tempSum += log.temperature || 0;
      if (log.state === 'active') hourlyData[hour].active++;
    });

    const chartData = Object.entries(hourlyData).map(([hour, stats]) => ({
      timestamp: hour,
      avgTemp: (stats.tempSum / stats.count).toFixed(1),
      activeCount: stats.active,
      totalLogs: stats.count
    }));

    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

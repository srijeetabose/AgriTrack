// Load .env from multiple possible locations
const path = require('path');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}
require('dotenv').config(); // Also check current directory
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mqtt = require('mqtt');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const db = require('./services/database');
const notificationService = require('./services/notifications');
const alertManager = require('./services/alertManager');
const geofenceService = require('./services/geofence');
const fuelService = require('./services/fuel');
const maintenanceService = require('./services/maintenance');

const app = express();
const server = http.createServer(app);

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI - API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AgriTrack API Documentation'
}));

// Redirect root to docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// Initialize services with Supabase client after connection
const initializeServices = () => {
  const supabase = db.getClient();
  if (supabase) {
    // Only services that need Supabase get it passed
    geofenceService.setSupabase(supabase);
    fuelService.setSupabase(supabase);
    maintenanceService.setSupabase(supabase);
    alertManager.setSupabase(supabase);
    console.log('✅ Phase 2 services initialized');
  }
};

// Wait for DB to be ready then initialize
setTimeout(initializeServices, 2000);

// Routes
const machineRoutes = require('./routes/machines');
const bookingRoutes = require('./routes/bookings');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhook');
const notificationRoutes = require('./routes/notifications');
const geofenceRoutes = require('./routes/geofence');
const fuelRoutes = require('./routes/fuel');
const maintenanceRoutes = require('./routes/maintenance');
const farmerRoutes = require('./routes/farmers');
const schedulingRoutes = require('./routes/scheduling');
const authRoutes = require('./routes/auth');
const mandiRoutes = require('./routes/mandi');

app.use('/api/v1/machines', machineRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/auth/webhook', webhookRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/geofences', geofenceRoutes);
app.use('/api/v1/fuel', fuelRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/farmers', farmerRoutes);
app.use('/api/v1/scheduling', schedulingRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/mandi', mandiRoutes);

// Also mount auth and mandi at /api for web compatibility
app.use('/api/auth', authRoutes);
app.use('/api/mandi', mandiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MQTT Connection
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org:1883');

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT Broker');
  mqttClient.subscribe(process.env.MQTT_TOPIC || 'agritrack/live/sensors', (err) => {
    if (!err) {
      console.log('📡 Subscribed to sensor topic');
    }
  });
});

// Machine state storage (in-memory for real-time)
const machineStates = new Map();

// Thresholds
const THRESHOLDS = {
  OVERHEAT_TEMP: 90,
  VIBRATION_HIGH: 0.5,
  IDLE_SPEED: 1 // km/h
};

// Process MQTT messages
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    // Determine machine state
    let state = 'off';
    let alerts = [];
    
    if (data.vib_x > 0 || data.vib_y > 0 || data.vib_z > 0) {
      state = 'active';
      
      // Check for idle (vibration but no movement)
      if (data.speed !== undefined && data.speed < THRESHOLDS.IDLE_SPEED) {
        state = 'idle';
      }
    }
    
    // ===== ALERT DETECTION =====
    
    // Check for overheat
    if (data.temp > THRESHOLDS.OVERHEAT_TEMP) {
      alerts.push({ type: 'overheat', message: `Temperature ${data.temp}°C exceeds threshold`, severity: 'critical' });
      // Send SMS/Push notification
      alertManager.handleOverheatAlert(data.id, data.temp, THRESHOLDS.OVERHEAT_TEMP).catch(err => {
        console.error('Error sending overheat alert:', err.message);
      });
    }
    
    // Check for high vibration
    const vibMagnitude = Math.sqrt(
      Math.pow(data.vib_x || 0, 2) + 
      Math.pow(data.vib_y || 0, 2) + 
      Math.pow(data.vib_z || 0, 2)
    );
    
    if (vibMagnitude > THRESHOLDS.VIBRATION_HIGH) {
      alerts.push({ type: 'vibration', message: `High vibration detected: ${vibMagnitude.toFixed(3)}`, severity: 'warning' });
      // Send notification for severe vibration
      if (vibMagnitude > THRESHOLDS.VIBRATION_HIGH * 1.5) {
        alertManager.handleVibrationAlert(data.id, vibMagnitude, THRESHOLDS.VIBRATION_HIGH).catch(err => {
          console.error('Error sending vibration alert:', err.message);
        });
      }
    }

    // ===== PHASE 2: Geofence Check =====
    if (data.gps && data.gps[0] && data.gps[1]) {
      try {
        const geofenceResult = await geofenceService.checkGeofence(data.id, data.gps[0], data.gps[1]);
        if (geofenceResult.breached && geofenceResult.breaches?.length > 0) {
          for (const breach of geofenceResult.breaches) {
            alerts.push({ 
              type: 'geofence', 
              message: `Machine ${breach.type} geofence: ${breach.geofenceName}`,
              severity: 'warning'
            });
            // Send SMS/Push for geofence breach
            alertManager.handleGeofenceAlert(data.id, breach.geofenceName, breach.type, {
              lat: data.gps[0],
              lng: data.gps[1]
            }).catch(err => {
              console.error('Error sending geofence alert:', err.message);
            });
          }
        }
      } catch (err) {
        // Skip geofence check if service unavailable
        console.warn('Geofence check skipped:', err.message);
      }
    }

    // ===== PHASE 2: Fuel Level Tracking =====
    if (data.fuel_level !== undefined) {
      // Process fuel reading
      const fuelResult = await fuelService.processFuelReading(data.id, data.fuel_level, Date.now());
      
      // Check for fuel alerts
      if (fuelResult.alerts && fuelResult.alerts.length > 0) {
        for (const fuelAlert of fuelResult.alerts) {
          alerts.push(fuelAlert);
          // Send SMS/Push for low/critical fuel
          alertManager.handleFuelAlert(data.id, data.fuel_level).catch(err => {
            console.error('Error sending fuel alert:', err.message);
          });
        }
      }
    }
    
    // Store state
    const machineData = {
      id: data.id,
      temp: data.temp,
      vibration: { x: data.vib_x, y: data.vib_y, z: data.vib_z },
      gps: { lat: data.gps?.[0], lng: data.gps?.[1] },
      speed: data.speed || 0,
      fuelLevel: data.fuel_level,
      engineHours: data.engine_hours,
      state,
      alerts,
      timestamp: data.timestamp || Date.now()
    };
    
    machineStates.set(data.id, machineData);
    
    // Emit to connected clients
    io.emit('device_update', machineData);
    
    // Persist to database (async - fire and forget for performance)
    db.queueSensorLog(machineData).catch(err => {
      console.error('Error queuing sensor log:', err.message);
    });
    
    // Log alerts
    if (alerts.length > 0) {
      console.log(`⚠️ ALERT [${data.id}]:`, alerts.map(a => `${a.type}: ${a.message}`).join(', '));
      
      for (const alert of alerts) {
        // Persist alert to database
        db.createAlert(data.id, alert).catch(err => {
          console.error('Error creating alert:', err.message);
        });
      }
    }
    
  } catch (err) {
    console.error('Error processing MQTT message:', err);
  }
});

// Socket.io connections
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send current state of all machines
  socket.emit('initial_state', Array.from(machineStates.values()));
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Export for routes to use
app.set('io', io);
app.set('machineStates', machineStates);
app.set('mqttClient', mqttClient);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 AgriTrack API running on port ${PORT}`);
});

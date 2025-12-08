/**
 * Database Service - Supabase Integration
 * Handles all database operations for AgriTrack
 */

const { createClient } = require('@supabase/supabase-js');

class DatabaseService {
  constructor() {
    this.supabase = null;
    this.isConnected = false;
    this.batchQueue = [];
    this.batchSize = 50; // Insert logs in batches of 50
    this.flushInterval = 5000; // Flush every 5 seconds
    this.lastFlush = Date.now();
    
    // Cache machine IDs to avoid repeated lookups
    this.machineIdCache = new Map();
    
    this.init();
  }

  init() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      this.isConnected = true;
      console.log('✅ Database service initialized (Supabase connected)');
      
      // Start batch flush timer
      setInterval(() => this.flushBatch(), this.flushInterval);
      
      // Pre-load existing machines into cache
      this.loadMachineCache();
    } else {
      console.log('⚠️ Database not configured - running in memory-only mode');
    }
  }

  /**
   * Get Supabase client instance for use by other services
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Pre-load existing machines into cache
   */
  async loadMachineCache() {
    try {
      const { data, error } = await this.supabase
        .from('machines')
        .select('id, device_id');
      
      if (data) {
        data.forEach(m => this.machineIdCache.set(m.device_id, m.id));
        console.log(`📦 Loaded ${data.length} machines into cache`);
      }
    } catch (err) {
      console.error('⚠️ Failed to load machine cache:', err.message);
    }
  }

  /**
   * Get or create machine ID for a device
   * Auto-creates machine if it doesn't exist
   * Handles race conditions with upsert
   */
  async getOrCreateMachineId(deviceId, machineData = {}) {
    // Check cache first
    if (this.machineIdCache.has(deviceId)) {
      return this.machineIdCache.get(deviceId);
    }

    if (!this.isConnected) return null;

    try {
      // Auto-create machine for simulated devices using upsert
      const machineType = this.inferMachineType(deviceId);
      const location = this.getRandomLocation();
      
      const { data: machine, error } = await this.supabase
        .from('machines')
        .upsert({
          device_id: deviceId,
          name: machineData.name || `Machine ${deviceId}`,
          type: machineData.type || machineType,
          model: machineData.model || 'Simulated Device',
          district: machineData.district || location.district,
          state: machineData.state || location.state,
          status: 'available'
        }, {
          onConflict: 'device_id',
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (error) {
        // If upsert failed, try to just fetch the existing one
        const { data: existing } = await this.supabase
          .from('machines')
          .select('id')
          .eq('device_id', deviceId)
          .single();
        
        if (existing) {
          this.machineIdCache.set(deviceId, existing.id);
          return existing.id;
        }
        
        console.error(`❌ Error getting/creating machine ${deviceId}:`, error.message);
        return null;
      }

      if (!this.machineIdCache.has(deviceId)) {
        console.log(`🆕 Auto-created machine: ${deviceId} (${machineType})`);
      }
      this.machineIdCache.set(deviceId, machine.id);
      return machine.id;
    } catch (err) {
      console.error(`❌ Error getting/creating machine ${deviceId}:`, err.message);
      return null;
    }
  }

  /**
   * Infer machine type from device ID
   */
  inferMachineType(deviceId) {
    const id = parseInt(deviceId.replace(/\D/g, '')) || 0;
    const types = ['tractor', 'harvester', 'baler', 'rotavator', 'cultivator'];
    return types[id % types.length];
  }

  /**
   * Get random location for auto-created machines
   */
  getRandomLocation() {
    const locations = [
      { district: 'Ludhiana', state: 'Punjab' },
      { district: 'Amritsar', state: 'Punjab' },
      { district: 'Karnal', state: 'Haryana' },
      { district: 'Rohtak', state: 'Haryana' },
      { district: 'Hisar', state: 'Haryana' },
      { district: 'Jaipur', state: 'Rajasthan' },
      { district: 'Kota', state: 'Rajasthan' },
      { district: 'Delhi', state: 'Delhi' }
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // ═══════════════════════════════════════════════════════════════════
  // SENSOR LOGS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Queue sensor log for batch insert (high-frequency data)
   * Now async to handle machine_id lookup/creation
   */
  async queueSensorLog(data) {
    if (!this.isConnected) return;

    // Get or create machine ID
    const machineId = await this.getOrCreateMachineId(data.id);
    if (!machineId) {
      console.log(`⚠️ Skipping log for ${data.id} - no machine_id`);
      return;
    }

    const log = {
      machine_id: machineId,
      device_id: data.id,
      temperature: data.temp,
      vibration_x: data.vibration?.x || data.vib_x,
      vibration_y: data.vibration?.y || data.vib_y,
      vibration_z: data.vibration?.z || data.vib_z,
      latitude: data.gps?.lat || data.gps?.[0],
      longitude: data.gps?.lng || data.gps?.[1],
      speed: data.speed || 0,
      state: data.state,
      alerts: data.alerts?.length > 0 ? data.alerts : null,
      timestamp: new Date(data.timestamp || Date.now()).toISOString()
    };

    this.batchQueue.push(log);

    // Flush if batch size reached
    if (this.batchQueue.length >= this.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * Flush queued sensor logs to database
   */
  async flushBatch() {
    if (!this.isConnected || this.batchQueue.length === 0) return;

    const logsToInsert = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const { error } = await this.supabase
        .from('sensor_logs')
        .insert(logsToInsert);

      if (error) {
        console.error('❌ Error inserting sensor logs:', error.message);
        // Re-queue failed logs (up to a limit)
        if (this.batchQueue.length < 500) {
          this.batchQueue.push(...logsToInsert);
        }
      } else {
        console.log(`📊 Persisted ${logsToInsert.length} sensor logs`);
      }
    } catch (err) {
      console.error('❌ Database flush error:', err.message);
    }
  }

  /**
   * Get sensor logs for a machine
   */
  async getSensorLogs(deviceId, options = {}) {
    if (!this.isConnected) return { data: [], error: null };

    const { limit = 100, startDate, endDate } = options;

    let query = this.supabase
      .from('sensor_logs')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    return await query;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ALERTS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create alert in database
   */
  async createAlert(machineDeviceId, alert) {
    if (!this.isConnected) return null;

    try {
      // Get or create machine ID using cache
      const machineId = await this.getOrCreateMachineId(machineDeviceId);
      
      if (!machineId) {
        console.log(`⚠️ Cannot create alert - machine not found: ${machineDeviceId}`);
        return null;
      }

      const { data, error } = await this.supabase
        .from('alerts')
        .insert({
          machine_id: machineId,
          type: alert.type,
          severity: alert.severity || 'warning',
          message: alert.message
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating alert:', error.message);
        return null;
      }

      console.log(`🚨 Alert persisted: [${alert.type}] ${alert.message}`);
      return data;
    } catch (err) {
      console.error('❌ Alert creation error:', err.message);
      return null;
    }
  }

  /**
   * Get alerts for a machine
   */
  async getAlerts(machineId, options = {}) {
    if (!this.isConnected) return { data: [], error: null };

    const { limit = 50, unacknowledgedOnly = false } = options;

    let query = this.supabase
      .from('alerts')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unacknowledgedOnly) {
      query = query.eq('acknowledged', false);
    }

    return await query;
  }

  /**
   * Get all recent alerts
   */
  async getRecentAlerts(limit = 100) {
    if (!this.isConnected) return { data: [], error: null };

    return await this.supabase
      .from('alerts')
      .select(`
        *,
        machine:machines(device_id, name, type)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, userId = null) {
    if (!this.isConnected) return null;

    const { data, error } = await this.supabase
      .from('alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId
      })
      .eq('id', alertId)
      .select()
      .single();

    return { data, error };
  }

  // ═══════════════════════════════════════════════════════════════════
  // MACHINES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all machines
   */
  async getMachines() {
    if (!this.isConnected) return { data: [], error: null };

    return await this.supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /**
   * Get machine by device_id
   */
  async getMachineByDeviceId(deviceId) {
    if (!this.isConnected) return { data: null, error: null };

    return await this.supabase
      .from('machines')
      .select('*')
      .eq('device_id', deviceId)
      .single();
  }

  /**
   * Update machine status and location
   */
  async updateMachineState(deviceId, state) {
    if (!this.isConnected) return null;

    const updateData = {
      status: this.mapStateToStatus(state.state),
      last_location: state.gps ? { lat: state.gps.lat, lng: state.gps.lng } : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('machines')
      .update(updateData)
      .eq('device_id', deviceId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Create or update machine (upsert)
   */
  async upsertMachine(deviceId, machineData) {
    if (!this.isConnected) return null;

    const { data, error } = await this.supabase
      .from('machines')
      .upsert({
        device_id: deviceId,
        name: machineData.name || `Machine ${deviceId}`,
        type: machineData.type || 'tractor',
        district: machineData.district,
        state: machineData.state,
        status: 'available',
        last_location: machineData.gps ? { lat: machineData.gps.lat, lng: machineData.gps.lng } : null
      }, {
        onConflict: 'device_id'
      })
      .select()
      .single();

    return { data, error };
  }

  // ═══════════════════════════════════════════════════════════════════
  // BOOKINGS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all bookings
   */
  async getBookings(filters = {}) {
    if (!this.isConnected) return { data: [], error: null };

    let query = this.supabase
      .from('bookings')
      .select(`
        *,
        machine:machines(*),
        farmer:users(*)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.farmer_id) {
      query = query.eq('farmer_id', filters.farmer_id);
    }
    if (filters.machine_id) {
      query = query.eq('machine_id', filters.machine_id);
    }

    return await query;
  }

  /**
   * Create booking
   */
  async createBooking(bookingData) {
    if (!this.isConnected) return { data: null, error: { message: 'Database not connected' } };

    const { data, error } = await this.supabase
      .from('bookings')
      .insert({
        machine_id: bookingData.machine_id,
        farmer_id: bookingData.farmer_id,
        scheduled_date: bookingData.scheduled_date,
        notes: bookingData.notes,
        status: 'pending'
      })
      .select(`
        *,
        machine:machines(*),
        farmer:users(*)
      `)
      .single();

    return { data, error };
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId, status, acresCovered = null) {
    if (!this.isConnected) return { data: null, error: null };

    const updateData = { status };
    if (acresCovered !== null) {
      updateData.acres_covered = acresCovered;
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    return { data, error };
  }

  // ═══════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create or update user from Clerk webhook
   */
  async upsertUser(clerkId, userData) {
    if (!this.isConnected) return { data: null, error: null };

    const { data, error } = await this.supabase
      .from('users')
      .upsert({
        clerk_id: clerkId,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role || 'farmer'
      }, {
        onConflict: 'clerk_id'
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId) {
    if (!this.isConnected) return { data: null, error: null };

    return await this.supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get dashboard analytics
   */
  async getAnalytics() {
    if (!this.isConnected) return null;

    try {
      // Get machine counts by status
      const { data: machines } = await this.supabase
        .from('machines')
        .select('status');

      const statusCounts = machines?.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get booking counts by status
      const { data: bookings } = await this.supabase
        .from('bookings')
        .select('status');

      const bookingCounts = bookings?.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get alert counts (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: alertCount } = await this.supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      // Get unacknowledged alert count
      const { count: unacknowledgedAlerts } = await this.supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('acknowledged', false);

      return {
        machines: {
          total: machines?.length || 0,
          byStatus: statusCounts
        },
        bookings: {
          total: bookings?.length || 0,
          byStatus: bookingCounts
        },
        alerts: {
          last24Hours: alertCount || 0,
          unacknowledged: unacknowledgedAlerts || 0
        }
      };
    } catch (err) {
      console.error('❌ Analytics error:', err.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════

  mapStateToStatus(state) {
    switch (state) {
      case 'active':
        return 'in_use';
      case 'idle':
        return 'in_use';
      case 'maintenance':
        return 'maintenance';
      case 'off':
      default:
        return 'available';
    }
  }

  isConfigured() {
    return this.isConnected;
  }
}

// Export singleton instance
module.exports = new DatabaseService();

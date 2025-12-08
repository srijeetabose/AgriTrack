/**
 * Fuel Tracking Service
 * Handles fuel consumption monitoring, analytics, and alerts
 */

class FuelService {
  constructor() {
    this.supabase = null;
    this.fuelLevels = new Map(); // deviceId -> { level, lastUpdate, consumption24h }
    this.fuelHistory = new Map(); // deviceId -> array of recent readings
    this.historyLimit = 100; // Keep last 100 readings per machine
  }

  setSupabase(client) {
    this.supabase = client;
  }

  /**
   * Process fuel reading from sensor
   */
  async processFuelReading(deviceId, fuelLevel, timestamp = Date.now()) {
    // Get previous reading
    const prev = this.fuelLevels.get(deviceId);
    
    // Store new reading
    this.fuelLevels.set(deviceId, {
      level: fuelLevel,
      lastUpdate: timestamp,
      prevLevel: prev?.level
    });

    // Add to history
    if (!this.fuelHistory.has(deviceId)) {
      this.fuelHistory.set(deviceId, []);
    }
    const history = this.fuelHistory.get(deviceId);
    history.push({ level: fuelLevel, timestamp });
    
    // Trim history
    if (history.length > this.historyLimit) {
      history.shift();
    }

    // Calculate consumption if we have previous reading
    let consumption = null;
    if (prev && prev.level > fuelLevel) {
      consumption = prev.level - fuelLevel;
    }

    // Check for anomalies
    const alerts = [];

    // Low fuel alert
    if (fuelLevel < 15) {
      alerts.push({
        type: 'fuel_low',
        severity: fuelLevel < 5 ? 'critical' : 'warning',
        message: `Fuel level critically low: ${fuelLevel}%`
      });
    }

    // Sudden drop (possible theft or leak)
    if (prev && prev.level - fuelLevel > 20) {
      alerts.push({
        type: 'fuel_anomaly',
        severity: 'critical',
        message: `Sudden fuel drop detected: ${prev.level}% → ${fuelLevel}% (${prev.level - fuelLevel}% loss)`
      });
    }

    // Persist to database
    await this.logFuelReading(deviceId, fuelLevel, consumption, timestamp);

    return { level: fuelLevel, consumption, alerts };
  }

  /**
   * Log fuel reading to database
   */
  async logFuelReading(deviceId, level, consumption, timestamp) {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('fuel_logs')
        .insert({
          device_id: deviceId,
          fuel_level: level,
          consumption: consumption,
          timestamp: new Date(timestamp).toISOString()
        });
    } catch (err) {
      console.error('Error logging fuel:', err.message);
    }
  }

  /**
   * Get current fuel level for a machine
   */
  getFuelLevel(deviceId) {
    return this.fuelLevels.get(deviceId);
  }

  /**
   * Calculate fuel consumption for a time period
   */
  async getConsumption(deviceId, hours = 24) {
    if (!this.supabase) {
      // Use in-memory data
      const history = this.fuelHistory.get(deviceId) || [];
      if (history.length < 2) return null;

      const cutoff = Date.now() - (hours * 60 * 60 * 1000);
      const relevant = history.filter(h => h.timestamp >= cutoff);
      
      if (relevant.length < 2) return null;

      const first = relevant[0];
      const last = relevant[relevant.length - 1];
      
      return {
        startLevel: first.level,
        endLevel: last.level,
        consumed: Math.max(0, first.level - last.level),
        periodHours: hours,
        readings: relevant.length
      };
    }

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data } = await this.supabase
        .from('fuel_logs')
        .select('fuel_level, timestamp')
        .eq('device_id', deviceId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });

      if (!data || data.length < 2) return null;

      const first = data[0];
      const last = data[data.length - 1];

      // Calculate total consumption (sum of all drops, ignoring refills)
      let totalConsumed = 0;
      for (let i = 1; i < data.length; i++) {
        const drop = data[i - 1].fuel_level - data[i].fuel_level;
        if (drop > 0) totalConsumed += drop;
      }

      return {
        startLevel: first.fuel_level,
        endLevel: last.fuel_level,
        consumed: totalConsumed,
        periodHours: hours,
        readings: data.length
      };
    } catch (err) {
      console.error('Error calculating consumption:', err.message);
      return null;
    }
  }

  /**
   * Get fuel analytics for a machine
   */
  async getFuelAnalytics(deviceId, days = 7) {
    if (!this.supabase) return null;

    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data } = await this.supabase
        .from('fuel_logs')
        .select('fuel_level, consumption, timestamp')
        .eq('device_id', deviceId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });

      if (!data || data.length === 0) return null;

      // Calculate daily consumption
      const dailyConsumption = {};
      let totalConsumed = 0;
      let refillCount = 0;

      for (let i = 1; i < data.length; i++) {
        const day = new Date(data[i].timestamp).toISOString().split('T')[0];
        const drop = data[i - 1].fuel_level - data[i].fuel_level;
        
        if (drop > 0) {
          dailyConsumption[day] = (dailyConsumption[day] || 0) + drop;
          totalConsumed += drop;
        } else if (drop < -10) {
          // Significant increase = refill
          refillCount++;
        }
      }

      const avgDailyConsumption = totalConsumed / Math.max(Object.keys(dailyConsumption).length, 1);

      // Estimate range (assuming 100% = full tank)
      const currentLevel = this.fuelLevels.get(deviceId)?.level || data[data.length - 1].fuel_level;
      const estimatedRange = avgDailyConsumption > 0 
        ? Math.floor(currentLevel / avgDailyConsumption)
        : null;

      return {
        currentLevel,
        totalConsumed: Math.round(totalConsumed * 10) / 10,
        avgDailyConsumption: Math.round(avgDailyConsumption * 10) / 10,
        refillCount,
        estimatedDaysRemaining: estimatedRange,
        dailyBreakdown: dailyConsumption,
        periodDays: days
      };
    } catch (err) {
      console.error('Error getting fuel analytics:', err.message);
      return null;
    }
  }

  /**
   * Detect refill events
   */
  async getRefillHistory(deviceId, days = 30) {
    if (!this.supabase) return [];

    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data } = await this.supabase
        .from('fuel_logs')
        .select('fuel_level, timestamp')
        .eq('device_id', deviceId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });

      if (!data || data.length < 2) return [];

      const refills = [];
      for (let i = 1; i < data.length; i++) {
        const increase = data[i].fuel_level - data[i - 1].fuel_level;
        if (increase > 10) { // Significant increase = refill
          refills.push({
            timestamp: data[i].timestamp,
            beforeLevel: data[i - 1].fuel_level,
            afterLevel: data[i].fuel_level,
            amount: increase
          });
        }
      }

      return refills;
    } catch (err) {
      console.error('Error getting refill history:', err.message);
      return [];
    }
  }

  /**
   * Get fleet fuel overview
   */
  async getFleetFuelOverview() {
    const overview = {
      totalMachines: this.fuelLevels.size,
      lowFuel: [],
      criticalFuel: [],
      averageLevel: 0
    };

    let totalLevel = 0;
    
    for (const [deviceId, data] of this.fuelLevels) {
      totalLevel += data.level;
      
      if (data.level < 5) {
        overview.criticalFuel.push({ deviceId, level: data.level });
      } else if (data.level < 15) {
        overview.lowFuel.push({ deviceId, level: data.level });
      }
    }

    overview.averageLevel = overview.totalMachines > 0 
      ? Math.round(totalLevel / overview.totalMachines) 
      : 0;

    return overview;
  }

  /**
   * Get fuel stats for a machine (combines current level and consumption)
   */
  async getFuelStats(deviceId) {
    const currentData = this.fuelLevels.get(deviceId);
    
    if (!currentData) {
      // Try to get from database
      if (this.supabase) {
        try {
          const { data } = await this.supabase
            .from('fuel_logs')
            .select('fuel_level, timestamp')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(1);
          
          if (data && data.length > 0) {
            return {
              deviceId,
              currentLevel: data[0].fuel_level,
              lastUpdate: data[0].timestamp,
              consumption24h: await this.getConsumption(deviceId, 24),
              status: this.getFuelStatus(data[0].fuel_level)
            };
          }
        } catch (err) {
          console.error('Error getting fuel stats:', err.message);
        }
      }
      return null;
    }

    return {
      deviceId,
      currentLevel: currentData.level,
      lastUpdate: new Date(currentData.lastUpdate).toISOString(),
      consumption24h: await this.getConsumption(deviceId, 24),
      status: this.getFuelStatus(currentData.level)
    };
  }

  /**
   * Get fuel status label
   */
  getFuelStatus(level) {
    if (level < 5) return 'critical';
    if (level < 15) return 'low';
    if (level < 30) return 'medium';
    return 'good';
  }

  /**
   * Get fuel history for a machine
   */
  async getFuelHistory(deviceId, hours = 24) {
    // Try in-memory first
    const inMemory = this.fuelHistory.get(deviceId);
    if (inMemory && inMemory.length > 0) {
      const cutoff = Date.now() - (hours * 60 * 60 * 1000);
      return inMemory
        .filter(h => h.timestamp >= cutoff)
        .map(h => ({
          level: h.level,
          timestamp: new Date(h.timestamp).toISOString()
        }));
    }

    // Try database
    if (this.supabase) {
      try {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        
        const { data } = await this.supabase
          .from('fuel_logs')
          .select('fuel_level, timestamp')
          .eq('device_id', deviceId)
          .gte('timestamp', since)
          .order('timestamp', { ascending: true });

        return data || [];
      } catch (err) {
        console.error('Error getting fuel history:', err.message);
      }
    }

    return [];
  }

  /**
   * Get refueling events for a machine
   */
  async getRefuelingEvents(deviceId, limit = 20) {
    if (!this.supabase) return [];

    try {
      // Get machine ID from device_id
      const { data: machine } = await this.supabase
        .from('machines')
        .select('id')
        .eq('device_id', deviceId)
        .single();

      if (!machine) return [];

      const { data } = await this.supabase
        .from('refueling_events')
        .select('*')
        .eq('machine_id', machine.id)
        .order('event_time', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (err) {
      console.error('Error getting refueling events:', err.message);
      return [];
    }
  }
}

module.exports = new FuelService();

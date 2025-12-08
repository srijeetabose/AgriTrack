/**
 * Geofencing Service
 * Handles geofence creation, monitoring, and breach detection
 */

class GeofenceService {
  constructor() {
    this.supabase = null;
    this.geofenceCache = new Map(); // machineId -> geofences array
    this.machinePositions = new Map(); // machineId -> { lat, lng, insideGeofences: Set }
  }

  setSupabase(client) {
    this.supabase = client;
    this.loadGeofences();
  }

  /**
   * Load all geofences into cache
   */
  async loadGeofences() {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from('geofences')
        .select('*, machine:machines(device_id, name)');

      if (data) {
        // Group by machine
        data.forEach(gf => {
          const deviceId = gf.machine?.device_id;
          if (deviceId) {
            if (!this.geofenceCache.has(deviceId)) {
              this.geofenceCache.set(deviceId, []);
            }
            this.geofenceCache.get(deviceId).push(gf);
          }
        });
        console.log(`🗺️ Loaded ${data.length} geofences`);
      }
    } catch (err) {
      console.error('Error loading geofences:', err.message);
    }
  }

  /**
   * Create a new geofence
   */
  async createGeofence(geofenceData) {
    if (!this.supabase) return null;

    const { 
      name, 
      description,
      ownerId,
      type, 
      centerLat, 
      centerLng, 
      radiusMeters, 
      polygonCoords,
      active 
    } = geofenceData;

    try {
      const { data, error } = await this.supabase
        .from('geofences')
        .insert({
          name,
          description,
          owner_id: ownerId,
          type: type || 'circle',
          center_lat: centerLat,
          center_lng: centerLng,
          radius_meters: radiusMeters,
          polygon_coords: polygonCoords,
          active: active !== false
        })
        .select()
        .single();

      if (error) throw error;

      // Update cache
      await this.loadGeofences();

      console.log(`🗺️ Created geofence: ${name}`);
      return data;
    } catch (err) {
      console.error('Error creating geofence:', err.message);
      return null;
    }
  }

  /**
   * Update geofence
   */
  async updateGeofence(geofenceId, updates) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('geofences')
        .update(updates)
        .eq('id', geofenceId)
        .select()
        .single();

      if (error) throw error;
      
      await this.loadGeofences();
      return data;
    } catch (err) {
      console.error('Error updating geofence:', err.message);
      return null;
    }
  }

  /**
   * Delete geofence
   */
  async deleteGeofence(geofenceId) {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('geofences')
        .delete()
        .eq('id', geofenceId);

      if (error) throw error;
      
      await this.loadGeofences();
      return true;
    } catch (err) {
      console.error('Error deleting geofence:', err.message);
      return false;
    }
  }

  /**
   * Get geofences for a machine
   */
  async getGeofencesForMachine(machineId) {
    if (!this.supabase) return [];

    try {
      const { data } = await this.supabase
        .from('geofences')
        .select('*')
        .eq('machine_id', machineId);

      return data || [];
    } catch (err) {
      console.error('Error getting geofences:', err.message);
      return [];
    }
  }

  /**
   * Check if a point is inside a circle geofence
   */
  isInsideCircle(lat, lng, centerLat, centerLng, radiusMeters) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat - centerLat);
    const dLng = this.toRad(lng - centerLng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(centerLat)) * Math.cos(this.toRad(lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusMeters;
  }

  /**
   * Check if a point is inside a polygon geofence (ray casting algorithm)
   */
  isInsidePolygon(lat, lng, polygon) {
    if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) {
      return false;
    }

    const coords = polygon.coordinates[0]; // GeoJSON format: [[[lng, lat], ...]]
    let inside = false;

    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][1], yi = coords[i][0]; // lat, lng
      const xj = coords[j][1], yj = coords[j][0];

      if (((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Check machine position against all its geofences
   * Returns array of breach events
   */
  checkPosition(deviceId, lat, lng) {
    const geofences = this.geofenceCache.get(deviceId) || [];
    if (geofences.length === 0) return [];

    const events = [];
    
    // Get previous state
    let prevState = this.machinePositions.get(deviceId);
    if (!prevState) {
      prevState = { lat: null, lng: null, insideGeofences: new Set() };
    }

    const currentInside = new Set();

    for (const gf of geofences) {
      if (!gf.active) continue;

      let isInside = false;

      if (gf.type === 'circle' && gf.center_lat && gf.center_lng && gf.radius) {
        isInside = this.isInsideCircle(lat, lng, gf.center_lat, gf.center_lng, gf.radius);
      } else if (gf.type === 'polygon' && gf.polygon) {
        isInside = this.isInsidePolygon(lat, lng, gf.polygon);
      }

      if (isInside) {
        currentInside.add(gf.id);
      }

      const wasInside = prevState.insideGeofences.has(gf.id);

      // Check for entry
      if (isInside && !wasInside && gf.alert_on_entry) {
        events.push({
          type: 'geofence_entry',
          geofenceId: gf.id,
          geofenceName: gf.name,
          deviceId,
          location: { lat, lng },
          message: `Entered geofence "${gf.name}"`
        });
      }

      // Check for exit
      if (!isInside && wasInside && gf.alert_on_exit) {
        events.push({
          type: 'geofence_exit',
          geofenceId: gf.id,
          geofenceName: gf.name,
          deviceId,
          location: { lat, lng },
          message: `Exited geofence "${gf.name}"`
        });
      }
    }

    // Update state
    this.machinePositions.set(deviceId, {
      lat,
      lng,
      insideGeofences: currentInside
    });

    return events;
  }

  /**
   * Log geofence event to database
   */
  async logGeofenceEvent(event) {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('geofence_events')
        .insert({
          geofence_id: event.geofenceId,
          device_id: event.deviceId,
          event_type: event.type,
          latitude: event.location.lat,
          longitude: event.location.lng
        });
    } catch (err) {
      console.error('Error logging geofence event:', err.message);
    }
  }

  /**
   * Check geofence for a machine at given coordinates
   * This is the main entry point called from index.js and routes
   * @param {string} deviceId - Machine device ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object} Result with events array and breach status
   */
  async checkGeofence(deviceId, lat, lng) {
    try {
      // Check position against cached geofences
      const events = this.checkPosition(deviceId, lat, lng);
      
      // Log any breach events to database
      for (const event of events) {
        await this.logGeofenceEvent(event);
      }

      return {
        deviceId,
        location: { lat, lng },
        events,
        breachDetected: events.length > 0
      };
    } catch (err) {
      console.error('Error checking geofence:', err.message);
      return {
        deviceId,
        location: { lat, lng },
        events: [],
        breachDetected: false,
        error: err.message
      };
    }
  }
}

module.exports = new GeofenceService();

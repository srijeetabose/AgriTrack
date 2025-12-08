/**
 * Maintenance Scheduling Service
 * Handles maintenance schedules, reminders, and service history
 */

class MaintenanceService {
  constructor() {
    this.supabase = null;
    this.maintenanceCache = new Map(); // machineId -> next maintenance
    this.checkInterval = null;
  }

  setSupabase(client) {
    this.supabase = client;
    this.loadUpcomingMaintenance();
    
    // Check for due maintenance every hour
    this.checkInterval = setInterval(() => this.checkDueMaintenance(), 60 * 60 * 1000);
  }

  /**
   * Load upcoming maintenance into cache
   */
  async loadUpcomingMaintenance() {
    if (!this.supabase) return;

    try {
      const { data } = await this.supabase
        .from('maintenance_schedules')
        .select('*, machine:machines(device_id, name)')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .eq('status', 'scheduled')
        .order('due_date', { ascending: true });

      if (data) {
        data.forEach(m => {
          const deviceId = m.machine?.device_id;
          if (deviceId) {
            this.maintenanceCache.set(deviceId, m);
          }
        });
        console.log(`🔧 Loaded ${data.length} upcoming maintenance schedules`);
      }
    } catch (err) {
      console.error('Error loading maintenance:', err.message);
    }
  }

  /**
   * Create maintenance schedule
   */
  async createSchedule(machineId, scheduleData) {
    if (!this.supabase) return null;

    const {
      maintenanceType,
      dueDate,
      dueMileage,
      dueHours,
      priority,
      notes,
      estimatedCost,
      assignedTo
    } = scheduleData;

    try {
      const { data, error } = await this.supabase
        .from('maintenance_schedules')
        .insert({
          machine_id: machineId,
          maintenance_type: maintenanceType,
          due_date: dueDate,
          due_mileage: dueMileage,
          due_hours: dueHours,
          priority: priority || 'medium',
          notes,
          estimated_cost: estimatedCost,
          assigned_to: assignedTo,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      await this.loadUpcomingMaintenance();
      console.log(`🔧 Created maintenance schedule: ${maintenanceType} for machine ${machineId}`);
      return data;
    } catch (err) {
      console.error('Error creating maintenance schedule:', err.message);
      return null;
    }
  }

  /**
   * Update maintenance schedule
   */
  async updateSchedule(scheduleId, updates) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('maintenance_schedules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      await this.loadUpcomingMaintenance();
      return data;
    } catch (err) {
      console.error('Error updating maintenance:', err.message);
      return null;
    }
  }

  /**
   * Complete maintenance and log history
   */
  async completeMaintenance(scheduleId, completionData) {
    if (!this.supabase) return null;

    const {
      completedDate,
      actualCost,
      performedBy,
      notes,
      partsReplaced,
      mileageAtService,
      hoursAtService
    } = completionData;

    try {
      // Get schedule details
      const { data: schedule } = await this.supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (!schedule) throw new Error('Schedule not found');

      // Update schedule status
      await this.supabase
        .from('maintenance_schedules')
        .update({
          status: 'completed',
          completed_date: completedDate || new Date().toISOString(),
          actual_cost: actualCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      // Create history record
      const { data: history, error } = await this.supabase
        .from('maintenance_history')
        .insert({
          machine_id: schedule.machine_id,
          schedule_id: scheduleId,
          maintenance_type: schedule.maintenance_type,
          completed_date: completedDate || new Date().toISOString(),
          performed_by: performedBy,
          cost: actualCost || schedule.estimated_cost,
          notes,
          parts_replaced: partsReplaced,
          mileage_at_service: mileageAtService,
          hours_at_service: hoursAtService
        })
        .select()
        .single();

      if (error) throw error;

      // Create next scheduled maintenance if recurring
      if (schedule.recurring_interval_days) {
        const nextDueDate = new Date(completedDate || Date.now());
        nextDueDate.setDate(nextDueDate.getDate() + schedule.recurring_interval_days);

        await this.createSchedule(schedule.machine_id, {
          maintenanceType: schedule.maintenance_type,
          dueDate: nextDueDate.toISOString().split('T')[0],
          dueMileage: mileageAtService ? mileageAtService + (schedule.recurring_interval_mileage || 0) : null,
          dueHours: hoursAtService ? hoursAtService + (schedule.recurring_interval_hours || 0) : null,
          priority: schedule.priority,
          notes: `Recurring: ${schedule.maintenance_type}`,
          estimatedCost: schedule.estimated_cost
        });
      }

      await this.loadUpcomingMaintenance();
      console.log(`✅ Completed maintenance: ${schedule.maintenance_type}`);
      return history;
    } catch (err) {
      console.error('Error completing maintenance:', err.message);
      return null;
    }
  }

  /**
   * Get maintenance schedules for a machine
   */
  async getSchedulesForMachine(machineId, includeCompleted = false) {
    if (!this.supabase) return [];

    try {
      let query = this.supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('machine_id', machineId)
        .order('due_date', { ascending: true });

      if (!includeCompleted) {
        query = query.neq('status', 'completed');
      }

      const { data } = await query;
      return data || [];
    } catch (err) {
      console.error('Error getting schedules:', err.message);
      return [];
    }
  }

  /**
   * Get maintenance history for a machine
   */
  async getHistoryForMachine(machineId, limit = 20) {
    if (!this.supabase) return [];

    try {
      const { data } = await this.supabase
        .from('maintenance_history')
        .select('*')
        .eq('machine_id', machineId)
        .order('completed_date', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (err) {
      console.error('Error getting history:', err.message);
      return [];
    }
  }

  /**
   * Get all upcoming maintenance (fleet-wide)
   */
  async getUpcomingMaintenance(days = 30) {
    if (!this.supabase) return [];

    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data } = await this.supabase
        .from('maintenance_schedules')
        .select('*, machine:machines(device_id, name, type)')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .eq('status', 'scheduled')
        .order('due_date', { ascending: true });

      return data || [];
    } catch (err) {
      console.error('Error getting upcoming maintenance:', err.message);
      return [];
    }
  }

  /**
   * Get overdue maintenance
   */
  async getOverdueMaintenance() {
    if (!this.supabase) return [];

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await this.supabase
        .from('maintenance_schedules')
        .select('*, machine:machines(device_id, name, type)')
        .lt('due_date', today)
        .eq('status', 'scheduled')
        .order('due_date', { ascending: true });

      return data || [];
    } catch (err) {
      console.error('Error getting overdue maintenance:', err.message);
      return [];
    }
  }

  /**
   * Check for maintenance that's due and send reminders
   */
  async checkDueMaintenance() {
    if (!this.supabase) return;

    try {
      const today = new Date();
      const reminderDays = [7, 3, 1, 0]; // Send reminders at these days before due

      for (const daysAhead of reminderDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const dateStr = targetDate.toISOString().split('T')[0];

        const { data } = await this.supabase
          .from('maintenance_schedules')
          .select('*, machine:machines(device_id, name, owner_id)')
          .eq('due_date', dateStr)
          .eq('status', 'scheduled')
          .is('reminder_sent', false);

        if (data && data.length > 0) {
          for (const schedule of data) {
            // Mark reminder as sent
            await this.supabase
              .from('maintenance_schedules')
              .update({ reminder_sent: true })
              .eq('id', schedule.id);

            // Emit event for notification service to handle
            console.log(`📧 Maintenance reminder: ${schedule.maintenance_type} for ${schedule.machine?.name} due in ${daysAhead} days`);
            
            // The notification will be sent by the calling code
          }
        }
      }
    } catch (err) {
      console.error('Error checking due maintenance:', err.message);
    }
  }

  /**
   * Get maintenance summary statistics
   */
  async getMaintenanceSummary() {
    if (!this.supabase) return null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get overdue count
      const { count: overdueCount } = await this.supabase
        .from('maintenance_schedules')
        .select('*', { count: 'exact', head: true })
        .lt('due_date', today)
        .eq('status', 'scheduled');

      // Get upcoming count
      const { count: upcomingCount } = await this.supabase
        .from('maintenance_schedules')
        .select('*', { count: 'exact', head: true })
        .gte('due_date', today)
        .lte('due_date', thirtyDaysAhead)
        .eq('status', 'scheduled');

      // Get completed in last 30 days
      const { count: completedCount } = await this.supabase
        .from('maintenance_history')
        .select('*', { count: 'exact', head: true })
        .gte('completed_date', thirtyDaysAgo);

      // Get total cost in last 30 days
      const { data: costData } = await this.supabase
        .from('maintenance_history')
        .select('cost')
        .gte('completed_date', thirtyDaysAgo);

      const totalCost = costData?.reduce((sum, h) => sum + (h.cost || 0), 0) || 0;

      return {
        overdue: overdueCount || 0,
        upcoming: upcomingCount || 0,
        completedLast30Days: completedCount || 0,
        totalCostLast30Days: totalCost,
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error getting maintenance summary:', err.message);
      return null;
    }
  }

  /**
   * Maintenance types available
   */
  getMaintenanceTypes() {
    return [
      { id: 'oil_change', name: 'Oil Change', defaultIntervalDays: 90, defaultIntervalHours: 250 },
      { id: 'filter_replacement', name: 'Filter Replacement', defaultIntervalDays: 180, defaultIntervalHours: 500 },
      { id: 'tire_rotation', name: 'Tire Rotation/Check', defaultIntervalDays: 60, defaultIntervalHours: null },
      { id: 'brake_inspection', name: 'Brake Inspection', defaultIntervalDays: 180, defaultIntervalHours: 500 },
      { id: 'belt_check', name: 'Belt Check/Replacement', defaultIntervalDays: 365, defaultIntervalHours: 1000 },
      { id: 'hydraulic_service', name: 'Hydraulic System Service', defaultIntervalDays: 365, defaultIntervalHours: 1000 },
      { id: 'electrical_check', name: 'Electrical System Check', defaultIntervalDays: 180, defaultIntervalHours: null },
      { id: 'full_service', name: 'Full Service', defaultIntervalDays: 365, defaultIntervalHours: 1500 },
      { id: 'seasonal_prep', name: 'Seasonal Preparation', defaultIntervalDays: 180, defaultIntervalHours: null },
      { id: 'custom', name: 'Custom', defaultIntervalDays: null, defaultIntervalHours: null }
    ];
  }
}

module.exports = new MaintenanceService();

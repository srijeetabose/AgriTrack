/**
 * AgriTrack API Client
 * Connects to all backend services
 */

// API Base URLs
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
const CROP_RESIDUE_URL = process.env.NEXT_PUBLIC_CROP_RESIDUE_URL || 'http://localhost:8001';

// ============================================================================
// Machine API Types
// ============================================================================

export interface MachineData {
  id: string;
  temp: number;
  vibration: { x: number; y: number; z: number };
  gps: { lat: number; lng: number };
  speed: number;
  state: 'active' | 'idle' | 'off' | 'overheat';
  alerts: Array<{ type: string; message: string }>;
  timestamp: number;
}

export interface MachineStats {
  totalMachines: number;
  activeMachines: number;
  idleMachines: number;
  offlineMachines: number;
  alertCount: number;
  overheatAlerts: number;
  avgTemperature: number;
}

// ============================================================================
// AI Engine API Types
// ============================================================================

export interface AnomalyResult {
  machine_id: string;
  is_anomaly: boolean;
  anomaly_score: number;
  anomaly_type: string | null;
  details: string;
}

export interface EfficiencyMetrics {
  averageEfficiency: number;
  topPerformers: EfficiencyEntry[];
  lowPerformers: EfficiencyEntry[];
  totalMachines: number;
  message?: string;
}

export interface EfficiencyEntry {
  machine_id: string;
  efficiency: number;
  active_time: number;
  total_time: number;
  distance_km: number;
}

export interface AIStats {
  buffer_size: number;
  unique_machines: number;
  temperature: { min: number; max: number; avg: number };
  speed: { min: number; max: number; avg: number };
  vibration: { min: number; max: number; avg: number };
  model_trained: boolean;
}

export interface AnomaliesResponse {
  anomalies: Array<{
    machine_id: string;
    temp: number;
    vibration: number;
    timestamp: number;
    type: string;
  }>;
  total: number;
}

// ============================================================================
// Crop Residue API Types
// ============================================================================

export interface CropPrediction {
  district_id: string;
  district_name: string;
  state: string;
  current_ndvi: number;
  decline_rate: number;
  days_to_harvest: number;
  predicted_harvest_date: string | null;
  priority_score: number;
  priority_level: string;
  status: string;
  latitude: number;
  longitude: number;
}

export interface MachineAllocation {
  machine_id: string;
  machine_type: string;
  capacity_hectares: number;
  assigned_district: string;
  district_name: string;
  travel_distance_km: number;
  estimated_days: number;
  priority_score: number;
}

export interface CropStatistics {
  total_districts: number;
  urgent_districts: number;
  harvest_ready: number;
  average_ndvi: number;
  total_machines: number;
  machines_allocated: number;
  allocation_rate: string;
  total_travel_km: number;
}

export interface CropDashboardData {
  metadata: {
    generated_at: string;
    region: string;
    analysis_days: number;
  };
  statistics: CropStatistics;
  predictions: CropPrediction[];
  allocations: MachineAllocation[];
  unallocated: string[];
  machines: any[];
  summary: any;
}

// ============================================================================
// Main API Client Functions
// ============================================================================

/**
 * Fetch analytics from main API
 */
export async function fetchAnalytics(): Promise<MachineStats> {
  const response = await fetch(`${API_URL}/api/v1/analytics`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

/**
 * Fetch machines list from main API
 */
export async function fetchMachines(): Promise<any[]> {
  const response = await fetch(`${API_URL}/api/v1/machines`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

/**
 * Fetch single machine from main API
 */
export async function fetchMachine(id: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/v1/machines/${id}`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

/**
 * Fetch efficiency metrics from AI Engine
 */
export async function fetchEfficiency(): Promise<EfficiencyMetrics> {
  try {
    const response = await fetch(`${AI_ENGINE_URL}/efficiency`);
    if (!response.ok) throw new Error(`AI Engine Error: ${response.status}`);
    return response.json();
  } catch (error) {
    // Return fallback if AI Engine unavailable
    return {
      averageEfficiency: 0,
      topPerformers: [],
      lowPerformers: [],
      totalMachines: 0,
      message: 'AI Engine unavailable'
    };
  }
}

/**
 * Fetch anomalies from AI Engine
 */
export async function fetchAnomalies(): Promise<AnomaliesResponse> {
  try {
    const response = await fetch(`${AI_ENGINE_URL}/anomalies`);
    if (!response.ok) throw new Error(`AI Engine Error: ${response.status}`);
    return response.json();
  } catch (error) {
    return { anomalies: [], total: 0 };
  }
}

/**
 * Fetch AI Engine stats
 */
export async function fetchAIStats(): Promise<AIStats | null> {
  try {
    const response = await fetch(`${AI_ENGINE_URL}/stats`);
    if (!response.ok) throw new Error(`AI Engine Error: ${response.status}`);
    return response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Train AI model
 */
export async function trainAIModel(): Promise<{ status: string; samples: number }> {
  const response = await fetch(`${AI_ENGINE_URL}/train`, { method: 'POST' });
  if (!response.ok) throw new Error(`AI Engine Error: ${response.status}`);
  return response.json();
}

/**
 * Fetch crop residue dashboard data
 */
export async function fetchCropDashboard(): Promise<CropDashboardData> {
  const response = await fetch(`${CROP_RESIDUE_URL}/api/dashboard`);
  if (!response.ok) throw new Error(`Crop Residue API Error: ${response.status}`);
  return response.json();
}

/**
 * Fetch crop predictions
 */
export async function fetchCropPredictions(): Promise<CropPrediction[]> {
  const response = await fetch(`${CROP_RESIDUE_URL}/api/predictions`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const data = await response.json();
  return data.predictions;
}

/**
 * Fetch urgent districts
 */
export async function fetchUrgentDistricts(): Promise<CropPrediction[]> {
  const response = await fetch(`${CROP_RESIDUE_URL}/api/urgent`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const data = await response.json();
  return data.urgent_districts;
}

/**
 * Fetch NDVI history for a district
 */
export async function fetchNDVIHistory(districtId: string): Promise<any> {
  const response = await fetch(`${CROP_RESIDUE_URL}/api/ndvi-history/${districtId}`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

/**
 * Fetch machine allocations
 */
export async function fetchAllocations(): Promise<MachineAllocation[]> {
  const response = await fetch(`${CROP_RESIDUE_URL}/api/allocations`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const data = await response.json();
  return data.allocations;
}

// ============================================================================
// Bookings API
// ============================================================================

export interface Booking {
  id: string;
  machine_id: string;
  farmer_id: string;
  scheduled_date: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  acres_covered?: number;
  created_at: string;
}

export async function fetchBookings(): Promise<Booking[]> {
  const response = await fetch(`${API_URL}/api/v1/bookings`);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export async function createBooking(booking: Partial<Booking>): Promise<Booking> {
  const response = await fetch(`${API_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking)
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export async function cancelBooking(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/bookings/${id}/cancel`, {
    method: 'PUT'
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
}

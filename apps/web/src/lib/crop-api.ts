/**
 * Crop Residue Management API Client
 * Connects to FastAPI backend at port 8001
 */

// Base URL from environment, then append /api for the actual endpoints
const BASE_URL = process.env.NEXT_PUBLIC_CROP_RESIDUE_URL || 'http://localhost:8001';
const API_BASE = `${BASE_URL}/api`;

export interface Prediction {
  district_id: string;
  district_name: string;
  state: string;
  current_ndvi: number;
  ndvi_decline_rate: number;
  days_until_harvest: number;
  predicted_harvest_date: string;
  priority_score: number;
  status: string;
  lat: number;
  lon: number;
  confidence: number;
}

export interface Allocation {
  machine_id: string;
  machine_type: string;
  machine_capacity_acres_per_day: number;
  machine_origin: { lat: number; lon: number };
  district_id: string;
  district_name: string;
  state: string;
  district_location: { lat: number; lon: number };
  distance_km: number;
  eta_hours: number;
  days_until_harvest: number;
  predicted_harvest_date: string;
  priority_score: number;
}

export interface Statistics {
  total_districts: number;
  urgent_districts: number;
  harvest_ready: number;
  average_ndvi: number;
  total_machines: number;
  machines_allocated: number;
  allocation_rate: string;
  total_travel_km: number;
}

export interface DashboardData {
  predictions: Prediction[];
  allocations: Allocation[];
  statistics: Statistics;
  metadata: {
    generated_at: string;
    region: string;
    analysis_days: number;
  };
  machines: any[];
  summary: any;
  unallocated: any[];
}

export interface NDVIDataPoint {
  date: string;
  ndvi: number;
}

export interface NDVIHistory {
  district_id: string;
  district_name: string;
  state: string;
  history: NDVIDataPoint[];
  num_days: number;
}

/**
 * Fetch complete dashboard data
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch predictions only
 */
export async function fetchPredictions(): Promise<Prediction[]> {
  const response = await fetch(`${API_BASE}/predictions`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch allocations only
 */
export async function fetchAllocations(): Promise<Allocation[]> {
  const response = await fetch(`${API_BASE}/allocations`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch urgent districts only
 */
export async function fetchUrgentDistricts(): Promise<Prediction[]> {
  const response = await fetch(`${API_BASE}/urgent`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch NDVI history for a specific district
 */
export async function fetchNDVIHistory(districtId: string): Promise<NDVIHistory> {
  const response = await fetch(`${API_BASE}/ndvi-history/${districtId}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

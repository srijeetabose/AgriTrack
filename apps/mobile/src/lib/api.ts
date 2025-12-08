const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface Machine {
  id: string
  type: string
  state: 'active' | 'idle' | 'off'
  lat: number
  lng: number
  temp: number
  fuel: number
  speed: number
  rpm: number
  vibration: number
  area: number
  alerts: Array<{ type: string; message: string }>
  timestamp: string
}

export interface Booking {
  id: string
  machine_id: string
  farmer_id: string
  scheduled_date: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  machine?: Machine
}

// Machines API
export async function getMachines(): Promise<Machine[]> {
  const res = await fetch(`${API_URL}/api/v1/machines`)
  if (!res.ok) throw new Error('Failed to fetch machines')
  return res.json()
}

export async function getMachine(id: string): Promise<Machine> {
  const res = await fetch(`${API_URL}/api/v1/machines/${id}`)
  if (!res.ok) throw new Error('Failed to fetch machine')
  return res.json()
}

export async function getRealtimeMachines(): Promise<Record<string, Machine>> {
  const res = await fetch(`${API_URL}/api/v1/machines/realtime/all`)
  if (!res.ok) throw new Error('Failed to fetch realtime machines')
  return res.json()
}

// Bookings API
export async function getBookings(farmerId: string): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/api/v1/bookings/farmer/${farmerId}`)
  if (!res.ok) throw new Error('Failed to fetch bookings')
  return res.json()
}

export async function createBooking(data: {
  machine_id: string
  farmer_id: string
  scheduled_date: string
  notes?: string
}): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create booking')
  }
  return res.json()
}

export async function cancelBooking(id: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/v1/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' })
  })
  if (!res.ok) throw new Error('Failed to cancel booking')
  return res.json()
}

// Analytics API
export async function getAnalytics() {
  const res = await fetch(`${API_URL}/api/v1/analytics`)
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

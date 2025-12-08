'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSocket } from '@/hooks/use-socket'
import { 
  ArrowLeft, 
  Thermometer, 
  Activity, 
  MapPin, 
  Gauge, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Vibrate,
  Cpu
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface HistoryPoint {
  time: string
  temp: number
  speed: number
  vibration: number
}

export default function MachineDetailPage() {
  const params = useParams()
  const machineId = params.id as string
  const { machines, connected } = useSocket()
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [lastTimestamp, setLastTimestamp] = useState<number>(0)
  
  // Find current machine
  const machine = machines.find(m => m.id === machineId)
  
  // Track history for charts - only update when timestamp changes
  useEffect(() => {
    if (machine && machine.timestamp !== lastTimestamp) {
      setLastTimestamp(machine.timestamp)
      
      const vibMagnitude = Math.sqrt(
        Math.pow(machine.vibration?.x || 0, 2) +
        Math.pow(machine.vibration?.y || 0, 2) +
        Math.pow(machine.vibration?.z || 0, 2)
      )
      
      setHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString().slice(0, 5),
          temp: machine.temp,
          speed: machine.speed,
          vibration: vibMagnitude
        }
        const updated = [...prev, newPoint]
        // Keep last 30 data points
        return updated.slice(-30)
      })
    }
  }, [machine?.timestamp, lastTimestamp])

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-500'
      case 'idle': return 'bg-yellow-500'
      case 'off': return 'bg-gray-500'
      case 'overheat': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'active': return 'Active'
      case 'idle': return 'Idle'
      case 'off': return 'Offline'
      case 'overheat': return 'Overheating!'
      default: return 'Unknown'
    }
  }

  if (!machine) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {connected ? `Waiting for machine ${machineId}...` : 'Connecting to server...'}
          </p>
          <Link href="/dashboard/machines" className="mt-4 text-primary hover:underline inline-block">
            ← Back to Machines
          </Link>
        </div>
      </div>
    )
  }

  const vibMagnitude = Math.sqrt(
    Math.pow(machine.vibration?.x || 0, 2) +
    Math.pow(machine.vibration?.y || 0, 2) +
    Math.pow(machine.vibration?.z || 0, 2)
  ).toFixed(4)

  return (
    <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/machines" 
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{machineId}</h1>
                  <span className={`px-3 py-1 rounded-full text-white text-sm ${getStateColor(machine.state)}`}>
                    {getStateLabel(machine.state)}
                  </span>
                </div>
                <p className="text-muted-foreground">Real-time machine telemetry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {connected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Alerts Banner */}
          {machine.alerts && machine.alerts.length > 0 && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Active Alerts</span>
              </div>
              <ul className="mt-2 space-y-1">
                {machine.alerts.map((alert, idx) => (
                  <li key={idx} className="text-red-600 dark:text-red-300 text-sm">
                    • {alert.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <Thermometer className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{machine.temp?.toFixed(1)}°C</p>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Gauge className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{machine.speed?.toFixed(1)} km/h</p>
                  <p className="text-xs text-muted-foreground">Speed</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Vibrate className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{vibMagnitude}</p>
                  <p className="text-xs text-muted-foreground">Vibration</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {machine.gps?.lat?.toFixed(4)}, {machine.gps?.lng?.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">GPS Location</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Temperature Chart */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperature History
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[40, 120]} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="temp" 
                      stroke="#f97316" 
                      fill="#fed7aa" 
                      name="Temperature (°C)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Speed Chart */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Speed History
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 30]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="speed" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="Speed (km/h)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Vibration Details */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Vibrate className="w-4 h-4" />
              Vibration Analysis (3-Axis)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-red-500">
                  {machine.vibration?.x?.toFixed(4) || 0}
                </p>
                <p className="text-sm text-muted-foreground">X-Axis</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-green-500">
                  {machine.vibration?.y?.toFixed(4) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Y-Axis</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-blue-500">
                  {machine.vibration?.z?.toFixed(4) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Z-Axis</p>
              </div>
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="vibration" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false}
                    name="Magnitude"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

      {/* Last Update */}
      <div className="text-center text-sm text-muted-foreground">
        <Clock className="w-4 h-4 inline mr-1" />
        Last update: {new Date(machine.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

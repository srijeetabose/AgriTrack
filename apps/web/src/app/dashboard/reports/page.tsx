'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { 
  fetchCropDashboard, 
  fetchEfficiency,
  type CropDashboardData,
  type EfficiencyMetrics
} from '@/lib/api'
import { 
  FileText, 
  Download,
  Clock,
  Activity,
  Tractor,
  AlertTriangle,
  MapPin,
  Wheat,
  TrendingUp,
  RefreshCcw,
  Calendar,
  BarChart3
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

interface UsageSnapshot {
  timestamp: Date
  activeMachines: number
  idleMachines: number
  alerts: number
  avgTemp: number
  totalSpeed: number
}

export default function LiveReportsPage() {
  const { machines, stats, connected } = useSocket()
  const [cropData, setCropData] = useState<CropDashboardData | null>(null)
  const [efficiency, setEfficiency] = useState<EfficiencyMetrics | null>(null)
  const [usageHistory, setUsageHistory] = useState<UsageSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  // Track usage history - update every 5 seconds max
  useEffect(() => {
    const now = Date.now()
    if (machines.length > 0 && now - lastUpdate > 5000) {
      setLastUpdate(now)
      setUsageHistory(prev => {
        const newSnapshot: UsageSnapshot = {
          timestamp: new Date(),
          activeMachines: stats.activeMachines,
          idleMachines: stats.idleMachines,
          alerts: stats.alertCount,
          avgTemp: stats.avgTemperature,
          totalSpeed: machines.reduce((sum, m) => sum + (m.speed || 0), 0) / machines.length
        }
        const updated = [...prev, newSnapshot]
        return updated.slice(-60) // Keep last 60 snapshots (5 min at 5s intervals)
      })
    }
  }, [machines.length, stats.activeMachines, stats.alertCount, lastUpdate])

  // Load external data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cropRes, effRes] = await Promise.all([
        fetchCropDashboard().catch(() => null),
        fetchEfficiency().catch(() => null)
      ])
      setCropData(cropRes)
      setEfficiency(effRes)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [loadData])

  // Format history for charts
  const chartData = usageHistory.map(s => ({
    time: s.timestamp.toLocaleTimeString().slice(0, 5),
    active: s.activeMachines,
    idle: s.idleMachines,
    alerts: s.alerts,
    temp: s.avgTemp,
    speed: s.totalSpeed
  }))

  // Calculate session stats
  const sessionDuration = usageHistory.length > 0 
    ? Math.floor((Date.now() - usageHistory[0].timestamp.getTime()) / 1000 / 60)
    : 0

  const peakActive = Math.max(...usageHistory.map(s => s.activeMachines), 0)
  const totalAlerts = usageHistory.reduce((sum, s) => sum + s.alerts, 0)
  const avgEfficiency = efficiency?.averageEfficiency || 0

  // Export report as JSON
  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      sessionDuration: `${sessionDuration} minutes`,
      summary: {
        totalMachines: stats.totalMachines,
        peakActiveMachines: peakActive,
        currentActive: stats.activeMachines,
        currentIdle: stats.idleMachines,
        currentOffline: stats.offlineMachines,
        totalAlerts: totalAlerts,
        averageTemperature: stats.avgTemperature,
        fleetEfficiency: avgEfficiency
      },
      cropResidue: cropData?.statistics || null,
      machines: machines.map(m => ({
        id: m.id,
        state: m.state,
        temp: m.temp,
        speed: m.speed,
        location: m.gps,
        alerts: m.alerts
      })),
      history: usageHistory.map(s => ({
        time: s.timestamp.toISOString(),
        active: s.activeMachines,
        idle: s.idleMachines,
        alerts: s.alerts
      }))
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agritrack-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-500" />
                Live Usage Reports
              </h1>
              <p className="text-muted-foreground">
                Real-time fleet monitoring and usage analytics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            connected ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
          }`}>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={connected ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
              {connected ? `Live connection • ${stats.totalMachines} machines streaming` : 'Disconnected from server'}
            </span>
            <span className="ml-auto text-sm opacity-70">
              Session: {sessionDuration} min
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Active Now</span>
              </div>
              <p className="text-3xl font-bold">{stats.activeMachines}</p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Idle</span>
              </div>
              <p className="text-3xl font-bold">{stats.idleMachines}</p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Alerts</span>
              </div>
              <p className="text-3xl font-bold">{stats.alertCount}</p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Peak Active</span>
              </div>
              <p className="text-3xl font-bold">{peakActive}</p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Efficiency</span>
              </div>
              <p className="text-3xl font-bold">{avgEfficiency.toFixed(0)}%</p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Session</span>
              </div>
              <p className="text-3xl font-bold">{sessionDuration}m</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Over Time */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Machine Activity Over Time
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="active" 
                      stackId="1"
                      stroke="#22c55e" 
                      fill="#22c55e" 
                      name="Active"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="idle" 
                      stackId="1"
                      stroke="#eab308" 
                      fill="#eab308" 
                      name="Idle"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alerts Over Time */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alerts Timeline
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="alerts" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                      name="Alerts"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Crop Residue Summary */}
          {cropData && (
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Wheat className="w-4 h-4 text-yellow-600" />
                Crop Residue Management Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{cropData.statistics.total_districts}</p>
                  <p className="text-sm text-muted-foreground">Total Districts</p>
                </div>
                <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{cropData.statistics.urgent_districts}</p>
                  <p className="text-sm text-muted-foreground">Urgent Districts</p>
                </div>
                <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{cropData.statistics.harvest_ready}</p>
                  <p className="text-sm text-muted-foreground">Harvest Ready</p>
                </div>
                <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{cropData.statistics.allocation_rate}</p>
                  <p className="text-sm text-muted-foreground">Allocation Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Live Machine Table */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Tractor className="w-4 h-4" />
              Live Machine Status
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Machine ID</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Temperature</th>
                    <th className="text-left py-2 px-3">Speed</th>
                    <th className="text-left py-2 px-3">Location</th>
                    <th className="text-left py-2 px-3">Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.slice(0, 15).map(m => (
                    <tr key={m.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{m.id}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs text-white ${
                          m.state === 'active' ? 'bg-green-500' :
                          m.state === 'idle' ? 'bg-yellow-500' :
                          m.state === 'overheat' ? 'bg-red-500' : 'bg-gray-500'
                        }`}>
                          {m.state}
                        </span>
                      </td>
                      <td className="py-2 px-3">{m.temp?.toFixed(1)}°C</td>
                      <td className="py-2 px-3">{m.speed?.toFixed(1)} km/h</td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">
                        {m.gps?.lat?.toFixed(3)}, {m.gps?.lng?.toFixed(3)}
                      </td>
                      <td className="py-2 px-3">
                        {m.alerts && m.alerts.length > 0 ? (
                          <span className="text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {m.alerts.length}
                          </span>
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {machines.length > 15 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Showing 15 of {machines.length} machines
                </p>
              )}
            </div>
          </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Report generated at {new Date().toLocaleString()} • AgriTrack v2.1
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { 
  fetchEfficiency, 
  fetchAnomalies, 
  fetchAIStats, 
  trainAIModel,
  type EfficiencyMetrics,
  type AnomaliesResponse,
  type AIStats
} from '@/lib/api'
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Thermometer,
  RefreshCcw,
  Cpu,
  BarChart3,
  Zap
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#6b7280']

export default function AIAnalyticsPage() {
  const { machines, stats, connected } = useSocket()
  const [efficiency, setEfficiency] = useState<EfficiencyMetrics | null>(null)
  const [anomalies, setAnomalies] = useState<AnomaliesResponse | null>(null)
  const [aiStats, setAIStats] = useState<AIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [effData, anomData, statsData] = await Promise.all([
        fetchEfficiency(),
        fetchAnomalies(),
        fetchAIStats()
      ])
      setEfficiency(effData)
      setAnomalies(anomData)
      setAIStats(statsData)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to load AI data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleTrainModel = async () => {
    setTraining(true)
    try {
      const result = await trainAIModel()
      alert(`Model trained successfully with ${result.samples} samples!`)
      await loadData()
    } catch (err) {
      alert('Failed to train model. Need at least 100 data samples.')
    } finally {
      setTraining(false)
    }
  }

  // Prepare chart data
  const statusDistribution = [
    { name: 'Active', value: stats.activeMachines, color: '#22c55e' },
    { name: 'Idle', value: stats.idleMachines, color: '#eab308' },
    { name: 'Alerts', value: stats.alertCount, color: '#ef4444' },
    { name: 'Offline', value: stats.offlineMachines, color: '#6b7280' }
  ]

  const efficiencyData = efficiency?.topPerformers?.slice(0, 10).map(p => ({
    name: p.machine_id.replace('sim_', 'T'),
    efficiency: p.efficiency,
    distance: p.distance_km
  })) || []

  return (
    <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Brain className="w-8 h-8 text-purple-500" />
                AI Analytics
              </h1>
              <p className="text-muted-foreground">
                Machine learning insights and anomaly detection
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
                onClick={handleTrainModel}
                disabled={training || !aiStats || (aiStats.buffer_size < 100)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Cpu className="w-4 h-4" />
                {training ? 'Training...' : 'Train Model'}
              </button>
            </div>
          </div>

          {/* AI Engine Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Cpu className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{aiStats?.buffer_size || 0}</p>
                  <p className="text-xs text-muted-foreground">Data Samples</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{aiStats?.unique_machines || 0}</p>
                  <p className="text-xs text-muted-foreground">Unique Machines</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {aiStats?.model_trained ? '✅' : '❌'}
                  </p>
                  <p className="text-xs text-muted-foreground">Model Trained</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{anomalies?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Anomalies Detected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Efficiency Overview */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Fleet Efficiency
              </h3>
              <div className="text-center py-6">
                <p className="text-6xl font-bold text-green-500">
                  {efficiency?.averageEfficiency?.toFixed(1) || 0}%
                </p>
                <p className="text-muted-foreground mt-2">Average Fleet Efficiency</p>
              </div>
              {efficiency?.message && (
                <p className="text-sm text-muted-foreground text-center">
                  {efficiency.message}
                </p>
              )}
            </div>

            {/* Machine Status Distribution */}
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Status Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          {efficiencyData.length > 0 && (
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Top Performing Machines
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={efficiencyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={60} />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#22c55e" name="Efficiency %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Anomalies List */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Recent Anomalies
            </h3>
            {anomalies?.anomalies && anomalies.anomalies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Machine</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Temperature</th>
                      <th className="text-left py-2 px-3">Vibration</th>
                      <th className="text-left py-2 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.anomalies.slice(0, 10).map((a, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{a.machine_id}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            a.type === 'overheat' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="py-2 px-3">{a.temp?.toFixed(1)}°C</td>
                        <td className="py-2 px-3">{a.vibration?.toFixed(4)}</td>
                        <td className="py-2 px-3 text-muted-foreground text-sm">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No anomalies detected. The AI engine needs sensor data to analyze.
                {aiStats?.buffer_size === 0 && ' Start the simulator to generate data.'}
              </p>
            )}
          </div>

          {/* AI Stats Summary */}
          {aiStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg border p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  Temperature Stats
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min</span>
                    <span>{aiStats.temperature?.min?.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max</span>
                    <span>{aiStats.temperature?.max?.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average</span>
                    <span className="font-semibold">{aiStats.temperature?.avg?.toFixed(1)}°C</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Speed Stats
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min</span>
                    <span>{aiStats.speed?.min?.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max</span>
                    <span>{aiStats.speed?.max?.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average</span>
                    <span className="font-semibold">{aiStats.speed?.avg?.toFixed(1)} km/h</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  Vibration Stats
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min</span>
                    <span>{aiStats.vibration?.min?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max</span>
                    <span>{aiStats.vibration?.max?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average</span>
                    <span className="font-semibold">{aiStats.vibration?.avg?.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Last Refresh */}
      {lastRefresh && (
        <p className="text-center text-sm text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

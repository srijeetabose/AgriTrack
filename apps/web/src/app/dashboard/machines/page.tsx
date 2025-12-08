'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSocket, type MachineData } from '@/hooks/use-socket'
import { 
  Tractor, 
  Thermometer, 
  Activity, 
  Pause, 
  Power, 
  AlertTriangle,
  ChevronRight,
  Search
} from 'lucide-react'

export default function MachinesPage() {
  const { machines, stats, connected } = useSocket()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'off' | 'alerts'>('all')

  const filteredMachines = machines.filter(m => {
    // Search filter
    if (search && !m.id.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    
    // Status filter
    if (filter === 'all') return true
    if (filter === 'active') return m.state === 'active'
    if (filter === 'idle') return m.state === 'idle'
    if (filter === 'off') return m.state === 'off'
    if (filter === 'alerts') return m.alerts && m.alerts.length > 0
    return true
  })

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-500'
      case 'idle': return 'bg-yellow-500'
      case 'off': return 'bg-gray-500'
      case 'overheat': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'active': return <Activity className="w-4 h-4" />
      case 'idle': return <Pause className="w-4 h-4" />
      case 'off': return <Power className="w-4 h-4" />
      default: return <Tractor className="w-4 h-4" />
    }
  }

  return (
    <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Machines</h1>
              <p className="text-muted-foreground">
                {machines.length} machines connected • Click on any machine for detailed stats
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {connected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search machines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'idle', 'off', 'alerts'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'alerts' && stats.alertCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {stats.alertCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Grid */}
          {filteredMachines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search || filter !== 'all' 
                ? 'No machines match your filters' 
                : 'No machines connected yet. Make sure the simulator is running.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMachines.map(machine => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          )}
        </div>
  )
}

function MachineCard({ machine }: { machine: MachineData }) {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-500'
      case 'idle': return 'bg-yellow-500'
      case 'off': return 'bg-gray-500'
      case 'overheat': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const vibMagnitude = Math.sqrt(
    Math.pow(machine.vibration?.x || 0, 2) +
    Math.pow(machine.vibration?.y || 0, 2) +
    Math.pow(machine.vibration?.z || 0, 2)
  ).toFixed(3)

  const hasAlerts = machine.alerts && machine.alerts.length > 0

  return (
    <Link href={`/dashboard/machines/${machine.id}`}>
      <div className={`bg-card rounded-lg border p-4 hover:shadow-lg transition-all cursor-pointer ${
        hasAlerts ? 'border-red-500 ring-1 ring-red-500' : ''
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasAlerts ? 'bg-red-100' : 'bg-muted'}`}>
              <Tractor className={`w-5 h-5 ${hasAlerts ? 'text-red-600' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold">{machine.id}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${getStateColor(machine.state)}`}>
                {machine.state}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        {hasAlerts && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300 text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {machine.alerts[0].message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <span>{machine.temp?.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span>{machine.speed?.toFixed(1)} km/h</span>
          </div>
          <div className="flex items-center gap-2 col-span-2 text-muted-foreground text-xs">
            <span>Vib: {vibMagnitude}</span>
            <span className="mx-1">•</span>
            <span>GPS: {machine.gps?.lat?.toFixed(2)}, {machine.gps?.lng?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

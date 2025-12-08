'use client'

import Link from 'next/link'
import { Tractor, Thermometer, Activity, MapPin, Gauge, ExternalLink } from 'lucide-react'
import type { MachineData } from '@/hooks/use-socket'
import { cn } from '@/lib/utils'

interface MachineListProps {
  machines: MachineData[]
}

export function MachineList({ machines }: MachineListProps) {
  const sortedMachines = [...machines].sort((a, b) => {
    // Prioritize alerts
    const aHasAlert = a.alerts?.length > 0 || a.temp > 90
    const bHasAlert = b.alerts?.length > 0 || b.temp > 90
    if (aHasAlert && !bHasAlert) return -1
    if (!aHasAlert && bHasAlert) return 1
    
    // Then by state
    const stateOrder = { overheat: 0, active: 1, idle: 2, off: 3 }
    return (stateOrder[a.state] || 4) - (stateOrder[b.state] || 4)
  })

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-500'
      case 'idle': return 'bg-yellow-500'
      case 'overheat': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'active': return 'Active'
      case 'idle': return 'Idle'
      case 'overheat': return 'OVERHEAT'
      default: return 'Offline'
    }
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Machine</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Temperature</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Speed</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vibration</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Update</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedMachines.map(machine => {
              const hasAlert = machine.alerts?.length > 0 || machine.temp > 90
              const vibMagnitude = Math.sqrt(
                Math.pow(machine.vibration?.x || 0, 2) +
                Math.pow(machine.vibration?.y || 0, 2) +
                Math.pow(machine.vibration?.z || 0, 2)
              )
              
              return (
                <tr 
                  key={machine.id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    hasAlert && "bg-red-50"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tractor className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{machine.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white",
                      getStateColor(machine.state)
                    )}>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      {getStateLabel(machine.state)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Thermometer className={cn(
                        "w-4 h-4",
                        machine.temp > 90 ? "text-red-500" : 
                        machine.temp > 70 ? "text-orange-500" : 
                        "text-green-500"
                      )} />
                      <span className={machine.temp > 90 ? "text-red-600 font-bold" : ""}>
                        {machine.temp}°C
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span>{machine.speed?.toFixed(1)} km/h</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Activity className={cn(
                        "w-4 h-4",
                        vibMagnitude > 0.5 ? "text-red-500" :
                        vibMagnitude > 0.2 ? "text-orange-500" :
                        "text-green-500"
                      )} />
                      <span>{vibMagnitude.toFixed(3)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {machine.gps?.lat?.toFixed(3)}, {machine.gps?.lng?.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(machine.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link 
                      href={`/dashboard/machines/${machine.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {machines.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Tractor className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No machines connected</p>
          <p className="text-sm">Start the simulator to see data</p>
        </div>
      )}
    </div>
  )
}

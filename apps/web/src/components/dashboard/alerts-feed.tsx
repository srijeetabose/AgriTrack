'use client'

import { AlertTriangle, Thermometer, Activity, MapPin } from 'lucide-react'
import type { MachineData } from '@/hooks/use-socket'
import { cn } from '@/lib/utils'

interface AlertsFeedProps {
  machines: MachineData[]
  fullWidth?: boolean
}

export function AlertsFeed({ machines, fullWidth }: AlertsFeedProps) {
  // Get all alerts from machines
  const alerts = machines
    .filter(m => m.alerts && m.alerts.length > 0)
    .flatMap(m => m.alerts.map(alert => ({
      ...alert,
      machineId: m.id,
      temp: m.temp,
      timestamp: m.timestamp
    })))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)

  // Add overheat machines even if no explicit alert
  const overheatMachines = machines
    .filter(m => m.temp > 90)
    .map(m => ({
      type: 'overheat',
      message: `Temperature critical: ${m.temp}°C`,
      machineId: m.id,
      temp: m.temp,
      timestamp: m.timestamp
    }))

  const allAlerts = [...alerts, ...overheatMachines]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, fullWidth ? 50 : 10)

  const getIcon = (type: string) => {
    switch (type) {
      case 'overheat': return Thermometer
      case 'vibration': return Activity
      case 'geofence': return MapPin
      default: return AlertTriangle
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'overheat': return 'text-red-600 bg-red-100'
      case 'vibration': return 'text-orange-600 bg-orange-100'
      case 'geofence': return 'text-purple-600 bg-purple-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  return (
    <div className={cn(
      "bg-card rounded-lg border",
      fullWidth ? "p-6" : "p-4 h-full"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Live Alerts
        </h3>
        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
          {allAlerts.length} active
        </span>
      </div>

      <div className={cn(
        "space-y-3 overflow-y-auto",
        fullWidth ? "max-h-[600px]" : "max-h-[400px]"
      )}>
        {allAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active alerts</p>
            <p className="text-xs">All machines operating normally</p>
          </div>
        ) : (
          allAlerts.map((alert, idx) => {
            const Icon = getIcon(alert.type)
            const colorClass = getColor(alert.type)
            const [iconColor, bgColor] = colorClass.split(' ')
            
            return (
              <div
                key={`${alert.machineId}-${idx}`}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className={`p-2 rounded-lg ${bgColor}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{alert.machineId}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {alert.type === 'overheat' && (
                  <span className="text-red-600 font-bold text-sm animate-pulse">
                    {alert.temp}°C
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

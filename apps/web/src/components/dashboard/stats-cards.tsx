'use client'

import { Tractor, Activity, Pause, Power, AlertTriangle, Thermometer } from 'lucide-react'
import type { Stats } from '@/hooks/use-socket'

interface StatsCardsProps {
  stats: Stats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Machines',
      value: stats.totalMachines,
      icon: Tractor,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active',
      value: stats.activeMachines,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Idle',
      value: stats.idleMachines,
      icon: Pause,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Offline',
      value: stats.offlineMachines,
      icon: Power,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      title: 'Alerts',
      value: stats.alertCount,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Avg Temp',
      value: `${stats.avgTemperature}°C`,
      icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

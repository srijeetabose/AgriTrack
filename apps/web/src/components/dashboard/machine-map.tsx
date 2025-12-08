'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { MachineData } from '@/hooks/use-socket'

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom icons for different states
const createIcon = (color: string) => new L.DivIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const stateColors: Record<string, string> = {
  active: '#22c55e',
  idle: '#eab308',
  off: '#6b7280',
  overheat: '#ef4444'
}

interface MachineMapProps {
  machines: MachineData[]
}

function MapUpdater({ machines }: { machines: MachineData[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (machines.length > 0 && machines[0]?.gps?.lat) {
      // Center on first machine with valid GPS
      const validMachine = machines.find(m => m.gps?.lat && m.gps?.lng)
      if (validMachine) {
        map.setView([validMachine.gps.lat, validMachine.gps.lng], 8)
      }
    }
  }, [machines.length > 0])

  return null
}

export function MachineMap({ machines }: MachineMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-full bg-muted animate-pulse rounded-lg" />
  }

  // Default center: Punjab/Haryana region
  const defaultCenter: [number, number] = [30.5, 76.0]

  return (
    <MapContainer
      center={defaultCenter}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater machines={machines} />
      
      {machines.map(machine => {
        if (!machine.gps?.lat || !machine.gps?.lng) return null
        
        return (
          <Marker
            key={machine.id}
            position={[machine.gps.lat, machine.gps.lng]}
            icon={createIcon(stateColors[machine.state] || stateColors.off)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg">{machine.id}</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    <span className="text-gray-500">Status:</span>{' '}
                    <span className={`font-medium ${
                      machine.state === 'active' ? 'text-green-600' :
                      machine.state === 'idle' ? 'text-yellow-600' :
                      machine.state === 'overheat' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {machine.state.toUpperCase()}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Temp:</span>{' '}
                    <span className={machine.temp > 90 ? 'text-red-600 font-bold' : ''}>
                      {machine.temp}°C
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">Speed:</span> {machine.speed?.toFixed(1)} km/h
                  </p>
                  <p>
                    <span className="text-gray-500">Location:</span>{' '}
                    {machine.gps.lat.toFixed(4)}, {machine.gps.lng.toFixed(4)}
                  </p>
                  {machine.alerts?.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-600 text-xs">
                      ⚠️ {machine.alerts[0].message}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

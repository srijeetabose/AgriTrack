'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// District center coordinates (approximate for Punjab/Haryana region)
const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  // Punjab Districts
  'Ludhiana': { lat: 30.9010, lng: 75.8573 },
  'Moga': { lat: 30.8162, lng: 75.1741 },
  'Patiala': { lat: 30.3400, lng: 76.3860 },
  'Sangrur': { lat: 30.2329, lng: 75.8407 },
  'Barnala': { lat: 30.3819, lng: 75.5487 },
  'Amritsar': { lat: 31.6340, lng: 74.8723 },
  'Tarn Taran': { lat: 31.4519, lng: 74.9279 },
  'Gurdaspur': { lat: 32.0405, lng: 75.4057 },
  'Jalandhar': { lat: 31.3260, lng: 75.5762 },
  'Kapurthala': { lat: 31.3800, lng: 75.3700 },
  'Bathinda': { lat: 30.2110, lng: 74.9455 },
  'Faridkot': { lat: 30.6742, lng: 74.7565 },
  'Ferozepur': { lat: 30.9246, lng: 74.6139 },
  'Fatehgarh Sahib': { lat: 30.6425, lng: 76.3940 },
  'Mohali': { lat: 30.7046, lng: 76.7179 },
  'Rupnagar': { lat: 31.0441, lng: 76.5258 },
  'Muktsar': { lat: 30.4787, lng: 74.5118 },
  'Fazilka': { lat: 30.4022, lng: 74.0258 },
  'Mansa': { lat: 29.9990, lng: 75.3869 },
  'Pathankot': { lat: 32.2722, lng: 75.6522 },
  'Hoshiarpur': { lat: 31.5321, lng: 75.9115 },
  'Nawanshahr': { lat: 31.1165, lng: 76.1199 },
  
  // Haryana Districts
  'Karnal': { lat: 29.6857, lng: 76.9905 },
  'Kaithal': { lat: 29.8015, lng: 76.3996 },
  'Hisar': { lat: 29.1492, lng: 75.7217 },
  'Fatehabad': { lat: 29.5104, lng: 75.4559 },
  'Sirsa': { lat: 29.5350, lng: 75.0281 },
  'Kurukshetra': { lat: 29.9695, lng: 76.8783 },
  'Ambala': { lat: 30.3782, lng: 76.7767 },
  'Yamunanagar': { lat: 30.1310, lng: 77.2810 },
  'Panipat': { lat: 29.3909, lng: 76.9635 },
  'Sonipat': { lat: 28.9945, lng: 77.0151 },
  'Rohtak': { lat: 28.8955, lng: 76.6066 },
  'Jhajjar': { lat: 28.6065, lng: 76.6566 },
  'Jind': { lat: 29.3184, lng: 76.3149 },
  'Bhiwani': { lat: 28.7930, lng: 76.1319 },
  'Mahendragarh': { lat: 28.0791, lng: 76.1521 },
  'Rewari': { lat: 28.1910, lng: 76.6176 },
  'Palwal': { lat: 28.1493, lng: 77.3317 },
  'Faridabad': { lat: 28.4089, lng: 77.3178 },
  'Gurugram': { lat: 28.4595, lng: 77.0266 },
  'Nuh': { lat: 28.1068, lng: 77.0048 },
}

// Priority colors
const getPriorityColor = (priority: number): string => {
  if (priority >= 8) return '#ef4444' // red
  if (priority >= 6) return '#f97316' // orange
  if (priority >= 4) return '#eab308' // yellow
  return '#22c55e' // green
}

const getPriorityOpacity = (priority: number): number => {
  if (priority >= 8) return 0.5
  if (priority >= 6) return 0.4
  if (priority >= 4) return 0.3
  return 0.25
}

// Custom cluster icon
const createClusterIcon = (color: string, priority: number) => new L.DivIcon({
  className: 'custom-cluster-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">${priority}</div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

export interface ClusterData {
  id: string
  name: string
  region: string
  districts: string[]
  window_start: string
  window_end: string
  avg_ndvi: number
  priority_score: number
  machines_required: number
  machines_allocated: number
  total_acres: number
  farmers_count: number
  status: string
}

interface ClusterMapProps {
  clusters: ClusterData[]
  onClusterClick?: (cluster: ClusterData) => void
}

function MapUpdater({ clusters }: { clusters: ClusterData[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (clusters.length > 0) {
      // Calculate bounds to include all clusters
      const allCoords: [number, number][] = []
      clusters.forEach(cluster => {
        cluster.districts.forEach(district => {
          const coord = districtCoordinates[district]
          if (coord) {
            allCoords.push([coord.lat, coord.lng])
          }
        })
      })
      
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords)
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [clusters, map])

  return null
}

export function ClusterMap({ clusters, onClusterClick }: ClusterMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-full bg-muted animate-pulse rounded-lg" />
  }

  // Default center: Punjab/Haryana region
  const defaultCenter: [number, number] = [30.2, 76.0]

  // Get cluster center based on its districts
  const getClusterCenter = (cluster: ClusterData): { lat: number; lng: number } | null => {
    const coords = cluster.districts
      .map(d => districtCoordinates[d])
      .filter(Boolean)
    
    if (coords.length === 0) return null
    
    const lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length
    const lng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length
    return { lat, lng }
  }

  // Calculate cluster radius based on number of farmers/acres
  const getClusterRadius = (cluster: ClusterData): number => {
    // Base radius 20km, scale based on total acres
    const baseRadius = 20000 // 20km in meters
    const scaleFactor = Math.min(2, cluster.total_acres / 5000)
    return baseRadius * (0.5 + scaleFactor * 0.5)
  }

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
      <MapUpdater clusters={clusters} />
      
      {/* Render circles for each cluster */}
      {clusters.map(cluster => {
        const center = getClusterCenter(cluster)
        if (!center) return null
        
        const color = getPriorityColor(cluster.priority_score)
        const radius = getClusterRadius(cluster)
        
        return (
          <Circle
            key={`circle-${cluster.id}`}
            center={[center.lat, center.lng]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: getPriorityOpacity(cluster.priority_score),
              weight: 2,
            }}
            eventHandlers={{
              click: () => onClusterClick?.(cluster)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold text-base">{cluster.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{cluster.region}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className="font-medium" style={{ color }}>{cluster.priority_score}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Farmers:</span>
                    <span className="font-medium">{cluster.farmers_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Acres:</span>
                    <span className="font-medium">{cluster.total_acres?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Machines:</span>
                    <span className={`font-medium ${cluster.machines_allocated < cluster.machines_required ? 'text-red-600' : 'text-green-600'}`}>
                      {cluster.machines_allocated}/{cluster.machines_required}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NDVI:</span>
                    <span className="font-medium">{cluster.avg_ndvi?.toFixed(3)}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                  <p>Window: {new Date(cluster.window_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(cluster.window_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {cluster.districts.slice(0, 3).map((d, i) => (
                    <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d}</span>
                  ))}
                  {cluster.districts.length > 3 && (
                    <span className="text-xs text-gray-400">+{cluster.districts.length - 3} more</span>
                  )}
                </div>
              </div>
            </Popup>
          </Circle>
        )
      })}
      
      {/* Render markers at cluster centers */}
      {clusters.map(cluster => {
        const center = getClusterCenter(cluster)
        if (!center) return null
        
        const color = getPriorityColor(cluster.priority_score)
        
        return (
          <Marker
            key={`marker-${cluster.id}`}
            position={[center.lat, center.lng]}
            icon={createClusterIcon(color, cluster.priority_score)}
            eventHandlers={{
              click: () => onClusterClick?.(cluster)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold text-base">{cluster.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{cluster.region}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className="font-medium" style={{ color }}>{cluster.priority_score}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Farmers:</span>
                    <span className="font-medium">{cluster.farmers_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Acres:</span>
                    <span className="font-medium">{cluster.total_acres?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Machines:</span>
                    <span className={`font-medium ${cluster.machines_allocated < cluster.machines_required ? 'text-red-600' : 'text-green-600'}`}>
                      {cluster.machines_allocated}/{cluster.machines_required}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NDVI:</span>
                    <span className="font-medium">{cluster.avg_ndvi?.toFixed(3)}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                  <p>Window: {new Date(cluster.window_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(cluster.window_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

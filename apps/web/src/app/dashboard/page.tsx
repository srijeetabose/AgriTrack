'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { AlertsFeed } from '@/components/dashboard/alerts-feed'
import { MachineList } from '@/components/dashboard/machine-list'
import { SchedulingSummary } from '@/components/dashboard/scheduling-summary'
import { useSocket } from '@/hooks/use-socket'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  fetchEfficiency, 
  fetchCropDashboard,
  type EfficiencyMetrics,
  type CropDashboardData 
} from '@/lib/api'
import { 
  Brain, 
  Wheat, 
  FileText, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CalendarClock
} from 'lucide-react'

// Dynamic import for Leaflet (no SSR)
const MachineMap = dynamic(
  () => import('@/components/dashboard/machine-map').then(mod => mod.MachineMap),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
)

export default function DashboardPage() {
  const { machines, stats, connected } = useSocket()
  const [efficiency, setEfficiency] = useState<EfficiencyMetrics | null>(null)
  const [cropData, setCropData] = useState<CropDashboardData | null>(null)

  useEffect(() => {
    // Load AI and Crop data
    fetchEfficiency().then(setEfficiency).catch(() => {})
    fetchCropDashboard().then(setCropData).catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-emerald-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground">Real-time CRM machinery monitoring</p>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/analytics">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <Brain className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">AI Analytics</h3>
                    <p className="text-sm opacity-80">
                      {efficiency?.averageEfficiency?.toFixed(0) || 0}% fleet efficiency
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            <Link href="/crop-residue">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <Wheat className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Crop Residue</h3>
                    <p className="text-sm opacity-80">
                      {cropData?.statistics?.urgent_districts || 0} urgent districts
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            <Link href="/dashboard/reports">
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-4 text-white hover:shadow-lg hover:shadow-sky-500/25 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <FileText className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Live Reports</h3>
                    <p className="text-sm opacity-80">
                      {machines.length} machines tracked
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            <Link href="/dashboard/scheduling">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 text-white hover:shadow-lg hover:shadow-teal-500/25 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <CalendarClock className="w-8 h-8 mb-2" />
                    <h3 className="font-semibold">Harvest Scheduler</h3>
                    <p className="text-sm opacity-80">
                      Dynamic scheduling
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="map" className="space-y-4">
            <TabsList>
              <TabsTrigger value="map">Live Map</TabsTrigger>
              <TabsTrigger value="list">Machine List</TabsTrigger>
              <TabsTrigger value="alerts">Alerts ({stats.alertCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-card rounded-lg border p-4">
                    <h3 className="font-semibold mb-4">Live Machine Locations</h3>
                    <div className="h-[500px] rounded-lg overflow-hidden">
                      <MachineMap machines={machines} />
                    </div>
                  </div>
                </div>
                <div>
                  <AlertsFeed machines={machines} />
                </div>
                <div>
                  <SchedulingSummary />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list">
              <MachineList machines={machines} />
            </TabsContent>

            <TabsContent value="alerts">
              <AlertsFeed machines={machines} fullWidth />
            </TabsContent>
          </Tabs>
        </div>
  )
}

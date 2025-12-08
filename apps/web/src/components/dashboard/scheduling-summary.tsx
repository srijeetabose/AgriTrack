'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  Tractor, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Leaf,
  Clock
} from 'lucide-react'

interface SchedulingSummaryData {
  total_farmers: number
  total_clusters: number
  total_acres: number
  total_machines_allocated: number
  total_machines_required: number
  machine_deficit: number
  allocation_rate: number
  avg_farmers_per_cluster: number
  date_range: {
    start: string
    end: string
  }
  priority_distribution: {
    high: number
    medium: number
    low: number
  }
  season: string
}

interface ClusterPreview {
  id: string
  name: string
  region: string
  window_start: string
  window_end: string
  priority_score: number
  farmers_count: number
  machines_allocated: number
  machines_required: number
  status: string
}

interface Props {
  className?: string
}

const CROP_RESIDUE_URL = process.env.NEXT_PUBLIC_CROP_RESIDUE_URL || 'http://localhost:8001'

export function SchedulingSummary({ className = '' }: Props) {
  const [summary, setSummary] = useState<SchedulingSummaryData | null>(null)
  const [clusters, setClusters] = useState<ClusterPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/dashboard`)
        if (!response.ok) throw new Error('Failed to fetch scheduling data')
        const data = await response.json()
        setSummary(data.summary)
        setClusters(data.clusters?.slice(0, 3) || [])
      } catch (err) {
        console.error('Error fetching scheduling summary:', err)
        setError('Unable to load scheduling data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'bg-red-500'
    if (priority >= 6) return 'bg-orange-500'
    if (priority >= 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className={`bg-card rounded-lg border p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className={`bg-card rounded-lg border p-4 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="w-5 h-5" />
          <span>Unable to load scheduling data</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Harvest Scheduling</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {summary.season}
          </span>
        </div>
        <Link 
          href="/dashboard/scheduling"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Farmers</span>
          </div>
          <p className="text-xl font-bold">{summary.total_farmers.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Clusters</span>
          </div>
          <p className="text-xl font-bold">{summary.total_clusters}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Allocation</span>
          </div>
          <p className="text-xl font-bold text-green-600">{summary.allocation_rate}%</p>
        </div>
      </div>

      {/* Machine Status */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Tractor className="w-4 h-4" />
            Machine Allocation
          </span>
          <span className="text-sm font-medium">
            {summary.total_machines_allocated} / {summary.total_machines_required}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div 
            className={`h-2.5 rounded-full ${summary.machine_deficit > 0 ? 'bg-orange-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, summary.allocation_rate)}%` }}
          ></div>
        </div>
        {summary.machine_deficit > 0 && (
          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {summary.machine_deficit} machines short
          </p>
        )}
      </div>

      {/* Priority Distribution */}
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground mb-2">Priority Distribution</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">High: {summary.priority_distribution.high}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm">Med: {summary.priority_distribution.medium}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Low: {summary.priority_distribution.low}</span>
          </div>
        </div>
      </div>

      {/* Top Clusters Preview */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">Active Clusters</p>
        <div className="space-y-2">
          {clusters.map((cluster) => (
            <div 
              key={cluster.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getPriorityColor(cluster.priority_score)}`}>
                {cluster.priority_score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cluster.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(cluster.window_start)} - {formatDate(cluster.window_end)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{cluster.farmers_count}</p>
                <p className="text-xs text-muted-foreground">farmers</p>
              </div>
            </div>
          ))}
        </div>
        
        {clusters.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Leaf className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No active clusters
          </div>
        )}
      </div>
    </div>
  )
}

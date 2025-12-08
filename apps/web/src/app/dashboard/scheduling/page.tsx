'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Calendar, 
  CalendarDays,
  Users, 
  Tractor, 
  AlertTriangle, 
  TrendingUp,
  Send,
  RefreshCw,
  Download,
  ChevronRight,
  Clock,
  Leaf,
  MessageSquare,
  BarChart3,
  MapPin
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchedulingCalendar } from '@/components/scheduling/SchedulingCalendar';

// Dynamic import for Leaflet-based ClusterMap (no SSR)
const ClusterMap = dynamic(
  () => import('@/components/dashboard/cluster-map').then(mod => mod.ClusterMap),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

// Types for scheduling data
interface Cluster {
  id: string;
  name: string;
  region: string;
  districts: string[];
  window_start: string;
  window_end: string;
  avg_ndvi: number;
  priority_score: number;
  machines_required: number;
  machines_allocated: number;
  total_acres: number;
  farmers_count: number;
  status: string;
}

interface SchedulingSummary {
  total_farmers: number;
  total_clusters: number;
  total_acres: number;
  total_machines_allocated: number;
  total_machines_required: number;
  machine_deficit: number;
  allocation_rate: number;
  avg_farmers_per_cluster: number;
  date_range: {
    start: string;
    end: string;
  };
  priority_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  farmer_priority_distribution: {
    normal: number;
    priority: number;
    premium: number;
  };
  season: string;
}

interface GanttItem {
  id: string;
  name: string;
  region: string;
  start: string;
  end: string;
  startDate: string;
  endDate: string;
  districts: string[];
  machines_allocated: number;
  machines_required: number;
  machine_coverage: number;
  farmers_count: number;
  total_acres: number;
  avg_ndvi: number;
  priority: number;
  status: string;
  color: string;
  season: string;
}

interface SchedulingDashboardData {
  metadata: {
    generated_at: string;
    region: string;
    season: string;
  };
  summary: SchedulingSummary;
  clusters: Cluster[];
  gantt_data: GanttItem[];
  heatmap_data: Record<string, Record<string, {
    total_machines: number;
    available: number;
    booked: number;
    capacity_acres: number;
    demand_acres: number;
    demand_percentage: number;
  }>>;
}

interface SMSPreview {
  farmer_id: string;
  phone: string;
  message_type: string;
  message_content: string;
  language: string;
  priority: string;
  char_count: number;
  sms_segments: number;
}

const CROP_RESIDUE_URL = process.env.NEXT_PUBLIC_CROP_RESIDUE_URL || 'http://localhost:8001';

export default function SchedulingPage() {
  const [dashboardData, setDashboardData] = useState<SchedulingDashboardData | null>(null);
  const [smsPreview, setSmsPreview] = useState<SMSPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [smsLoading, setSmsLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch scheduling dashboard data
  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch scheduling data');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching scheduling dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch SMS preview
  const fetchSMSPreview = async (messageType: string = 'schedule_assigned') => {
    try {
      setSmsLoading(true);
      const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/sms/preview?message_type=${messageType}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch SMS preview');
      const data = await response.json();
      setSmsPreview(data.preview || []);
    } catch (error) {
      console.error('Error fetching SMS preview:', error);
    } finally {
      setSmsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchSMSPreview();
  }, []);

  // Get priority color
  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'bg-red-500';
    if (priority >= 6) return 'bg-orange-500';
    if (priority >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || styles.pending;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading scheduling data...</p>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary;
  const clusters = dashboardData?.clusters || [];
  const ganttData = dashboardData?.gantt_data || [];

  return (
    <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Calendar className="w-8 h-8 text-primary" />
                Scheduling Command Center
              </h1>
              <p className="text-muted-foreground">
                Dynamic Harvest Scheduler • {summary?.season || 'Kharif 2025'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchDashboard()}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Total Farmers</span>
              </div>
              <p className="text-2xl font-bold">{summary?.total_farmers?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Clusters</span>
              </div>
              <p className="text-2xl font-bold">{summary?.total_clusters || 0}</p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Total Acres</span>
              </div>
              <p className="text-2xl font-bold">{summary?.total_acres?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Tractor className="w-4 h-4" />
                <span className="text-xs">Machines Allocated</span>
              </div>
              <p className="text-2xl font-bold">
                {summary?.total_machines_allocated || 0}
                <span className="text-sm text-muted-foreground">/{summary?.total_machines_required || 0}</span>
              </p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Allocation Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{summary?.allocation_rate || 0}%</p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Machine Deficit</span>
              </div>
              <p className={`text-2xl font-bold ${(summary?.machine_deficit || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary?.machine_deficit || 0}
              </p>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Cluster Priority Distribution
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">High: {summary?.priority_distribution?.high || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm">Medium: {summary?.priority_distribution?.medium || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Low: {summary?.priority_distribution?.low || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Farmer Priority Levels
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm">Normal: {summary?.farmer_priority_distribution?.normal || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Priority: {summary?.farmer_priority_distribution?.priority || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm">Premium: {summary?.farmer_priority_distribution?.premium || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="calendar">
                <CalendarDays className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="map">
                <MapPin className="w-4 h-4 mr-2" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="gantt">
                <Calendar className="w-4 h-4 mr-2" />
                Gantt View
              </TabsTrigger>
              <TabsTrigger value="clusters">
                <BarChart3 className="w-4 h-4 mr-2" />
                Clusters
              </TabsTrigger>
              <TabsTrigger value="sms">
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS Advisory
              </TabsTrigger>
            </TabsList>

            {/* Calendar View */}
            <TabsContent value="calendar" className="mt-4">
              <SchedulingCalendar 
                events={ganttData.map(item => ({
                  id: item.id,
                  name: item.name,
                  start: item.start || item.startDate,
                  end: item.end || item.endDate,
                  farmers_count: item.farmers_count,
                  machines_allocated: item.machines_allocated,
                  machines_required: item.machines_required,
                  status: item.status,
                  color: item.color,
                  region: item.region,
                  total_acres: item.total_acres,
                  priority_score: item.priority,
                  avg_ndvi: item.avg_ndvi
                }))}
                summary={summary}
                heatmapData={dashboardData?.heatmap_data}
                onEventClick={(event) => {
                  const cluster = clusters.find(c => c.id === event.id);
                  if (cluster) setSelectedCluster(cluster);
                }}
              />
            </TabsContent>

            {/* Map View */}
            <TabsContent value="map" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Cluster Map - {summary?.season || 'Kharif 2025'}
                      </h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          Priority 8-10
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          Priority 6-7
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          Priority 4-5
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          Priority 1-3
                        </span>
                      </div>
                    </div>
                    <div className="h-[500px] rounded-lg overflow-hidden">
                      <ClusterMap 
                        clusters={clusters}
                        onClusterClick={(cluster) => setSelectedCluster(cluster)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Cluster List Sidebar */}
                <div className="space-y-4">
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Clusters Overview</h3>
                    <div className="space-y-2 max-h-[460px] overflow-auto">
                      {clusters.map((cluster) => (
                        <div 
                          key={cluster.id}
                          className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedCluster(cluster)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getPriorityColor(cluster.priority_score)}`}>
                              {cluster.priority_score}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cluster.name}</p>
                              <p className="text-xs text-muted-foreground">{cluster.region}</p>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Farmers:</span>
                              <span className="ml-1 font-medium">{cluster.farmers_count}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Acres:</span>
                              <span className="ml-1 font-medium">{cluster.total_acres?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Machines:</span>
                              <span className={`ml-1 font-medium ${cluster.machines_allocated < cluster.machines_required ? 'text-red-600' : 'text-green-600'}`}>
                                {cluster.machines_allocated}/{cluster.machines_required}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(cluster.window_start)} - {formatDate(cluster.window_end)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Gantt Chart View */}
            <TabsContent value="gantt" className="mt-4">
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Harvest Timeline (Gantt Chart)</h3>
                <div className="space-y-2">
                  {/* Timeline header */}
                  <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                    <div className="w-48 font-medium">Cluster</div>
                    <div className="flex-1 flex justify-between">
                      {summary?.date_range?.start && (
                        <>
                          <span>{formatDate(summary.date_range.start)}</span>
                          <span>{formatDate(summary.date_range.end || '')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Gantt bars */}
                  {ganttData.map((item) => {
                    // Calculate bar position (simplified - would need proper date math)
                    const startDate = new Date(item.start);
                    const endDate = new Date(item.end);
                    const rangeStart = summary?.date_range?.start ? new Date(summary.date_range.start) : startDate;
                    const rangeEnd = summary?.date_range?.end ? new Date(summary.date_range.end) : endDate;
                    const totalDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                    const startOffset = Math.max(0, (startDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                    const duration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    const leftPercent = (startOffset / totalDays) * 100;
                    const widthPercent = (duration / totalDays) * 100;

                    return (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <div className="w-48 text-sm truncate font-medium">{item.name}</div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded h-8 relative">
                          <div
                            className={`absolute h-full rounded flex items-center justify-center text-xs text-white font-medium cursor-pointer hover:opacity-90 transition-opacity`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: item.color,
                              minWidth: '60px'
                            }}
                            onClick={() => setSelectedCluster(clusters.find(c => c.id === item.id) || null)}
                          >
                            {item.farmers_count} farmers
                          </div>
                        </div>
                        <div className="w-24 text-xs text-right">
                          <span className={getStatusBadge(item.status) + ' px-2 py-0.5 rounded-full'}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-4 pt-4 border-t flex gap-6 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span>Priority 8-10 (Urgent)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span>Priority 6-7 (High)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                    <span>Priority 4-5 (Medium)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span>Priority 1-3 (Low)</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Clusters Table View */}
            <TabsContent value="clusters" className="mt-4">
              <div className="bg-card border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cluster</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Window</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Districts</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Farmers</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Acres</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Machines</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Priority</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clusters.map((cluster) => (
                      <tr 
                        key={cluster.id} 
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedCluster(cluster)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{cluster.name}</div>
                          <div className="text-xs text-muted-foreground">{cluster.region}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {formatDate(cluster.window_start)} - {formatDate(cluster.window_end)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cluster.districts.slice(0, 2).map((d, i) => (
                              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{d}</span>
                            ))}
                            {cluster.districts.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{cluster.districts.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">{cluster.farmers_count}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm">{cluster.total_acres?.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${cluster.machines_allocated < cluster.machines_required ? 'text-red-600' : 'text-green-600'}`}>
                            {cluster.machines_allocated}/{cluster.machines_required}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${getPriorityColor(cluster.priority_score)}`}>
                            {cluster.priority_score}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(cluster.status)}`}>
                            {cluster.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* SMS Advisory Tab */}
            <TabsContent value="sms" className="mt-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    SMS Advisory Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <select 
                      className="border rounded px-3 py-1.5 text-sm bg-background"
                      onChange={(e) => fetchSMSPreview(e.target.value)}
                    >
                      <option value="schedule_assigned">Schedule Assigned</option>
                      <option value="reminder_3day">3-Day Reminder</option>
                      <option value="booking_open">Booking Open</option>
                      <option value="incentive_earned">Incentive Earned</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                      <Send className="w-4 h-4" />
                      Send All
                    </button>
                  </div>
                </div>

                {smsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smsPreview.map((sms, index) => (
                      <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{sms.farmer_id}</span>
                            <span className="text-muted-foreground text-sm">{sms.phone}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              sms.priority === 'premium' ? 'bg-purple-100 text-purple-800' :
                              sms.priority === 'priority' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sms.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{sms.language.toUpperCase()}</span>
                            <span>•</span>
                            <span>{sms.char_count} chars</span>
                            <span>•</span>
                            <span>{sms.sms_segments} segment{sms.sms_segments > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <p className="text-sm bg-muted/50 p-2 rounded">{sms.message_content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* SMS Stats */}
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{summary?.total_farmers || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Recipients</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{((summary?.total_farmers || 0) * 0.25).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">~2 min</p>
                    <p className="text-xs text-muted-foreground">Delivery Time</p>
                  </div>
                </div>

                {/* Test SMS Section */}
                <div className="mt-6 pt-4 border-t">
                  <TestSMSSection />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Cluster Detail Modal */}
          {selectedCluster && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedCluster(null)}>
              <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{selectedCluster.name}</h2>
                  <button onClick={() => setSelectedCluster(null)} className="text-muted-foreground hover:text-foreground">
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded p-3">
                      <p className="text-xs text-muted-foreground">Harvest Window</p>
                      <p className="font-medium">
                        {formatDate(selectedCluster.window_start)} - {formatDate(selectedCluster.window_end)}
                      </p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-xs text-muted-foreground">Region</p>
                      <p className="font-medium">{selectedCluster.region}</p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-xs text-muted-foreground">Farmers</p>
                      <p className="font-medium">{selectedCluster.farmers_count}</p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-xs text-muted-foreground">Total Acres</p>
                      <p className="font-medium">{selectedCluster.total_acres?.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-xs text-muted-foreground">Machines</p>
                      <p className="font-medium">{selectedCluster.machines_allocated}/{selectedCluster.machines_required}</p>
                    </div>
                    <div className="bg-muted rounded p-3">
                      <p className="text-xs text-muted-foreground">Avg NDVI</p>
                      <p className="font-medium">{selectedCluster.avg_ndvi?.toFixed(4)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Districts</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCluster.districts.map((d, i) => (
                        <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">{d}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                      <Send className="w-4 h-4" />
                      Send SMS to Farmers
                    </button>
                    <button className="px-4 py-2 border rounded hover:bg-muted transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
  );
}

// Test SMS Section Component
function TestSMSSection() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [messageType, setMessageType] = useState('schedule_assigned');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleSendTestSMS = async () => {
    if (!phone) {
      setResult({ success: false, message: 'Please enter a phone number' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/scheduling/sms/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          farmer_name: name || 'Test Farmer',
          message_type: messageType
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ 
          success: true, 
          message: `SMS sent successfully to ${data.phone}! SID: ${data.sid?.substring(0, 20)}...` 
        });
      } else {
        setResult({ 
          success: false, 
          message: data.reason === 'sms_disabled' 
            ? 'SMS is disabled in development mode. Set SMS_ENABLED=true to enable.'
            : data.reason === 'twilio_not_configured'
            ? 'Twilio not configured. Please set TWILIO credentials.'
            : `Failed: ${data.error || data.reason || 'Unknown error'}`
        });
      }
    } catch (err: any) {
      setResult({ success: false, message: `Error: ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
      <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 mb-3">
        <Send className="w-4 h-4" />
        Test SMS (Demo)
      </h4>
      <p className="text-sm text-muted-foreground mb-4">
        Send a test scheduling SMS to verify the notification system is working.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Phone Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Farmer Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test Farmer"
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Message Type</label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
          >
            <option value="schedule_assigned">Schedule Assigned</option>
            <option value="reminder">Reminder</option>
            <option value="booking_confirmed">Booking Confirmed</option>
            <option value="booking_open">Booking Open</option>
            <option value="test">General Test</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSendTestSMS}
            disabled={sending || !phone}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test SMS
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          result.success 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }`}>
          {result.success ? '✅' : '❌'} {result.message}
        </div>
      )}
    </div>
  );
}

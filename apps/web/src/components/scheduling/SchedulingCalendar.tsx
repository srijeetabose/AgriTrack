"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Users, 
  Tractor, 
  MapPin,
  Clock,
  Wheat,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Leaf
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, addMonths, subMonths } from "date-fns"

interface ScheduleEvent {
  id: string
  name: string
  start: string
  end: string
  farmers_count: number
  machines_allocated?: number
  machines_required?: number
  status: string
  color: string
  region?: string
  total_acres?: number
  priority_score?: number
  avg_ndvi?: number
}

interface HeatmapEntry {
  total_machines: number
  available: number
  booked: number
  capacity_acres: number
  demand_acres: number
  demand_percentage: number
}

interface SchedulingSummary {
  total_farmers: number
  total_clusters: number
  total_acres: number
  total_machines_allocated: number
  total_machines_required: number
  machine_deficit: number
  allocation_rate: number
}

interface SchedulingCalendarProps {
  events: ScheduleEvent[]
  summary?: SchedulingSummary | null
  heatmapData?: Record<string, Record<string, HeatmapEntry>>
  onEventClick?: (event: ScheduleEvent) => void
}

export function SchedulingCalendar({ events, summary, heatmapData, onEventClick }: SchedulingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')
  const [showDistribution, setShowDistribution] = useState(true)

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Get events for a specific day
  const getEventsForDay = (day: Date): ScheduleEvent[] => {
    return events.filter(event => {
      try {
        const eventStart = parseISO(event.start)
        const eventEnd = parseISO(event.end)
        return isWithinInterval(day, { start: eventStart, end: eventEnd })
      } catch {
        return false
      }
    })
  }

  // Get days that have events
  const eventDays = useMemo(() => {
    const days: Date[] = []
    events.forEach(event => {
      try {
        const start = parseISO(event.start)
        const end = parseISO(event.end)
        const interval = eachDayOfInterval({ start, end })
        interval.forEach(day => {
          if (!days.some(d => isSameDay(d, day))) {
            days.push(day)
          }
        })
      } catch {
        // Skip invalid dates
      }
    })
    return days
  }, [events])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-emerald-500'
      case 'pending':
      case 'scheduled':
        return 'bg-amber-500'
      case 'completed':
        return 'bg-blue-500'
      case 'delayed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : []

  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  // Days of week header
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get the starting day offset for the month
  const startOffset = startOfMonth(currentMonth).getDay()

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-1" />
            ))}

            {/* Day cells */}
            {daysInMonth.map(day => {
              const dayEvents = getEventsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square p-1 rounded-lg border transition-all relative
                    ${isToday ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent hover:border-muted-foreground/30'}
                    ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                    ${dayEvents.length > 0 ? 'hover:bg-muted' : 'hover:bg-muted/50'}
                  `}
                >
                  <span className={`
                    text-sm font-medium
                    ${isToday ? 'text-emerald-600 font-bold' : 'text-foreground'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Event indicators */}
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(event.status)}`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Delayed</span>
            </div>
          </div>
        </div>

        {/* Event Details Sidebar */}
        <div className="w-80 border-l bg-muted/30 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : 'Select a date'}
          </h3>

          {selectedDate ? (
            selectedDateEvents.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event)
                      onEventClick?.(event)
                    }}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      hover:shadow-md hover:border-emerald-500/50
                      ${selectedEvent?.id === event.id ? 'border-emerald-500 bg-emerald-500/5' : 'bg-background'}
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-1">{event.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3" />
                        <span>{format(parseISO(event.start), 'MMM d')} - {format(parseISO(event.end), 'MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        <span>{event.farmers_count} farmers</span>
                      </div>
                      {event.machines_allocated !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <Tractor className="w-3 h-3" />
                          <span>{event.machines_allocated}/{event.machines_required || '?'} machines</span>
                        </div>
                      )}
                      {event.region && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span>{event.region}</span>
                        </div>
                      )}
                      {event.total_acres && (
                        <div className="flex items-center gap-1.5">
                          <Wheat className="w-3 h-3" />
                          <span>{event.total_acres.toLocaleString()} acres</span>
                        </div>
                      )}
                    </div>

                    {event.priority_score !== undefined && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Priority Score</span>
                          <span className={`
                            text-xs font-bold px-2 py-0.5 rounded-full
                            ${event.priority_score >= 80 ? 'bg-red-100 text-red-700' : 
                              event.priority_score >= 60 ? 'bg-orange-100 text-orange-700' : 
                              event.priority_score >= 40 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-green-100 text-green-700'}
                          `}>
                            {event.priority_score}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No schedules for this date</p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click on a date to view schedules</p>
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">This Month Summary</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-emerald-600">{events.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Schedules</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {events.reduce((sum, e) => sum + e.farmers_count, 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">Farmers Covered</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-600">
                  {events.filter(e => e.status.toLowerCase() === 'pending' || e.status.toLowerCase() === 'scheduled').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-600">
                  {events.filter(e => e.status.toLowerCase() === 'completed').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Distribution Panel */}
      <div className="border-t">
        <button
          onClick={() => setShowDistribution(!showDistribution)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">Machine Distribution & Harvest Readiness</span>
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${showDistribution ? 'rotate-90' : ''}`} />
        </button>

        {showDistribution && (
          <div className="p-4 pt-0 space-y-4">
            {/* Machine Allocation Overview */}
            {summary && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-emerald-600" />
                  Machine Allocation Overview
                </h5>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{summary.total_machines_allocated}</p>
                    <p className="text-xs text-muted-foreground">Allocated</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{summary.total_machines_required}</p>
                    <p className="text-xs text-muted-foreground">Required</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className={`text-2xl font-bold ${summary.machine_deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {summary.machine_deficit > 0 ? `-${summary.machine_deficit}` : '✓'}
                    </p>
                    <p className="text-xs text-muted-foreground">Deficit</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.allocation_rate}%</p>
                    <p className="text-xs text-muted-foreground">Coverage</p>
                  </div>
                </div>
                
                {/* Allocation Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Allocation Progress</span>
                    <span className="font-medium">{summary.allocation_rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        summary.allocation_rate >= 90 ? 'bg-emerald-500' :
                        summary.allocation_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(summary.allocation_rate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Farmer Distribution by Harvest Readiness */}
            <div className="bg-background border rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Farmer Distribution by Harvest Readiness
              </h5>
              
              <div className="space-y-3">
                {/* Sort events by priority score (harvest readiness) */}
                {events
                  .filter(e => e.priority_score !== undefined)
                  .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
                  .slice(0, 6)
                  .map((event, idx) => {
                    const readiness = event.priority_score || 0
                    const machineRatio = event.machines_allocated && event.machines_required 
                      ? (event.machines_allocated / event.machines_required) * 100 
                      : 0
                    const farmersPerMachine = event.machines_allocated 
                      ? Math.round(event.farmers_count / event.machines_allocated)
                      : event.farmers_count
                    
                    return (
                      <div 
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                              ${readiness >= 8 ? 'bg-red-500' : 
                                readiness >= 6 ? 'bg-orange-500' : 
                                readiness >= 4 ? 'bg-yellow-500' : 'bg-green-500'}
                            `}>
                              {readiness}
                            </span>
                            <span className="font-medium text-sm truncate max-w-[150px]">{event.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            readiness >= 8 ? 'bg-red-100 text-red-700' : 
                            readiness >= 6 ? 'bg-orange-100 text-orange-700' : 
                            readiness >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {readiness >= 8 ? 'Urgent' : readiness >= 6 ? 'High' : readiness >= 4 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{event.farmers_count} farmers</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Tractor className="w-3 h-3" />
                            <span>{event.machines_allocated || 0}/{event.machines_required || '?'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Wheat className="w-3 h-3" />
                            <span>{event.total_acres?.toLocaleString() || 0} ac</span>
                          </div>
                        </div>
                        
                        {/* Machine per farmer indicator */}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            ~{farmersPerMachine} farmers per machine
                          </span>
                          <div className="flex items-center gap-1">
                            {machineRatio >= 100 ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : machineRatio >= 70 ? (
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${
                              machineRatio >= 100 ? 'text-green-600' : 
                              machineRatio >= 70 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {Math.round(machineRatio)}% covered
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
              
              {events.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Tractor className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No scheduling data available</p>
                </div>
              )}
            </div>

            {/* Regional Machine Heatmap */}
            {heatmapData && Object.keys(heatmapData).length > 0 && (
              <div className="bg-background border rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Regional Machine Availability
                </h5>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {Object.entries(heatmapData).map(([region, dates]) => {
                    // Get the first date's data as summary
                    const firstDate = Object.keys(dates)[0]
                    const data = dates[firstDate]
                    if (!data) return null
                    
                    const utilizationRate = data.total_machines > 0 
                      ? Math.round((data.booked / data.total_machines) * 100)
                      : 0
                    
                    return (
                      <div key={region} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{region}</span>
                            <span className="text-xs text-muted-foreground">
                              {data.available} available / {data.total_machines} total
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                utilizationRate >= 90 ? 'bg-red-500' :
                                utilizationRate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${utilizationRate}%` }}
                            />
                          </div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${
                          utilizationRate >= 90 ? 'bg-red-100 text-red-700' :
                          utilizationRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {utilizationRate}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

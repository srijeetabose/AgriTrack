import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Leaf, ChevronRight, Sparkles, Check } from 'lucide-react'
import './MyHarvestSlot.css'

interface HarvestSchedule {
  schedule_id: string
  cluster_name: string
  window_start: string
  window_end: string
  optimal_date: string
  status: string
  priority_level: string
  green_credits: number
  booking_enabled: boolean
}

interface Props {
  farmerId?: string
}

const CROP_RESIDUE_URL = import.meta.env.VITE_CROP_RESIDUE_URL || 'http://localhost:8001'

export default function MyHarvestSlot({ farmerId }: Props) {
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState<HarvestSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    fetchSchedule()
  }, [farmerId])

  const fetchSchedule = async () => {
    try {
      // For demo, fetch from scheduling API
      const response = await fetch(`${CROP_RESIDUE_URL}/api/scheduling/schedules?limit=1`)
      if (!response.ok) throw new Error('Failed to fetch schedule')
      const data = await response.json()
      
      if (data.schedules && data.schedules.length > 0) {
        const s = data.schedules[0]
        setSchedule({
          schedule_id: s.cluster_id,
          cluster_name: s.cluster_name,
          window_start: s.assigned_window_start,
          window_end: s.assigned_window_end,
          optimal_date: s.optimal_harvest_date,
          status: s.status,
          priority_level: s.priority_level,
          green_credits: 0, // Would come from green_credits table
          booking_enabled: s.priority_booking_enabled
        })
      }
    } catch (error) {
      console.error('Error fetching harvest schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const isWindowOpen = () => {
    if (!schedule) return false
    const now = new Date()
    const start = new Date(schedule.window_start)
    const end = new Date(schedule.window_end)
    return now >= start && now <= end
  }

  const handleAccept = () => {
    setAccepted(true)
    // Would call API to accept schedule
  }

  const handleBookMachine = () => {
    navigate('/machines')
  }

  if (loading) {
    return (
      <div className="harvest-slot-card loading">
        <div className="loading-shimmer"></div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="harvest-slot-card empty">
        <div className="empty-icon">
          <Calendar size={32} />
        </div>
        <p>No harvest schedule assigned yet</p>
        <span className="empty-hint">Check back soon for your optimal harvest window</span>
      </div>
    )
  }

  const windowOpen = isWindowOpen()

  return (
    <div className={`harvest-slot-card ${windowOpen ? 'window-open' : ''}`}>
      {/* Header */}
      <div className="harvest-slot-header">
        <div className="header-left">
          <div className="harvest-icon">
            <Leaf size={20} />
          </div>
          <div>
            <h3>My Harvest Slot</h3>
            <span className="cluster-name">{schedule.cluster_name}</span>
          </div>
        </div>
        <div className={`priority-badge ${schedule.priority_level}`}>
          {schedule.priority_level === 'premium' && <Sparkles size={12} />}
          {schedule.priority_level.charAt(0).toUpperCase() + schedule.priority_level.slice(1)}
        </div>
      </div>

      {/* Date Window */}
      <div className="harvest-window">
        <div className="window-dates">
          <div className="date-box">
            <span className="date-label">From</span>
            <span className="date-value">{formatDate(schedule.window_start)}</span>
          </div>
          <div className="date-arrow">→</div>
          <div className="date-box">
            <span className="date-label">To</span>
            <span className="date-value">{formatDate(schedule.window_end)}</span>
          </div>
        </div>
        <div className="optimal-date">
          <Clock size={14} />
          <span>Optimal: {formatDate(schedule.optimal_date)}</span>
        </div>
      </div>

      {/* Status */}
      <div className="harvest-status">
        {windowOpen ? (
          <div className="status-open">
            <div className="pulse-dot"></div>
            <span>Booking Window OPEN</span>
          </div>
        ) : (
          <div className="status-pending">
            <Clock size={14} />
            <span>Window opens {formatDate(schedule.window_start)}</span>
          </div>
        )}
      </div>

      {/* Green Credits */}
      <div className="green-credits">
        <div className="credits-info">
          <Leaf size={16} className="credits-icon" />
          <div>
            <span className="credits-label">Green Credits</span>
            <span className="credits-value">{schedule.green_credits}</span>
          </div>
        </div>
        <span className="credits-hint">Earn +50 for on-time harvest</span>
      </div>

      {/* Action Buttons */}
      <div className="harvest-actions">
        {!accepted && schedule.status === 'scheduled' ? (
          <button className="accept-btn" onClick={handleAccept}>
            <Check size={18} />
            Accept Schedule
          </button>
        ) : windowOpen || schedule.booking_enabled ? (
          <button className="book-btn" onClick={handleBookMachine}>
            Book Machine Now
            <ChevronRight size={18} />
          </button>
        ) : (
          <button className="book-btn disabled" disabled>
            Booking Opens {formatDate(schedule.window_start)}
          </button>
        )}
      </div>
    </div>
  )
}

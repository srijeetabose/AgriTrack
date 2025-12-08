import { useState, useEffect } from 'react'
import { Calendar, Clock, X } from 'lucide-react'
import { getBookings, cancelBooking, type Booking } from '../lib/api'
import './BookingsPage.css'

// Demo farmer ID - replace with actual auth
const FARMER_ID = 'farmer-demo'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all')

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      const data = await getBookings(FARMER_ID)
      setBookings(data)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    
    try {
      await cancelBooking(id)
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'cancelled' } : b
      ))
    } catch (err) {
      alert('Failed to cancel booking')
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'active') return ['pending', 'confirmed', 'in_progress'].includes(booking.status)
    if (filter === 'past') return ['completed', 'cancelled'].includes(booking.status)
    return true
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bookings-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h2>My Bookings</h2>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={`filter-tab ${filter === 'past' ? 'active' : ''}`}
          onClick={() => setFilter('past')}
        >
          Past
        </button>
      </div>

      {/* Bookings List */}
      <div className="bookings-list">
        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No bookings found</h3>
            <p>Your booking history will appear here</p>
          </div>
        ) : (
          filteredBookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <div className="booking-machine">
                  <span className="machine-icon">🚜</span>
                  <div>
                    <h4>{booking.machine_id}</h4>
                    <span className={`badge badge-${booking.status}`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="booking-details">
                <div className="detail-row">
                  <Calendar size={16} />
                  <span>{formatDate(booking.scheduled_date)}</span>
                </div>
                <div className="detail-row">
                  <Clock size={16} />
                  <span>Booked on {formatDate(booking.created_at)}</span>
                </div>
              </div>

              {booking.notes && (
                <p className="booking-notes">{booking.notes}</p>
              )}

              {['pending', 'confirmed'].includes(booking.status) && (
                <button
                  className="cancel-btn"
                  onClick={() => handleCancel(booking.id)}
                >
                  <X size={16} />
                  Cancel Booking
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

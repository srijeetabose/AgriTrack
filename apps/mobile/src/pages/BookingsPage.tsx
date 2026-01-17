import { useState, useEffect } from 'react'
import { Calendar, X, MapPin, Wheat, RefreshCw } from 'lucide-react'
import { getBookings, cancelBooking, type Booking } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import './BookingsPage.css'

interface ExtendedBooking extends Booking {
  farmer_name?: string
  farmer_phone?: string
  location?: string
  acres?: number
  crop?: string
  offline?: boolean
}

export default function BookingsPage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [bookings, setBookings] = useState<ExtendedBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all')

  useEffect(() => {
    loadBookings()
  }, [user])

  const loadBookings = async () => {
    setLoading(true)
    try {
      let apiBookings: ExtendedBooking[] = []
      if (user?.id) {
        try {
          apiBookings = await getBookings(user.id)
        } catch (err) {
          console.error('Failed to load API bookings:', err)
        }
      }
      
      const offlineBookings: ExtendedBooking[] = JSON.parse(localStorage.getItem('offline_bookings') || '[]')
        .map((b: ExtendedBooking) => ({ ...b, offline: true }))
      
      const allBookings = [...apiBookings, ...offlineBookings]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setBookings(allBookings)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    const confirmMsg = language === 'hi' ? 'क्या आप वाकई इस बुकिंग को रद्द करना चाहते हैं?' : 
                       language === 'bn' ? 'আপনি কি সত্যিই এই বুকিং বাতিল করতে চান?' :
                       'Are you sure you want to cancel this booking?'
    if (!confirm(confirmMsg)) return
    
    try {
      await cancelBooking(id)
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'cancelled' } : b
      ))
    } catch (err) {
      alert(language === 'hi' ? 'बुकिंग रद्द करने में विफल' : 'Failed to cancel booking')
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
    const locale = language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'en-IN'
    return date.toLocaleDateString(locale, { 
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
          <p>{language === 'hi' ? 'बुकिंग लोड हो रही है...' : 'Loading bookings...'}</p>
        </div>
      </div>
    )
  }

  const totalBookings = bookings.length
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status?.includes('pending')).length

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h2>{t('myBookings')}</h2>
        <button className="refresh-btn" onClick={loadBookings}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">{t('totalBookings')}</span>
          <span className="stat-value">{totalBookings}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">{t('pending')}</span>
          <span className="stat-value pending">{pendingBookings}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('all')}
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          {t('active')}
        </button>
        <button
          className={`filter-tab ${filter === 'past' ? 'active' : ''}`}
          onClick={() => setFilter('past')}
        >
          {t('past')}
        </button>
      </div>

      {/* Bookings List */}
      <div className="bookings-list">
        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>{t('noBookingsFound')}</h3>
            <p>{t('bookingHistory')}</p>
          </div>
        ) : (
          filteredBookings.map(booking => (
            <div key={booking.id} className={`booking-card ${booking.offline ? 'offline' : ''}`}>
              <div className="booking-header">
                <div className="booking-id">
                  <span>🎫</span>
                  <span className="id-text">{booking.id}</span>
                </div>
                <span className={`badge badge-${booking.status?.replace(' ', '-').replace('(', '').replace(')', '')}`}>
                  {booking.status?.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              <div className="booking-machine-info">
                <span className="machine-icon">🚜</span>
                <div>
                  <h4>{t('machine')} {booking.machine_id}</h4>
                  <span className="machine-id">ID: {booking.machine_id}</span>
                </div>
              </div>

              <div className="booking-details">
                <div className="detail-row">
                  <Calendar size={16} />
                  <div>
                    <span className="detail-label">{t('bookingDate')}</span>
                    <span className="detail-value">{formatDate(booking.scheduled_date || booking.created_at)}</span>
                  </div>
                </div>
                
                {booking.location && (
                  <div className="detail-row">
                    <MapPin size={16} />
                    <span className="detail-value">{booking.location}</span>
                  </div>
                )}
                
                {booking.acres && (
                  <div className="detail-row">
                    <Wheat size={16} />
                    <span className="detail-value">{booking.acres} {t('acres')}</span>
                  </div>
                )}
              </div>

              {booking.notes && (
                <p className="booking-notes">{booking.notes}</p>
              )}

              {booking.offline && (
                <div className="offline-badge">
                  📵 {language === 'hi' ? 'ऑफलाइन - ऑनलाइन होने पर सिंक होगा' : 'Offline - Will sync when online'}
                </div>
              )}

              {['pending', 'confirmed'].includes(booking.status) && !booking.offline && (
                <button
                  className="cancel-btn"
                  onClick={() => handleCancel(booking.id)}
                >
                  <X size={16} />
                  {t('cancelBooking')}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

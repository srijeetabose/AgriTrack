import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Thermometer, Fuel, Gauge, Activity, MapPin, AlertTriangle, Calendar } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { createBooking } from '../lib/api'
import './MachineDetailPage.css'

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { machines } = useSocket()
  const machine = machines.get(id || '')
  
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')

  if (!machine) {
    return (
      <div className="detail-page">
        <header className="detail-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h2>Machine Details</h2>
        </header>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading machine data...</p>
        </div>
      </div>
    )
  }

  const handleBooking = async () => {
    if (!bookingDate) {
      setBookingError('Please select a date')
      return
    }

    setBooking(true)
    setBookingError('')

    try {
      await createBooking({
        machine_id: machine.id,
        farmer_id: 'farmer-demo', // TODO: Replace with actual farmer ID
        scheduled_date: bookingDate,
        notes: bookingNotes
      })
      setShowBookingModal(false)
      alert('Booking request sent! You will receive SMS confirmation.')
      navigate('/bookings')
    } catch (err: any) {
      setBookingError(err.message || 'Failed to create booking')
    } finally {
      setBooking(false)
    }
  }

  const hasAlerts = machine.alerts && machine.alerts.length > 0

  return (
    <div className="detail-page">
      {/* Header */}
      <header className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2>{machine.id}</h2>
        <span className={`badge badge-${machine.state}`}>{machine.state}</span>
      </header>

      {/* Main Content */}
      <div className="detail-content">
        {/* Machine Info Card */}
        <div className="info-card">
          <div className="machine-hero">
            <span className="hero-icon">🚜</span>
            <div>
              <h3>{machine.id}</h3>
              <p className="machine-type">{machine.type}</p>
            </div>
          </div>
          
          {/* Location */}
          <div className="location-row">
            <MapPin size={16} />
            <span>
              {machine.lat?.toFixed(4)}, {machine.lng?.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Alerts Section */}
        {hasAlerts && (
          <div className="alerts-card">
            <h4><AlertTriangle size={18} /> Active Alerts</h4>
            <ul className="alerts-list">
              {machine.alerts.map((alert, i) => (
                <li key={i} className="alert-item">
                  <span className="alert-type">{alert.type}</span>
                  <span className="alert-message">{alert.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-card">
          <h4>Real-time Metrics</h4>
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-icon temp">
                <Thermometer size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{machine.temp?.toFixed(1)}°C</span>
                <span className="metric-label">Temperature</span>
              </div>
            </div>
            
            <div className="metric">
              <div className="metric-icon fuel">
                <Fuel size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{machine.fuel?.toFixed(0)}%</span>
                <span className="metric-label">Fuel Level</span>
              </div>
            </div>
            
            <div className="metric">
              <div className="metric-icon speed">
                <Gauge size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{machine.speed?.toFixed(1)} km/h</span>
                <span className="metric-label">Speed</span>
              </div>
            </div>
            
            <div className="metric">
              <div className="metric-icon rpm">
                <Activity size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{machine.rpm?.toFixed(0)}</span>
                <span className="metric-label">RPM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Area Covered */}
        <div className="area-card">
          <h4>Area Covered Today</h4>
          <div className="area-value">
            <span className="area-number">{machine.area?.toFixed(2) || 0}</span>
            <span className="area-unit">hectares</span>
          </div>
        </div>

        {/* Book Button */}
        {machine.state !== 'off' && (
          <button 
            className="btn btn-primary book-btn"
            onClick={() => setShowBookingModal(true)}
          >
            <Calendar size={20} />
            Request Booking
          </button>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Book {machine.id}</h3>
            
            <div className="form-group">
              <label>Select Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Any special requirements..."
                rows={3}
              />
            </div>

            {bookingError && (
              <p className="error-message">{bookingError}</p>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowBookingModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleBooking}
                disabled={booking}
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tractor, BookOpen, Activity, MapPin, Clock, ChevronRight, Mic } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './HomePage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface Machine {
  id: string
  name?: string
  state: string
  gps?: { lat: number; lng: number }
  distance?: {
    km: number
    direction: string
    eta: { minutes: number; formatted: string }
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/machines/available?limit=5`)
      const data = await response.json()
      setMachines(data.machines || [])
    } catch (error) {
      console.error('Failed to fetch machines:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-page">
      {/* Welcome Card - No duplicate header */}
      <section className="welcome-card">
        <div className="welcome-greeting">
          <h2>नमस्ते, {user?.name?.split(' ')[0] || 'Farmer'}! 👋</h2>
          <p className="welcome-subtitle">What would you like to do today?</p>
        </div>
        {user?.green_certified && (
          <div className="green-badge">
            <span>🌿 Green Certified</span>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <div className="action-card" onClick={() => navigate('/book')}>
          <div className="action-icon green">
            <BookOpen size={28} />
          </div>
          <div className="action-text">
            <h3>Book Machine</h3>
            <p>Reserve equipment for your field</p>
          </div>
          <ChevronRight size={20} className="chevron" />
        </div>

        <div className="action-card" onClick={() => navigate('/bookings')}>
          <div className="action-icon blue">
            <Activity size={28} />
          </div>
          <div className="action-text">
            <h3>My Bookings</h3>
            <p>Track your reservations</p>
          </div>
          <ChevronRight size={20} className="chevron" />
        </div>
      </section>

      {/* Available Machines */}
      <section className="machines-section">
        <div className="section-header">
          <h3>Available Machines</h3>
          <span className="badge">Near You</span>
        </div>

        <div className="machines-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Finding nearest machines...</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="empty-state">
              <Tractor size={48} />
              <p>No machines available at the moment</p>
            </div>
          ) : (
            machines.map((machine, index) => (
              <div
                key={machine.id}
                className="machine-item"
                onClick={() => navigate(`/machines/${machine.id}`)}
              >
                <div className="machine-icon">
                  <Tractor size={24} />
                </div>
                <div className="machine-info">
                  <div className="machine-name">
                    <span>{machine.name || machine.id}</span>
                    {index === 0 && <span className="nearest-tag">NEAREST</span>}
                  </div>
                  <p className={machine.state === 'idle' ? 'available' : 'working'}>
                    {machine.state === 'idle' ? '✓ Available' : '⚡ Working'}
                  </p>
                  {machine.distance && (
                    <div className="machine-distance">
                      <span><MapPin size={12} /> {machine.distance.km} km</span>
                      <span><Clock size={12} /> {machine.distance.eta?.formatted || 'N/A'}</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={20} className="chevron" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Voice Assistant Hint */}
      <section className="voice-hint">
        <div className="voice-icon">
          <Mic size={20} />
        </div>
        <div>
          <h4>Voice Assistant Available</h4>
          <p>Use voice commands on booking page</p>
        </div>
      </section>
    </div>
  )
}

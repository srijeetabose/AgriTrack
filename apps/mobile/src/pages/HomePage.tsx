import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tractor, AlertTriangle, MapPin, Calendar, Award, TrendingUp, ShoppingBag, ChevronRight } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { getAnalytics } from '../lib/api'
import MyHarvestSlot from '../components/MyHarvestSlot'
import './HomePage.css'

interface Stats {
  totalMachines: number
  activeMachines: number
  idleMachines: number
  offlineMachines: number
  alertCount: number
  total?: number
  active?: number
  idle?: number
  offline?: number
  alerts?: number
}

export default function HomePage() {
  const navigate = useNavigate()
  const { machines, connected } = useSocket()
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    getAnalytics()
      .then(setStats)
      .catch(console.error)
  }, [])

  const realtimeStats = {
    total: machines.size,
    active: Array.from(machines.values()).filter(m => m.state === 'active').length,
    idle: Array.from(machines.values()).filter(m => m.state === 'idle').length,
    offline: Array.from(machines.values()).filter(m => m.state === 'off').length,
    alerts: Array.from(machines.values()).reduce((sum, m) => sum + (m.alerts?.length || 0), 0)
  }

  const displayStats = connected && machines.size > 0 
    ? realtimeStats 
    : stats 
      ? { 
          total: stats.totalMachines,
          active: stats.activeMachines,
          idle: stats.idleMachines,
          offline: stats.offlineMachines,
          alerts: stats.alertCount
        }
      : null

  return (
    <div className="home-page">
      {/* Welcome Section */}
      <section className="welcome-section">
        <h2>Welcome, {user?.name?.split(' ')[0] || 'Farmer'}! 👋</h2>
        <p>Find and book CRM machinery near you</p>
      </section>

      {/* Green Status Card */}
      {user && (
        <section className="green-status-section" onClick={() => navigate('/green-certificate')}>
          <div className={`green-status-card ${user.green_certified ? 'certified' : 'not-certified'}`}>
            <div className="green-status-left">
              <Award size={28} />
              <div className="green-status-info">
                <span className="green-status-label">
                  {user.green_certified ? 'Green Certified ✓' : 'Get Green Certified'}
                </span>
                <span className="green-status-credits">
                  {user.green_credits || 0} Credits Earned
                </span>
              </div>
            </div>
            <ChevronRight size={20} />
          </div>
        </section>
      )}

      {/* My Harvest Slot */}
      <section className="harvest-section">
        <MyHarvestSlot />
      </section>

      {/* Stats Grid */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card" onClick={() => navigate('/machines')}>
            <div className="stat-icon active">
              <Tractor size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{displayStats?.active || 0}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          
          <div className="stat-card" onClick={() => navigate('/machines')}>
            <div className="stat-icon idle">
              <Tractor size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{displayStats?.idle || 0}</span>
              <span className="stat-label">Available</span>
            </div>
          </div>

          <div className="stat-card alert" onClick={() => navigate('/machines')}>
            <div className="stat-icon alert">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{displayStats?.alerts || 0}</span>
              <span className="stat-label">Alerts</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate('/bookings')}>
            <div className="stat-icon booking">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">--</span>
              <span className="stat-label">Bookings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="actions-section">
        <h3>Quick Actions</h3>
        <div className="action-cards">
          <div className="action-card" onClick={() => navigate('/machines')}>
            <MapPin size={32} className="action-icon" />
            <div>
              <h4>Find Nearby</h4>
              <p>Browse available machinery</p>
            </div>
          </div>
          <div className="action-card mandi" onClick={() => navigate('/marketplace')}>
            <ShoppingBag size={32} className="action-icon" />
            <div>
              <h4>Mandi Prices</h4>
              <p>Today's crop rates</p>
            </div>
            {user?.green_certified && <span className="bonus-tag">+5% Bonus</span>}
          </div>
        </div>
      </section>

      {/* Green Benefits Preview */}
      {user?.green_certified && (
        <section className="benefits-preview">
          <h3>🌿 Your Green Benefits</h3>
          <div className="benefits-scroll">
            <div className="benefit-chip">
              <TrendingUp size={16} />
              <span>5-12% Bonus on Sales</span>
            </div>
            <div className="benefit-chip">
              <Award size={16} />
              <span>Priority Booking</span>
            </div>
            <div className="benefit-chip">
              <ShoppingBag size={16} />
              <span>Premium Buyers</span>
            </div>
          </div>
        </section>
      )}

      {/* Live Updates */}
      <section className="activity-section">
        <h3>Live Updates</h3>
        <div className="activity-list">
          {Array.from(machines.values())
            .filter(m => m.alerts && m.alerts.length > 0)
            .slice(0, 5)
            .map(machine => (
              <div key={machine.id} className="activity-item" onClick={() => navigate(`/machines/${machine.id}`)}>
                <span className="activity-icon">⚠️</span>
                <div className="activity-info">
                  <span className="activity-title">{machine.id}</span>
                  <span className="activity-message">{machine.alerts[0]?.message}</span>
                </div>
              </div>
            ))}
          {machines.size === 0 && (
            <p className="text-muted text-center" style={{ padding: '20px' }}>
              {connected ? 'No recent alerts' : 'Connecting to server...'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

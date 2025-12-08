import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  User, 
  Phone, 
  MapPin, 
  Bell, 
  LogOut, 
  ChevronRight,
  Award,
  ShoppingBag,
  Leaf,
  Star,
  Shield
} from 'lucide-react'
import './ProfilePage.css'

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar">
          <User size={40} />
        </div>
        <h2>{user?.name || 'Farmer'}</h2>
        <p className="phone">{user?.phone}</p>
        
        {/* Green Status Badge */}
        {user?.green_certified ? (
          <div className="green-badge certified">
            <Award size={16} />
            <span>Green Certified</span>
          </div>
        ) : (
          <div className="green-badge pending">
            <Leaf size={16} />
            <span>Not Certified</span>
          </div>
        )}
      </div>

      {/* Green Credits */}
      <div className="credits-section">
        <div className="credits-card">
          <div className="credits-icon">
            <Star size={24} />
          </div>
          <div className="credits-info">
            <span className="credits-value">{user?.green_credits || 0}</span>
            <span className="credits-label">Green Credits</span>
          </div>
          <ChevronRight size={20} className="credits-arrow" />
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-section">
        <h3>Farm Details</h3>
        <div className="info-card">
          <div className="info-row">
            <div className="info-icon">
              <MapPin size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">Location</span>
              <span className="info-value">
                {user?.village ? `${user.village}, ` : ''}{user?.district}, {user?.state}
              </span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-icon">
              <span>🌾</span>
            </div>
            <div className="info-content">
              <span className="info-label">Farm Size</span>
              <span className="info-value">{user?.farm_size || 0} hectares</span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-icon">
              <span>🌱</span>
            </div>
            <div className="info-content">
              <span className="info-label">Crops</span>
              <span className="info-value">{user?.crops?.join(', ') || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="profile-section">
        <h3>Quick Actions</h3>
        <div className="settings-card">
          <div 
            className="settings-row clickable"
            onClick={() => navigate('/green-certificate')}
          >
            <div className="settings-left">
              <Award size={20} />
              <span>Green Certificate</span>
            </div>
            {user?.green_certified && <span className="badge-active">✓ Active</span>}
            <ChevronRight size={20} className="chevron" />
          </div>
          
          <div 
            className="settings-row clickable"
            onClick={() => navigate('/marketplace')}
          >
            <div className="settings-left">
              <ShoppingBag size={20} />
              <span>Mandi Prices</span>
            </div>
            <span className="badge-new">NEW</span>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="profile-section">
        <h3>Settings</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-left">
              <Bell size={20} />
              <span>Push Notifications</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="settings-row clickable">
            <div className="settings-left">
              <Phone size={20} />
              <span>Update Phone Number</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>

          <div className="settings-row clickable">
            <div className="settings-left">
              <Shield size={20} />
              <span>Change PIN</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="profile-section">
        <h3>Support</h3>
        <div className="settings-card">
          <div className="settings-row clickable">
            <div className="settings-left">
              <span>📞</span>
              <span>Contact Helpline</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
          <div className="settings-row clickable">
            <div className="settings-left">
              <span>❓</span>
              <span>FAQs</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Logout */}
      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={20} />
        Logout
      </button>

      {/* App Info */}
      <div className="app-info">
        <p>AgriTrack v1.0.0</p>
        <p>Smart India Hackathon 2025</p>
      </div>
    </div>
  )
}

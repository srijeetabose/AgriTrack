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
  Shield,
  X
} from 'lucide-react'
import './ProfilePage.css'

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
    }
  }

  const handleUpdatePhone = () => {
    if (!newPhone || newPhone.length < 10) {
      alert('Please enter a valid phone number')
      return
    }
    alert('Phone number update request sent! You will receive an OTP for verification.')
    setShowPhoneModal(false)
    setNewPhone('')
  }

  const handleChangePin = () => {
    if (currentPin.length !== 4) {
      alert('Please enter your current 4-digit PIN')
      return
    }
    if (newPin.length !== 4) {
      alert('New PIN must be 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      alert('New PIN and confirmation do not match')
      return
    }
    alert('PIN changed successfully!')
    setShowPinModal(false)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
  }

  const handleContactHelpline = () => {
    const helplineNumber = 'tel:1800-180-1551'
    window.location.href = helplineNumber
  }

  const handleFAQs = () => {
    alert('FAQs:\n\n1. How to book a machine?\n   Go to Home > Book Machine\n\n2. How to get Green Certified?\n   Complete 3+ harvests without burning\n\n3. What are Green Credits?\n   Rewards for eco-friendly farming\n\n4. Contact support?\n   Call 1800-180-1551 (Toll Free)')
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
          
          <div className="settings-row clickable" onClick={() => setShowPhoneModal(true)}>
            <div className="settings-left">
              <Phone size={20} />
              <span>Update Phone Number</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>

          <div className="settings-row clickable" onClick={() => setShowPinModal(true)}>
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
          <div className="settings-row clickable" onClick={handleContactHelpline}>
            <div className="settings-left">
              <span>📞</span>
              <span>Contact Helpline</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
          <div className="settings-row clickable" onClick={handleFAQs}>
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

      {/* Phone Update Modal */}
      {showPhoneModal && (
        <div className="modal-overlay" onClick={() => setShowPhoneModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Phone Number</h3>
              <button className="close-btn" onClick={() => setShowPhoneModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="current-phone">Current: {user?.phone}</p>
              <div className="form-group">
                <label>New Phone Number</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Enter new phone number"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPhoneModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdatePhone}>Send OTP</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change PIN</h3>
              <button className="close-btn" onClick={() => setShowPinModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Current PIN</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
              <div className="form-group">
                <label>New PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
              <div className="form-group">
                <label>Confirm New PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPinModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleChangePin}>Change PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

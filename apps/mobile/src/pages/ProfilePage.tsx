import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
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
  X,
  Globe
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
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = () => {
    const confirmMsg = language === 'hi' ? 'क्या आप वाकई लॉगआउट करना चाहते हैं?' :
                       language === 'bn' ? 'আপনি কি সত্যিই লগআউট করতে চান?' :
                       'Are you sure you want to logout?'
    if (confirm(confirmMsg)) {
      logout()
      navigate('/login')
    }
  }

  const handleUpdatePhone = () => {
    if (!newPhone || newPhone.length < 10) {
      alert(language === 'hi' ? 'कृपया एक वैध फोन नंबर दर्ज करें' : 'Please enter a valid phone number')
      return
    }
    alert(language === 'hi' ? 'फोन नंबर अपडेट अनुरोध भेजा गया! सत्यापन के लिए आपको OTP प्राप्त होगा।' : 'Phone number update request sent! You will receive an OTP for verification.')
    setShowPhoneModal(false)
    setNewPhone('')
  }

  const handleChangePin = () => {
    if (currentPin.length !== 4) {
      alert(language === 'hi' ? 'कृपया अपना वर्तमान 4-अंकीय पिन दर्ज करें' : 'Please enter your current 4-digit PIN')
      return
    }
    if (newPin.length !== 4) {
      alert(language === 'hi' ? 'नया पिन 4 अंकों का होना चाहिए' : 'New PIN must be 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      alert(language === 'hi' ? 'नया पिन और पुष्टि मेल नहीं खाते' : 'New PIN and confirmation do not match')
      return
    }
    alert(language === 'hi' ? 'पिन सफलतापूर्वक बदल दिया गया!' : 'PIN changed successfully!')
    setShowPinModal(false)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
  }

  const handleContactHelpline = () => {
    window.location.href = 'tel:1800-180-1551'
  }

  const handleFAQs = () => {
    const faqText = language === 'hi' 
      ? 'अक्सर पूछे जाने वाले प्रश्न:\n\n1. मशीन कैसे बुक करें?\n   होम > मशीन बुक करें पर जाएं\n\n2. ग्रीन सर्टिफाइड कैसे बनें?\n   बिना जलाए 3+ फसलें पूरी करें\n\n3. ग्रीन क्रेडिट क्या हैं?\n   पर्यावरण-अनुकूल खेती के लिए पुरस्कार\n\n4. सहायता से संपर्क करें?\n   1800-180-1551 पर कॉल करें (टोल फ्री)'
      : 'FAQs:\n\n1. How to book a machine?\n   Go to Home > Book Machine\n\n2. How to get Green Certified?\n   Complete 3+ harvests without burning\n\n3. What are Green Credits?\n   Rewards for eco-friendly farming\n\n4. Contact support?\n   Call 1800-180-1551 (Toll Free)'
    alert(faqText)
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar">
          <User size={40} />
        </div>
        <h2>{user?.name || (language === 'hi' ? 'किसान' : 'Farmer')}</h2>
        <p className="phone">{user?.phone}</p>
        
        {/* Green Status Badge */}
        {user?.green_certified ? (
          <div className="green-badge certified">
            <Award size={16} />
            <span>{t('greenCertificate')}</span>
          </div>
        ) : (
          <div className="green-badge pending">
            <Leaf size={16} />
            <span>{language === 'hi' ? 'प्रमाणित नहीं' : 'Not Certified'}</span>
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
            <span className="credits-label">{t('greenCredits')}</span>
          </div>
          <ChevronRight size={20} className="credits-arrow" />
        </div>
      </div>

      {/* Language Selection */}
      <div className="profile-section">
        <h3>{language === 'hi' ? 'भाषा' : language === 'bn' ? 'ভাষা' : 'Language'}</h3>
        <div className="language-selector">
          <button 
            className={`lang-option ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            <Globe size={16} />
            English
          </button>
          <button 
            className={`lang-option ${language === 'hi' ? 'active' : ''}`}
            onClick={() => setLanguage('hi')}
          >
            <Globe size={16} />
            हिंदी
          </button>
          <button 
            className={`lang-option ${language === 'bn' ? 'active' : ''}`}
            onClick={() => setLanguage('bn')}
          >
            <Globe size={16} />
            বাংলা
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-section">
        <h3>{t('farmDetails')}</h3>
        <div className="info-card">
          <div className="info-row">
            <div className="info-icon">
              <MapPin size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">{t('location')}</span>
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
              <span className="info-label">{t('farmSize')}</span>
              <span className="info-value">{user?.farm_size || 0} {t('hectares')}</span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-icon">
              <span>🌱</span>
            </div>
            <div className="info-content">
              <span className="info-label">{t('crops')}</span>
              <span className="info-value">{user?.crops?.join(', ') || t('notSpecified')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="profile-section">
        <h3>{t('quickActions')}</h3>
        <div className="settings-card">
          <div 
            className="settings-row clickable"
            onClick={() => navigate('/green-certificate')}
          >
            <div className="settings-left">
              <Award size={20} />
              <span>{t('greenCertificate')}</span>
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
              <span>{t('mandiPricesNav')}</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="profile-section">
        <h3>{t('settings')}</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-left">
              <Bell size={20} />
              <span>{t('pushNotifications')}</span>
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
              <span>{t('updatePhone')}</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>

          <div className="settings-row clickable" onClick={() => setShowPinModal(true)}>
            <div className="settings-left">
              <Shield size={20} />
              <span>{t('changePin')}</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="profile-section">
        <h3>{t('support')}</h3>
        <div className="settings-card">
          <div className="settings-row clickable" onClick={handleContactHelpline}>
            <div className="settings-left">
              <span>📞</span>
              <span>{t('contactHelpline')}</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
          <div className="settings-row clickable" onClick={handleFAQs}>
            <div className="settings-left">
              <span>❓</span>
              <span>{t('faqs')}</span>
            </div>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>
      </div>

      {/* Logout */}
      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={20} />
        {t('logout')}
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
              <h3>{t('updatePhone')}</h3>
              <button className="close-btn" onClick={() => setShowPhoneModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="current-phone">{language === 'hi' ? 'वर्तमान' : 'Current'}: {user?.phone}</p>
              <div className="form-group">
                <label>{language === 'hi' ? 'नया फोन नंबर' : 'New Phone Number'}</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder={language === 'hi' ? 'नया फोन नंबर दर्ज करें' : 'Enter new phone number'}
                  maxLength={10}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPhoneModal(false)}>
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button className="btn-primary" onClick={handleUpdatePhone}>
                {language === 'hi' ? 'OTP भेजें' : 'Send OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('changePin')}</h3>
              <button className="close-btn" onClick={() => setShowPinModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{language === 'hi' ? 'वर्तमान पिन' : 'Current PIN'}</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
              <div className="form-group">
                <label>{language === 'hi' ? 'नया पिन' : 'New PIN'}</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
              <div className="form-group">
                <label>{language === 'hi' ? 'नया पिन पुष्टि करें' : 'Confirm New PIN'}</label>
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
              <button className="btn-secondary" onClick={() => setShowPinModal(false)}>
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button className="btn-primary" onClick={handleChangePin}>
                {language === 'hi' ? 'पिन बदलें' : 'Change PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

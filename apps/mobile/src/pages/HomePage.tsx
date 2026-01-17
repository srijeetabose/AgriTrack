import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Activity, Globe, LogOut, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage, type Language } from '../context/LanguageContext'
import './HomePage.css'

// Top 5 Farmers leaderboard data
const topFarmers = [
  { rank: 1, name: 'Ram Singh', hours: 152 },
  { rank: 2, name: 'Suresh Yadav', hours: 145 },
  { rank: 3, name: 'Priya Sharma', hours: 138 },
  { rank: 4, name: 'Anil Kumar', hours: 127 },
  { rank: 5, name: 'Meena Devi', hours: 121 },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [showLangMenu, setShowLangMenu] = useState(false)

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    setShowLangMenu(false)
  }

  return (
    <div className="home-page">
      {/* Header with Language Selector */}
      <header className="home-header">
        <div className="header-brand">
          <img src="/LOGO.png" alt="AgriTrack" className="header-logo" />
          <div className="header-text">
            <span className="header-title">AgriTrack</span>
            <span className="header-subtitle">Farmer Portal</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="lang-dropdown">
            <button className="lang-btn" onClick={() => setShowLangMenu(!showLangMenu)}>
              <Globe size={16} />
              <span>{language === 'en' ? 'EN' : language === 'hi' ? 'हि' : 'বা'}</span>
            </button>
            {showLangMenu && (
              <div className="lang-menu">
                <button onClick={() => handleLanguageChange('en')} className={language === 'en' ? 'active' : ''}>English</button>
                <button onClick={() => handleLanguageChange('hi')} className={language === 'hi' ? 'active' : ''}>हिंदी</button>
                <button onClick={() => handleLanguageChange('bn')} className={language === 'bn' ? 'active' : ''}>বাংলা</button>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Welcome Card */}
      <section className="welcome-card">
        <div className="welcome-greeting">
          <h2>🌾 {t('welcome')}, {user?.name?.split(' ')[0] || 'Farmer'}!</h2>
          <p className="welcome-subtitle">{t('subtitle')}</p>
        </div>
        {user?.green_certified && (
          <div className="green-badge">
            <span>{t('greenCertified')}</span>
          </div>
        )}
      </section>

      {/* Quick Actions - Stacked Layout */}
      <section className="quick-actions-stack">
        <div className="action-card-full" onClick={() => navigate('/book')}>
          <div className="action-icon-new green">
            <BookOpen size={28} />
          </div>
          <div className="action-content">
            <h3>{t('bookMachine')}</h3>
            <p>{t('bookDesc')}</p>
          </div>
          <span className="action-arrow">&gt;</span>
        </div>

        <div className="action-card-full" onClick={() => navigate('/bookings')}>
          <div className="action-icon-new blue">
            <Activity size={28} />
          </div>
          <div className="action-content">
            <h3>{t('myBookings')}</h3>
            <p>{t('bookingsDesc')}</p>
          </div>
          <span className="action-arrow">&gt;</span>
        </div>
      </section>

      {/* Top 5 Farmers Leaderboard */}
      <section className="leaderboard-section">
        <h3 className="leaderboard-title">🏆 Top 5 Farmers (Most CRM Usage)</h3>
        <div className="leaderboard-card">
          {topFarmers.map((farmer) => (
            <div 
              key={farmer.rank} 
              className={`leaderboard-row ${farmer.rank === 1 ? 'top-farmer' : ''}`}
            >
              <span className="farmer-rank">{farmer.rank}</span>
              <div className="farmer-name-wrapper">
                <CheckCircle size={16} className="check-icon" />
                <span className="farmer-name">{farmer.name}</span>
              </div>
              <span className="farmer-hours">{farmer.hours} Hours</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

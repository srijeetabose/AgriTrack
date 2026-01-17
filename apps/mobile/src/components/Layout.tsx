import { Outlet, NavLink } from 'react-router-dom'
import { Home, Tractor, Calendar, User, ShoppingBag } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import './Layout.css'

export default function Layout() {
  const { t } = useLanguage()
  
  return (
    <div className="layout">
      {/* Main Content - No header, cleaner look */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          <span>{t('home')}</span>
        </NavLink>
        <NavLink to="/machines" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Tractor size={22} />
          <span>{t('machines')}</span>
        </NavLink>
        <NavLink to="/marketplace" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingBag size={22} />
          <span>{t('mandi')}</span>
        </NavLink>
        <NavLink to="/bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={22} />
          <span>{t('bookings')}</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={22} />
          <span>{t('profile')}</span>
        </NavLink>
      </nav>
    </div>
  )
}

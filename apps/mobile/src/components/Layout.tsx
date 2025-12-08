import { Outlet, NavLink } from 'react-router-dom'
import { Home, Tractor, Calendar, User, ShoppingBag } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import './Layout.css'

export default function Layout() {
  const { connected } = useSocket()

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <span className="logo-icon">🚜</span>
            <h1 className="header-title">AgriTrack</h1>
          </div>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {connected ? 'Live' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/machines" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Tractor size={22} />
          <span>Machines</span>
        </NavLink>
        <NavLink to="/marketplace" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingBag size={22} />
          <span>Mandi</span>
        </NavLink>
        <NavLink to="/bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={22} />
          <span>Bookings</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={22} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  )
}

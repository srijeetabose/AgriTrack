import { Outlet, NavLink } from 'react-router-dom'
import { Home, Tractor, Calendar, User, ShoppingBag } from 'lucide-react'
import './Layout.css'

export default function Layout() {
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

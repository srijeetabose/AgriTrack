'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Tractor, 
  Calendar, 
  Settings,
  Bell,
  Cpu,
  Wheat,
  Brain,
  FileText,
  CalendarClock,
  LogOut,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/machines', label: 'Machines', icon: Tractor },
  { href: '/dashboard/scheduling', label: 'Scheduling', icon: CalendarClock },
  { href: '/dashboard/analytics', label: 'AI Analytics', icon: Brain },
  { href: '/dashboard/reports', label: 'Live Reports', icon: FileText },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/crop-residue', label: 'Crop Residue', icon: Wheat },
  { href: '/dashboard/simulator', label: 'Simulator', icon: Cpu },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('agritrack_token')
    localStorage.removeItem('agritrack_user')
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 flex flex-col shadow-xl">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-emerald-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
            <Tractor className="w-6 h-6 text-emerald-900" />
          </div>
          <span className="font-bold text-xl text-white">AgriTrack</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-900 shadow-lg shadow-emerald-500/25" 
                  : "text-emerald-100/80 hover:text-white hover:bg-emerald-700/50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-emerald-700/50 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-emerald-100/80 hover:text-white hover:bg-emerald-700/50 transition-all duration-200"
        >
          <Home className="w-5 h-5" />
          Home
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-emerald-100/80 hover:text-white hover:bg-emerald-700/50 transition-all duration-200"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
        <div className="mt-4 px-4 text-xs text-emerald-300/60">
          <p>SIH 2025 | v2.1</p>
        </div>
      </div>
    </aside>
  )
}

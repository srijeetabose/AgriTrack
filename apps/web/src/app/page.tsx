'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tractor, LayoutDashboard, User, LogIn, LogOut, Shield, Leaf, Brain, CalendarClock } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
  isGreenFarmer?: boolean;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth
    const storedUser = localStorage.getItem('agritrack_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('agritrack_user');
        localStorage.removeItem('agritrack_token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('agritrack_user');
    localStorage.removeItem('agritrack_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-400/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>

      <div className="max-w-4xl w-full relative z-10">
        {/* User Status Bar */}
        {user && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-4 mb-6 flex items-center justify-between border border-white/20">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${user.role === 'admin' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
                {user.role === 'admin' ? (
                  <Shield size={20} className="text-blue-300" />
                ) : (
                  <Leaf size={20} className="text-emerald-300" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-200/70 capitalize">{user.role}</span>
                  {user.isGreenFarmer && (
                    <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full">
                      🌱 Green Certified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-300 hover:text-red-200 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Tractor size={36} className="text-emerald-900" />
            </div>
            <h1 className="text-5xl font-bold text-white">AgriTrack</h1>
          </div>
          <p className="text-xl text-emerald-200">Smart Crop Residue Management</p>
          <p className="text-sm text-emerald-300/60 mt-2">भारत सरकार | Government of India</p>
        </div>

        {/* Login Button if not logged in */}
        {!user && (
          <div className="text-center mb-8">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-900 px-8 py-4 rounded-2xl font-bold hover:from-emerald-300 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/25 text-lg"
            >
              <LogIn size={22} />
              Sign In to Your Account
            </button>
          </div>
        )}

        {/* Portal Selection */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Portal */}
          <div
            onClick={() => router.push(user?.role === 'admin' ? '/dashboard' : '/login')}
            className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-8 hover:bg-white/15 transition-all cursor-pointer border border-white/20 hover:border-blue-400/50 group"
          >
            <div className="text-center">
              <div className="bg-blue-500/20 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                <LayoutDashboard size={40} className="text-blue-300" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
              <p className="text-blue-200/70 mb-4">प्रशासन पोर्टल</p>
              <ul className="text-sm text-emerald-100/70 text-left space-y-2 mb-6">
                <li>✅ Real-time Machine Monitoring</li>
                <li>✅ Fleet Management Dashboard</li>
                <li>✅ AI Analytics & Reports</li>
                <li>✅ Harvest Scheduling System</li>
              </ul>
              <div className="bg-blue-500/20 text-blue-200 py-3 px-6 rounded-xl font-semibold group-hover:bg-blue-500 group-hover:text-white transition-all">
                {user?.role === 'admin' ? 'Enter Dashboard →' : 'Login as Admin →'}
              </div>
            </div>
          </div>

          {/* Farmer Portal */}
          <div
            onClick={() => router.push(user?.role === 'farmer' ? '/farmer' : '/login')}
            className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-8 hover:bg-white/15 transition-all cursor-pointer border border-white/20 hover:border-emerald-400/50 group"
          >
            <div className="text-center">
              <div className="bg-emerald-500/20 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <User size={40} className="text-emerald-300" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Farmer Portal</h2>
              <p className="text-emerald-200/70 mb-4">किसान पोर्टल</p>
              <ul className="text-sm text-emerald-100/70 text-left space-y-2 mb-6">
                <li>✅ Book Machinery</li>
                <li>✅ Track Your Bookings</li>
                <li>✅ Mandi Prices & Rates</li>
                <li>✅ Work Verification with QR</li>
              </ul>
              <div className="bg-emerald-500/20 text-emerald-200 py-3 px-6 rounded-xl font-semibold group-hover:bg-emerald-500 group-hover:text-white transition-all">
                {user?.role === 'farmer' ? 'Enter Portal →' : 'Login as Farmer →'}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center border border-white/10">
            <CalendarClock size={24} className="text-emerald-400 mx-auto mb-2" />
            <h4 className="font-semibold text-white text-sm">Smart Scheduling</h4>
            <p className="text-xs text-emerald-200/60">AI-powered allocation</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center border border-white/10">
            <Brain size={24} className="text-teal-400 mx-auto mb-2" />
            <h4 className="font-semibold text-white text-sm">AI Analytics</h4>
            <p className="text-xs text-emerald-200/60">Predictive insights</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 text-center border border-white/10">
            <Leaf size={24} className="text-green-400 mx-auto mb-2" />
            <h4 className="font-semibold text-white text-sm">Eco-Friendly</h4>
            <p className="text-xs text-emerald-200/60">Reduce crop burning</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-emerald-300/60">
          <p>Smart India Hackathon 2025 | Problem ID: SIH25261</p>
          <p className="mt-1">🌾 Empowering farmers, monitoring machinery, preserving environment</p>
        </div>
      </div>
    </div>
  );
}

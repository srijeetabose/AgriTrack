'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Tractor, Lock, Phone, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+91 9999999999');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth data
      localStorage.setItem('agritrack_token', data.token);
      localStorage.setItem('agritrack_user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/farmer');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setPhone('+91 9999999999');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding with Background Image */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/assets/login-bg.jpg"
          alt="Farm background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-800/70 to-teal-900/80"></div>
        
        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Tractor className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AgriTrack</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Smart Crop Residue<br />Management System
          </h1>
          <p className="text-emerald-100 text-lg max-w-md">
            Real-time IoT monitoring, AI-powered scheduling, and sustainable farming solutions for a cleaner Punjab.
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 pt-4">
            {['IoT Tracking', 'AI Scheduling', 'Live Dashboard', 'SMS Alerts'].map((feature) => (
              <span key={feature} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20">
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-emerald-200 text-sm">
          <p>Smart India Hackathon 2025</p>
          <p className="text-emerald-300/60">Ministry of Agriculture & Farmers Welfare</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Tractor className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">AgriTrack</span>
            </div>
            <p className="text-gray-500 text-sm">Crop Residue Management Portal</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-gray-900"
                    placeholder="+91 9999999999"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-gray-900"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Button */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={fillDemo}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all text-sm"
              >
                Use Demo Credentials
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Demo: +91 9999999999 / admin123
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-1">
            <p className="text-sm text-gray-500">भारत सरकार | Government of India</p>
            <p className="text-xs text-gray-400">Smart India Hackathon 2025 • Team AgriTrack</p>
          </div>
        </div>
      </div>
    </div>
  );
}

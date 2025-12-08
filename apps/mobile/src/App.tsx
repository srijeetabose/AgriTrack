import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import MachinesPage from './pages/MachinesPage'
import MachineDetailPage from './pages/MachineDetailPage'
import BookingsPage from './pages/BookingsPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import MarketplacePage from './pages/MarketplacePage'
import GreenCertificatePage from './pages/GreenCertificatePage'
import { SocketProvider } from './context/SocketContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-large"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <>
      {!isOnline && (
        <div className="offline-banner">
          📡 You are offline
        </div>
      )}
      <Routes>
        {/* Public route */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="machines" element={<MachinesPage />} />
          <Route path="machines/:id" element={<MachineDetailPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="green-certificate" element={<GreenCertificatePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

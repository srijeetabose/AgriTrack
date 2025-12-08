import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Phone, Lock, Eye, EyeOff, AlertCircle, Info, User, MapPin, ArrowLeft, Navigation, Loader } from 'lucide-react';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Demo credentials for easy testing
const DEMO_CREDENTIALS = [
  { phone: '7980638514', pin: '1234', name: 'Srijbasu (Your Account)' },
  { phone: '9876543210', pin: '1234', name: 'Gurpreet Singh (Green ✓)' },
  { phone: '9123456789', pin: '5678', name: 'Rajender Kumar' },
  { phone: '8765432109', pin: '4321', name: 'Harjinder Kaur (Green ✓)' },
];

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Get GPS location and reverse geocode to get address
  const getLocationAndFill = async () => {
    setLocationLoading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('GPS not supported on this device');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'AgriTrack-App'
              }
            }
          );
          
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            
            // Extract village/town/city
            const villageValue = addr.village || addr.town || addr.city || addr.suburb || addr.hamlet || '';
            if (villageValue) setVillage(villageValue);
            
            // Extract district
            const districtValue = addr.county || addr.state_district || addr.district || '';
            if (districtValue) setDistrict(districtValue);
            
            // Extract state
            const stateValue = addr.state || '';
            if (stateValue) setState(stateValue);
            
            setSuccess('📍 Location detected successfully!');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            setLocationError('Could not detect location details');
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          setLocationError('Failed to get address from location');
        }
        
        setLocationLoading(false);
      },
      (err) => {
        console.error('GPS error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable GPS.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable. Please try again.');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('Failed to get location');
        }
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!phone || !pin) {
      setError('Please enter phone number and PIN');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    
    const result = await login(phone, pin);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone || !pin || !name) {
      setError('Phone, PIN, and Name are required');
      return;
    }

    if (phone.replace(/\D/g, '').length !== 10) {
      setError('Phone must be 10 digits');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/farmer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          pin,
          name,
          village,
          district,
          state,
          farm_size: farmSize ? parseFloat(farmSize) : 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess('Registration successful! Logging you in...');
      
      // Auto-login after registration
      setTimeout(async () => {
        const result = await login(phone, pin);
        if (result.success) {
          navigate('/');
        } else {
          setMode('login');
          setSuccess('Registration complete! Please login.');
        }
      }, 1000);

    } catch (err) {
      setError('Network error. Please try again.');
    }
    
    setLoading(false);
  };

  const fillDemoCredentials = (demo: typeof DEMO_CREDENTIALS[0]) => {
    setPhone(demo.phone);
    setPin(demo.pin);
    setShowDemo(false);
    setError('');
  };

  const switchToRegister = () => {
    setMode('register');
    setError('');
    setSuccess('');
  };

  const switchToLogin = () => {
    setMode('login');
    setError('');
    setSuccess('');
  };

  // Registration Form
  if (mode === 'register') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <button className="back-btn-login" onClick={switchToLogin}>
              <ArrowLeft size={24} />
            </button>
            <div className="logo">
              <Leaf size={48} className="logo-icon" />
              <h1>AgriTrack</h1>
            </div>
            <p className="tagline">New Farmer Registration</p>
            <p className="subtitle">नया किसान पंजीकरण</p>
          </div>

          <form onSubmit={handleRegister} className="login-form">
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="success-message">
                <span>✓ {success}</span>
              </div>
            )}

            <div className="input-group">
              <label><User size={18} /> Full Name *</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label><Phone size={18} /> Mobile Number *</label>
              <input
                type="tel"
                placeholder="10 digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label><Lock size={18} /> Create 4-Digit PIN *</label>
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label><Lock size={18} /> Confirm PIN *</label>
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                disabled={loading}
              />
            </div>

            {/* GPS Location Button */}
            <div className="location-section">
              <button 
                type="button" 
                className="gps-btn"
                onClick={getLocationAndFill}
                disabled={locationLoading || loading}
              >
                {locationLoading ? (
                  <>
                    <Loader size={18} className="spin" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <Navigation size={18} />
                    📍 Auto-fill from GPS Location
                  </>
                )}
              </button>
              {locationError && (
                <p className="location-error">{locationError}</p>
              )}
            </div>

            <div className="input-group">
              <label><MapPin size={18} /> Village</label>
              <input
                type="text"
                placeholder="Your village name"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-row">
              <div className="input-group half">
                <label>District</label>
                <input
                  type="text"
                  placeholder="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="input-group half">
                <label>State</label>
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label>🌾 Farm Size (hectares)</label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value)}
                disabled={loading}
                step="0.5"
                min="0"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="loading-spinner"></span> : 'Register / पंजीकरण करें'}
            </button>
          </form>

          <div className="switch-mode">
            <p>Already have an account?</p>
            <button onClick={switchToLogin}>Login here</button>
          </div>
        </div>
      </div>
    );
  }

  // Login Form
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo">
            <Leaf size={48} className="logo-icon" />
            <h1>AgriTrack</h1>
          </div>
          <p className="tagline">Smart Crop Residue Management</p>
          <p className="subtitle">किसान लॉगिन | Farmer Login</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="success-message">
              <span>✓ {success}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="phone">
              <Phone size={18} />
              Mobile Number
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="10 digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="pin">
              <Lock size={18} />
              4-Digit PIN
            </label>
            <div className="pin-input-wrapper">
              <input
                id="pin"
                type={showPin ? 'text' : 'password'}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-pin"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="loading-spinner"></span> : 'Login / लॉगिन'}
          </button>
        </form>

        {/* New Farmer Registration */}
        <div className="switch-mode">
          <p>New farmer? नए किसान?</p>
          <button onClick={switchToRegister}>Register here / यहाँ पंजीकरण करें</button>
        </div>

        {/* Demo Credentials */}
        <div className="demo-section">
          <button className="demo-toggle" onClick={() => setShowDemo(!showDemo)}>
            <Info size={16} />
            Demo Credentials (Testing)
          </button>
          
          {showDemo && (
            <div className="demo-list">
              {DEMO_CREDENTIALS.map((demo, index) => (
                <button
                  key={index}
                  className="demo-item"
                  onClick={() => fillDemoCredentials(demo)}
                >
                  <span className="demo-name">{demo.name}</span>
                  <span className="demo-phone">{demo.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>Smart India Hackathon 2025</p>
          <p className="problem-code">Problem Code: SIH25261</p>
        </div>
      </div>
    </div>
  );
}

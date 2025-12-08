import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Phone, Lock, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import './LoginPage.css';

// Demo credentials for easy testing
const DEMO_CREDENTIALS = [
  { phone: '+919876543210', pin: '1234', name: 'Gurpreet Singh (Green ✓)' },
  { phone: '+919123456789', pin: '5678', name: 'Rajender Kumar' },
  { phone: '+918765432109', pin: '4321', name: 'Harjinder Kaur (Green ✓)' },
];

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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

  const fillDemoCredentials = (demo: typeof DEMO_CREDENTIALS[0]) => {
    setPhone(demo.phone);
    setPin(demo.pin);
    setShowDemo(false);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo Header */}
        <div className="login-header">
          <div className="logo">
            <Leaf size={48} className="logo-icon" />
            <h1>AgriTrack</h1>
          </div>
          <p className="tagline">Smart Crop Residue Management</p>
          <p className="subtitle">किसान लॉगिन | Farmer Login</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
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
              placeholder="+91 98765 43210"
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
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              'Login / लॉगिन'
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="demo-section">
          <button 
            className="demo-toggle"
            onClick={() => setShowDemo(!showDemo)}
          >
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

        {/* Footer */}
        <div className="login-footer">
          <p>Smart India Hackathon 2025</p>
          <p className="problem-code">Problem Code: SIH25261</p>
        </div>
      </div>
    </div>
  );
}

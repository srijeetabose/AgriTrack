import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Award, 
  CheckCircle, 
  XCircle,
  Download,
  Share2,
  Leaf,
  MapPin,
  Star,
  TrendingUp,
  ShieldCheck,
  Gift
} from 'lucide-react';
import './GreenCertificatePage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface Certificate {
  certificate_id: string;
  farmer_name: string;
  farmer_id: string;
  district: string;
  state: string;
  village: string;
  farm_size: number;
  green_credits: number;
  certification_date: string;
  valid_until: string;
  achievements: Array<{
    title: string;
    description: string;
  }>;
  benefits: string[];
  qr_verification_url: string;
}

export default function GreenCertificatePage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCertificate();
  }, []);

  const fetchCertificate = async () => {
    if (!user?.id || !token) return;

    try {
      const response = await fetch(`${API_URL}/auth/farmer/${user.id}/green-certificate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Not eligible for certificate');
        return;
      }

      setCertificate(data);
    } catch (err) {
      setError('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!certificate) return;

    const shareText = `🌿 I'm a Green Certified Farmer!\n\nCertificate ID: ${certificate.certificate_id}\nEarned ${certificate.green_credits} Green Credits\n\nJoin AgriTrack and help prevent stubble burning! 🌾`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AgriTrack Green Certificate',
          text: shareText
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="certificate-page">
        <div className="loading-container">
          <Leaf className="spinner" size={40} />
          <p>Loading certificate...</p>
        </div>
      </div>
    );
  }

  // Not certified view
  if (!user?.green_certified || error) {
    return (
      <div className="certificate-page">
        <div className="not-certified">
          <div className="not-certified-icon">
            <XCircle size={64} />
          </div>
          <h1>Not Yet Certified</h1>
          <p>Complete the following to earn your Green Certificate:</p>
          
          <div className="requirements-list">
            <div className="requirement-item">
              <div className="req-icon pending">1</div>
              <div className="req-content">
                <h4>Accept Harvest Schedule</h4>
                <p>Follow the dynamic harvest window assigned to you</p>
              </div>
            </div>
            <div className="requirement-item">
              <div className="req-icon pending">2</div>
              <div className="req-content">
                <h4>Complete Harvest On Time</h4>
                <p>Use CRM machinery during your assigned window</p>
              </div>
            </div>
            <div className="requirement-item">
              <div className="req-icon pending">3</div>
              <div className="req-content">
                <h4>No Stubble Burning</h4>
                <p>Verified by satellite imagery or field visit</p>
              </div>
            </div>
          </div>

          <div className="credits-progress">
            <h3>Your Progress</h3>
            <div className="credits-bar">
              <div 
                className="credits-fill" 
                style={{ width: `${Math.min(100, ((user?.green_credits || 0) / 100) * 100)}%` }}
              ></div>
            </div>
            <div className="credits-info">
              <span>{user?.green_credits || 0} / 100 credits needed</span>
            </div>
          </div>

          <button className="schedule-btn" onClick={() => navigate('/')}>
            View My Harvest Schedule
          </button>
        </div>
      </div>
    );
  }

  // Certified view
  return (
    <div className="certificate-page">
      {/* Certificate Card */}
      <div className="certificate-card">
        <div className="cert-header">
          <div className="cert-badge">
            <Award size={48} />
          </div>
          <h1>Green Certificate</h1>
          <p className="cert-subtitle">हरित प्रमाण पत्र</p>
        </div>

        <div className="cert-body">
          <div className="cert-farmer">
            <p className="farmer-label">This is to certify that</p>
            <h2 className="farmer-name">{certificate?.farmer_name}</h2>
            <p className="farmer-location">
              <MapPin size={14} />
              {certificate?.village}, {certificate?.district}, {certificate?.state}
            </p>
          </div>

          <div className="cert-details">
            <div className="cert-detail-item">
              <span className="detail-label">Certificate ID</span>
              <span className="detail-value">{certificate?.certificate_id}</span>
            </div>
            <div className="cert-detail-item">
              <span className="detail-label">Farm Size</span>
              <span className="detail-value">{certificate?.farm_size} hectares</span>
            </div>
            <div className="cert-detail-item">
              <span className="detail-label">Issued On</span>
              <span className="detail-value">
                {new Date(certificate?.certification_date || '').toLocaleDateString('en-IN')}
              </span>
            </div>
            <div className="cert-detail-item">
              <span className="detail-label">Valid Until</span>
              <span className="detail-value">
                {new Date(certificate?.valid_until || '').toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>

          <div className="cert-credits">
            <Star size={20} />
            <span className="credits-value">{certificate?.green_credits}</span>
            <span className="credits-label">Green Credits Earned</span>
          </div>
        </div>

        <div className="cert-footer">
          <div className="cert-stamp">
            <ShieldCheck size={32} />
            <span>Verified</span>
          </div>
          <p className="cert-org">
            AgriTrack • Smart India Hackathon 2025
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="cert-actions">
        <button className="action-btn share" onClick={handleShare}>
          <Share2 size={20} />
          Share
        </button>
        <button className="action-btn download">
          <Download size={20} />
          Download PDF
        </button>
      </div>

      {/* Achievements */}
      <section className="achievements-section">
        <h2>🏆 Your Achievements</h2>
        <div className="achievements-list">
          {certificate?.achievements.map((achievement, index) => (
            <div key={index} className="achievement-item">
              <CheckCircle size={24} className="achievement-icon" />
              <div>
                <h4>{achievement.title}</h4>
                <p>{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits-section">
        <h2>🎁 Your Benefits</h2>
        <div className="benefits-list">
          {certificate?.benefits.map((benefit, index) => (
            <div key={index} className="benefit-card">
              <Gift size={20} />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section className="impact-section">
        <h2>🌍 Your Impact</h2>
        <div className="impact-grid">
          <div className="impact-item">
            <TrendingUp size={28} />
            <span className="impact-value">0 kg</span>
            <span className="impact-label">CO2 Prevented</span>
          </div>
          <div className="impact-item">
            <Leaf size={28} />
            <span className="impact-value">{certificate?.farm_size || 0}</span>
            <span className="impact-label">Hectares Protected</span>
          </div>
        </div>
        <p className="impact-note">
          By following the harvest schedule and avoiding stubble burning, you're helping keep the air clean for millions!
        </p>
      </section>
    </div>
  );
}

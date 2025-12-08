import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Award, 
  ShoppingBag,
  Calculator,
  Users,
  ChevronRight,
  Star,
  Leaf
} from 'lucide-react';
import './MarketplacePage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface CropPrice {
  id: string;
  name: string;
  nameHindi: string;
  unit: string;
  msp: number;
  prices: Array<{
    mandi: string;
    state: string;
    min: number;
    max: number;
    modal: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  greenBonus: number;
}

interface Buyer {
  id: string;
  name: string;
  type: string;
  crops: string[];
  premiumPercent: number;
  minQuantity: number;
  verified: boolean;
}

interface MarketSummary {
  totalCrops: number;
  totalMandis: number;
  premiumBuyersCount: number;
  trends: {
    rising: number;
    stable: number;
    falling: number;
  };
  greenBenefits: {
    avgBonusPercent: number;
    maxBuyerPremium: number;
  };
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [crops, setCrops] = useState<CropPrice[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<CropPrice | null>(null);
  const [quantity, setQuantity] = useState('10');
  const [earnings, setEarnings] = useState<any>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const [pricesRes, buyersRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/mandi/prices`),
        fetch(`${API_URL}/mandi/buyers`),
        fetch(`${API_URL}/mandi/summary`)
      ]);

      const pricesData = await pricesRes.json();
      const buyersData = await buyersRes.json();
      const summaryData = await summaryRes.json();

      if (pricesData.success) setCrops(pricesData.crops);
      if (buyersData.success) setBuyers(buyersData.buyers);
      if (summaryData.success) setSummary(summaryData.summary);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEarnings = async () => {
    if (!selectedCrop || !quantity) return;

    try {
      const response = await fetch(`${API_URL}/mandi/calculate-earnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropId: selectedCrop.id,
          quantity: parseFloat(quantity),
          isGreenCertified: user?.green_certified || false
        })
      });

      const data = await response.json();
      if (data.success) {
        setEarnings(data.calculation);
      }
    } catch (error) {
      console.error('Failed to calculate earnings:', error);
    }
  };

  useEffect(() => {
    if (selectedCrop && quantity) {
      calculateEarnings();
    }
  }, [selectedCrop, quantity]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />;
    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />;
    return <Minus size={16} className="trend-stable" />;
  };

  const getAvgPrice = (crop: CropPrice) => {
    return Math.round(crop.prices.reduce((sum, p) => sum + p.modal, 0) / crop.prices.length);
  };

  if (loading) {
    return (
      <div className="marketplace-page">
        <div className="loading-container">
          <RefreshCw className="spinner" size={32} />
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-page">
      {/* Header */}
      <div className="marketplace-header">
        <h1>🌾 Mandi Prices</h1>
        <p>Live crop rates • {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {/* Green Certified Banner */}
      {user?.green_certified && (
        <div className="green-banner">
          <div className="green-banner-content">
            <Award size={24} />
            <div>
              <h3>Green Certified Farmer</h3>
              <p>You get up to {summary?.greenBenefits?.maxBuyerPremium}% extra on sales!</p>
            </div>
          </div>
        </div>
      )}

      {!user?.green_certified && (
        <div className="upgrade-banner">
          <Leaf size={20} />
          <span>Get Green Certified to earn 5-12% bonus on sales!</span>
          <ChevronRight size={18} />
        </div>
      )}

      {/* Market Summary */}
      <div className="market-summary">
        <div className="summary-item">
          <span className="summary-value">{summary?.totalCrops || 0}</span>
          <span className="summary-label">Crops</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{summary?.totalMandis || 0}</span>
          <span className="summary-label">Mandis</span>
        </div>
        <div className="summary-item rising">
          <span className="summary-value">↑ {summary?.trends?.rising || 0}</span>
          <span className="summary-label">Rising</span>
        </div>
        <div className="summary-item falling">
          <span className="summary-value">↓ {summary?.trends?.falling || 0}</span>
          <span className="summary-label">Falling</span>
        </div>
      </div>

      {/* Crop Prices */}
      <section className="prices-section">
        <h2>Today's Rates</h2>
        <div className="crop-list">
          {crops.map(crop => (
            <div 
              key={crop.id} 
              className={`crop-card ${selectedCrop?.id === crop.id ? 'selected' : ''}`}
              onClick={() => setSelectedCrop(crop)}
            >
              <div className="crop-header">
                <div className="crop-name">
                  <h3>{crop.name}</h3>
                  <span className="crop-hindi">{crop.nameHindi}</span>
                </div>
                <div className={`trend-badge ${crop.trend}`}>
                  {getTrendIcon(crop.trend)}
                  <span>{crop.trendPercent > 0 ? '+' : ''}{crop.trendPercent}%</span>
                </div>
              </div>
              
              <div className="crop-price">
                <span className="price-value">₹{getAvgPrice(crop)}</span>
                <span className="price-unit">/{crop.unit}</span>
              </div>
              
              <div className="crop-meta">
                <span className="msp">MSP: ₹{crop.msp}</span>
                {user?.green_certified && (
                  <span className="green-bonus">+{crop.greenBonus}% Green Bonus</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings Calculator */}
      {selectedCrop && (
        <section className="calculator-section">
          <h2><Calculator size={20} /> Earnings Calculator</h2>
          <div className="calculator-card">
            <div className="calc-crop">
              <span>Selected:</span>
              <strong>{selectedCrop.name}</strong>
            </div>
            
            <div className="calc-input">
              <label>Quantity ({selectedCrop.unit}s)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>

            {earnings && (
              <div className="earnings-result">
                <div className="earnings-row">
                  <span>Base Price ({earnings.quantity} × ₹{earnings.avgPrice})</span>
                  <span>₹{earnings.baseEarnings.toLocaleString()}</span>
                </div>
                
                {earnings.greenBonus > 0 && (
                  <div className="earnings-row bonus">
                    <span>🌿 Green Bonus (+{earnings.greenBonusPercent}%)</span>
                    <span className="bonus-amount">+₹{earnings.greenBonus.toLocaleString()}</span>
                  </div>
                )}

                <div className="earnings-total">
                  <span>Total Earnings</span>
                  <span className="total-value">₹{earnings.totalEarnings.toLocaleString()}</span>
                </div>

                {earnings.mspComparison?.aboveMsp && (
                  <div className="msp-comparison">
                    <Star size={16} />
                    <span>₹{earnings.mspComparison.difference.toLocaleString()} above MSP!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Premium Buyers */}
      {user?.green_certified && (
        <section className="buyers-section">
          <h2><Users size={20} /> Premium Buyers for You</h2>
          <p className="buyers-subtitle">Direct connections with verified buyers offering premium prices</p>
          
          <div className="buyers-list">
            {buyers.map(buyer => (
              <div key={buyer.id} className="buyer-card">
                <div className="buyer-header">
                  <h3>{buyer.name}</h3>
                  {buyer.verified && <span className="verified-badge">✓ Verified</span>}
                </div>
                <div className="buyer-meta">
                  <span className="buyer-type">{buyer.type}</span>
                  <span className="buyer-premium">+{buyer.premiumPercent}% Premium</span>
                </div>
                <div className="buyer-crops">
                  {buyer.crops.map((cropId, i) => {
                    const crop = crops.find(c => c.id === cropId);
                    return crop ? (
                      <span key={i} className="crop-tag">{crop.name}</span>
                    ) : null;
                  })}
                </div>
                <div className="buyer-min">Min: {buyer.minQuantity} quintals</div>
                <button className="contact-btn">
                  <ShoppingBag size={16} />
                  Connect
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2>🎁 Green Certified Benefits</h2>
        <div className="benefits-list">
          <div className="benefit-item">
            <div className="benefit-icon">💰</div>
            <div>
              <h4>5-12% Bonus on Sales</h4>
              <p>Earn extra on every sale through AgriTrack</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🤝</div>
            <div>
              <h4>Premium Buyer Access</h4>
              <p>Connect directly with verified buyers</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">⚡</div>
            <div>
              <h4>Priority Booking</h4>
              <p>Get machines first during peak season</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🏆</div>
            <div>
              <h4>Government Subsidies</h4>
              <p>Eligible for eco-farming incentives</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

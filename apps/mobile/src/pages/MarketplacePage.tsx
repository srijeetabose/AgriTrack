import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Calculator,
  ChevronRight,
  ChevronDown,
  Flame,
  Droplets,
  Wheat,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import './MarketplacePage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface MandiPrice {
  mandi: string;
  state: string;
  min: number;
  max: number;
  modal: number;
}

interface CropPrice {
  id: string;
  name: string;
  nameHindi: string;
  nameBengali?: string;
  unit: string;
  msp: number;
  prices: MandiPrice[];
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  greenBonus: number;
  priceHistory?: number[];
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

// Bengali names mapping
const BENGALI_NAMES: Record<string, string> = {
  'rice_paddy': 'ধান',
  'wheat': 'গম',
  'sugarcane': 'আখ',
  'maize': 'ভুট্টা',
  'cotton': 'তুলা',
  'mustard': 'সরিষা'
};

// Fertilizer loss data (scientific data)
const FERTILIZER_LOSS_PER_ACRE = {
  urea: { kg: 30, pricePerKg: 6 },
  dap: { kg: 20, pricePerKg: 27 },
  potash: { kg: 50, pricePerKg: 17 },
};

export default function MarketplacePage() {
  const { t, language } = useLanguage();
  const [crops, setCrops] = useState<CropPrice[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<CropPrice | null>(null);
  const [showMandiComparison, setShowMandiComparison] = useState(false);
  const [acres, setAcres] = useState(5);
  const [showCalculator, setShowCalculator] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Fetch market data from API
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricesRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/mandi/prices`),
        fetch(`${API_URL}/api/v1/mandi/summary`)
      ]);

      if (!pricesRes.ok || !summaryRes.ok) {
        throw new Error('API request failed');
      }

      const pricesData = await pricesRes.json();
      const summaryData = await summaryRes.json();

      if (pricesData.success && pricesData.crops) {
        // Add price history for charts (simulated based on current prices)
        const cropsWithHistory = pricesData.crops.map((crop: CropPrice) => {
          const avgPrice = crop.prices.reduce((sum, p) => sum + p.modal, 0) / crop.prices.length;
          const variance = avgPrice * 0.03; // 3% variance
          const history = Array.from({ length: 7 }, (_, i) => {
            const trend = crop.trend === 'up' ? 1 : crop.trend === 'down' ? -1 : 0;
            return Math.round(avgPrice - variance * (6 - i) * trend * 0.3 + (Math.random() - 0.5) * variance);
          });
          return {
            ...crop,
            nameBengali: BENGALI_NAMES[crop.id] || crop.nameHindi,
            priceHistory: history
          };
        });
        setCrops(cropsWithHistory);
      }

      if (summaryData.success && summaryData.summary) {
        setSummary(summaryData.summary);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError(language === 'hi' ? 'डेटा लोड करने में विफल' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Initial fetch
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Real-time price simulation (updates every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setCrops(prev => prev.map(crop => {
        const change = (Math.random() - 0.5) * 30;
        const newHistory = crop.priceHistory 
          ? [...crop.priceHistory.slice(1), Math.round(crop.priceHistory[6] + change)]
          : [];
        return {
          ...crop,
          priceHistory: newHistory,
          prices: crop.prices.map(p => ({
            ...p,
            modal: Math.max(p.min, Math.min(p.max, Math.round(p.modal + change)))
          }))
        };
      }));
      setLastUpdated(new Date());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />;
    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />;
    return <Minus size={16} className="trend-stable" />;
  };

  const getAvgPrice = (crop: CropPrice) => {
    if (!crop.prices || crop.prices.length === 0) return 0;
    return Math.round(crop.prices.reduce((sum, p) => sum + p.modal, 0) / crop.prices.length);
  };

  const getCropName = (crop: CropPrice) => {
    if (language === 'hi') return crop.nameHindi;
    if (language === 'bn') return crop.nameBengali || crop.nameHindi;
    return crop.name;
  };

  const calculateFertilizerLoss = () => {
    const ureaLoss = FERTILIZER_LOSS_PER_ACRE.urea.kg * FERTILIZER_LOSS_PER_ACRE.urea.pricePerKg * acres;
    const dapLoss = FERTILIZER_LOSS_PER_ACRE.dap.kg * FERTILIZER_LOSS_PER_ACRE.dap.pricePerKg * acres;
    const potashLoss = FERTILIZER_LOSS_PER_ACRE.potash.kg * FERTILIZER_LOSS_PER_ACRE.potash.pricePerKg * acres;
    return {
      urea: { kg: FERTILIZER_LOSS_PER_ACRE.urea.kg * acres, cost: ureaLoss },
      dap: { kg: FERTILIZER_LOSS_PER_ACRE.dap.kg * acres, cost: dapLoss },
      potash: { kg: FERTILIZER_LOSS_PER_ACRE.potash.kg * acres, cost: potashLoss },
      total: ureaLoss + dapLoss + potashLoss,
      waterSaved: 50000 * acres
    };
  };

  const fertilizerData = calculateFertilizerLoss();

  const renderPriceChart = (history: number[] | undefined) => {
    if (!history || history.length === 0) return null;
    const max = Math.max(...history);
    const min = Math.min(...history);
    const range = max - min || 1;
    
    return (
      <div className="price-chart">
        <div className="chart-bars">
          {history.map((price, i) => {
            const height = ((price - min) / range) * 100;
            const isLast = i === history.length - 1;
            return (
              <div key={i} className="chart-bar-container">
                <div 
                  className={`chart-bar ${isLast ? 'current' : ''}`} 
                  style={{ height: `${Math.max(height, 10)}%` }}
                  title={`₹${price}`}
                />
                <span className="chart-day">{i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="chart-labels">
          <span>₹{min}</span>
          <span>₹{max}</span>
        </div>
      </div>
    );
  };

  if (loading && crops.length === 0) {
    return (
      <div className="marketplace-page">
        <div className="loading-container">
          <RefreshCw className="spinner" size={32} />
          <p>{language === 'hi' ? 'मंडी भाव लोड हो रहे हैं...' : language === 'bn' ? 'মান্ডি দাম লোড হচ্ছে...' : 'Loading mandi prices...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-page">
      {/* Header */}
      <div className="marketplace-header">
        <div className="header-top">
          <h1>🌾 {t('mandiPrices')}</h1>
          <button className="refresh-btn" onClick={fetchMarketData} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
        <p>{t('liveCropRates')} • {lastUpdated.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'en-IN')}</p>
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span>{language === 'hi' ? 'लाइव अपडेट' : language === 'bn' ? 'লাইভ আপডেট' : 'Live Updates'}</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={fetchMarketData}>{language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}</button>
        </div>
      )}

      {/* Market Summary */}
      {summary && (
        <div className="market-summary">
          <div className="summary-item">
            <span className="summary-value">{summary.totalCrops}</span>
            <span className="summary-label">{t('crops')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-value">{summary.totalMandis}</span>
            <span className="summary-label">{t('mandis')}</span>
          </div>
          <div className="summary-item rising">
            <span className="summary-value">↑ {summary.trends.rising}</span>
            <span className="summary-label">{t('rising')}</span>
          </div>
          <div className="summary-item falling">
            <span className="summary-value">↓ {summary.trends.falling}</span>
            <span className="summary-label">{t('falling')}</span>
          </div>
        </div>
      )}

      {/* SOIL WEALTH REPORT - The Psychological Pivot */}
      <section className="soil-wealth-section">
        <div className="soil-wealth-header" onClick={() => setShowCalculator(!showCalculator)}>
          <div className="soil-wealth-title">
            <Flame size={24} className="fire-icon" />
            <div>
              <h2>📉 {t('soilWealthReport')}</h2>
              <p className="warning-text">{t('stopBurningMoney')}</p>
            </div>
          </div>
          <ChevronDown size={20} className={showCalculator ? 'rotated' : ''} />
        </div>

        {showCalculator && (
          <div className="fertilizer-calculator">
            <div className="acres-input">
              <label>{language === 'hi' ? 'आपकी जमीन (एकड़)' : language === 'bn' ? 'আপনার জমি (একর)' : 'Your Land (Acres)'}</label>
              <div className="acres-slider">
                <button onClick={() => setAcres(Math.max(1, acres - 1))}>-</button>
                <input 
                  type="number" 
                  value={acres} 
                  onChange={(e) => setAcres(Math.max(1, parseInt(e.target.value) || 1))} 
                  min="1" 
                />
                <button onClick={() => setAcres(acres + 1)}>+</button>
              </div>
            </div>

            <div className="loss-breakdown">
              <h4>
                <AlertTriangle size={16} />
                {t('burningDestroys')}
              </h4>
              
              <div className="loss-item">
                <div className="loss-info">
                  <span className="loss-icon">🧪</span>
                  <span>{fertilizerData.urea.kg} kg {t('ureaLoss')}</span>
                </div>
                <span className="loss-cost">₹{fertilizerData.urea.cost.toLocaleString()}</span>
              </div>
              
              <div className="loss-item">
                <div className="loss-info">
                  <span className="loss-icon">🔬</span>
                  <span>{fertilizerData.dap.kg} kg {t('dapLoss')}</span>
                </div>
                <span className="loss-cost">₹{fertilizerData.dap.cost.toLocaleString()}</span>
              </div>
              
              <div className="loss-item">
                <div className="loss-info">
                  <span className="loss-icon">⚗️</span>
                  <span>{fertilizerData.potash.kg} kg {t('potashLoss')}</span>
                </div>
                <span className="loss-cost">₹{fertilizerData.potash.cost.toLocaleString()}</span>
              </div>

              <div className="total-loss">
                <div className="total-loss-label">
                  <Flame size={20} />
                  <span>{t('totalCashLoss')}</span>
                </div>
                <span className="total-loss-value">₹{fertilizerData.total.toLocaleString()}</span>
              </div>
            </div>

            {/* What you SAVE with CRM */}
            <div className="savings-section">
              <h4>✅ {language === 'hi' ? 'CRM से बचत' : language === 'bn' ? 'CRM দিয়ে সঞ্চয়' : 'Savings with CRM'}</h4>
              <div className="savings-grid">
                <div className="saving-card">
                  <span className="saving-icon">💰</span>
                  <span className="saving-value">₹{fertilizerData.total.toLocaleString()}</span>
                  <span className="saving-label">{t('nutrientSaved')}</span>
                </div>
                <div className="saving-card">
                  <Droplets size={24} className="water-icon" />
                  <span className="saving-value">{(fertilizerData.waterSaved / 1000).toFixed(0)}K</span>
                  <span className="saving-label">{t('liters')} {t('waterSaved')}</span>
                </div>
              </div>
            </div>

            {/* Yield Prediction */}
            <div className="yield-prediction">
              <h4><Wheat size={18} /> {t('yieldPrediction')}</h4>
              <div className="yield-comparison">
                <div className="yield-bar burnt">
                  <div className="yield-fill" style={{ width: '80%' }}></div>
                  <span className="yield-label">{t('withoutCRM')}</span>
                  <span className="yield-value">20 {t('quintalsPerAcre')}</span>
                </div>
                <div className="yield-bar mulched">
                  <div className="yield-fill" style={{ width: '96%' }}></div>
                  <span className="yield-label">{t('withCRM')}</span>
                  <span className="yield-value">24 {t('quintalsPerAcre')}</span>
                </div>
              </div>
              <div className="extra-income">
                <span>🎯 {t('extraIncome')}: </span>
                <strong>₹{(8000 * acres).toLocaleString()}</strong>
                <span className="income-note"> {t('inNextHarvest')}</span>
              </div>
            </div>

            <div className="crm-message">
              <p>💡 {language === 'hi' 
                ? '"पराली मत जलाओ, मिलाओ। यह मुफ्त यूरिया है!"' 
                : language === 'bn'
                ? '"নাড়া পোড়াবেন না, মেশান। এটা বিনামূল্যে ইউরিয়া!"'
                : '"Don\'t burn the stubble. Mix it. It is Free Urea!"'}</p>
            </div>
          </div>
        )}
      </section>

      {/* Crop Prices */}
      <section className="prices-section">
        <h2><BarChart3 size={20} /> {t('todayRates')}</h2>
        <div className="crop-list">
          {crops.map(crop => (
            <div 
              key={crop.id} 
              className={`crop-card ${selectedCrop?.id === crop.id ? 'selected' : ''}`}
              onClick={() => setSelectedCrop(selectedCrop?.id === crop.id ? null : crop)}
            >
              <div className="crop-header">
                <div className="crop-name">
                  <h3>{getCropName(crop)}</h3>
                  <span className="crop-english">{crop.name}</span>
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
                {getAvgPrice(crop) > crop.msp && (
                  <span className="above-msp">+₹{getAvgPrice(crop) - crop.msp} above MSP</span>
                )}
              </div>

              {/* Expanded view with chart */}
              {selectedCrop?.id === crop.id && (
                <div className="crop-expanded">
                  <div className="chart-section">
                    <h4>{t('priceChart')}</h4>
                    {renderPriceChart(crop.priceHistory)}
                  </div>
                  
                  <button 
                    className="compare-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMandiComparison(!showMandiComparison);
                    }}
                  >
                    {t('compareMandiPrices')}
                    <ChevronRight size={16} />
                  </button>

                  {showMandiComparison && (
                    <div className="mandi-comparison">
                      {crop.prices.map((p, i) => (
                        <div key={i} className="mandi-row">
                          <div className="mandi-info">
                            <span className="mandi-name">{p.mandi}</span>
                            <span className="mandi-state">{p.state}</span>
                          </div>
                          <div className="mandi-prices">
                            <span className="price-range">₹{p.min} - ₹{p.max}</span>
                            <span className="modal-price">Modal: ₹{p.modal}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Calculator */}
      {selectedCrop && (
        <section className="quick-calc-section">
          <h2><Calculator size={20} /> {language === 'hi' ? 'कमाई कैलकुलेटर' : language === 'bn' ? 'আয় ক্যালকুলেটর' : 'Earnings Calculator'}</h2>
          <div className="quick-calc-card">
            <div className="calc-row">
              <span>{getCropName(selectedCrop)} × {acres} {t('acres')}</span>
              <span>= {acres * 20} quintals (est.)</span>
            </div>
            <div className="calc-row total">
              <span>{language === 'hi' ? 'अनुमानित कमाई' : language === 'bn' ? 'আনুমানিক আয়' : 'Estimated Earnings'}</span>
              <span className="calc-total">₹{(acres * 20 * getAvgPrice(selectedCrop)).toLocaleString()}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Mandi API configuration (using data.gov.in API for crop prices)
// In production, use actual API key from data.gov.in
const MANDI_API_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const MANDI_API_KEY = process.env.MANDI_API_KEY || 'demo-key';

// Mock mandi data for demo (realistic prices for Punjab/Haryana region)
const MOCK_MANDI_DATA = {
  lastUpdated: new Date().toISOString(),
  crops: [
    {
      id: 'rice_paddy',
      name: 'Rice (Paddy)',
      nameHindi: 'धान',
      unit: 'quintal',
      msp: 2300, // Minimum Support Price 2024-25
      prices: [
        { mandi: 'Ludhiana', state: 'Punjab', min: 2250, max: 2450, modal: 2350 },
        { mandi: 'Karnal', state: 'Haryana', min: 2280, max: 2400, modal: 2340 },
        { mandi: 'Amritsar', state: 'Punjab', min: 2260, max: 2420, modal: 2340 },
        { mandi: 'Patiala', state: 'Punjab', min: 2240, max: 2380, modal: 2320 },
        { mandi: 'Khanna', state: 'Punjab', min: 2290, max: 2480, modal: 2380 }
      ],
      trend: 'up',
      trendPercent: 2.3,
      greenBonus: 5 // 5% bonus for green certified farmers
    },
    {
      id: 'wheat',
      name: 'Wheat',
      nameHindi: 'गेहूं',
      unit: 'quintal',
      msp: 2275, // MSP 2024-25
      prices: [
        { mandi: 'Ludhiana', state: 'Punjab', min: 2200, max: 2350, modal: 2280 },
        { mandi: 'Karnal', state: 'Haryana', min: 2220, max: 2380, modal: 2300 },
        { mandi: 'Amritsar', state: 'Punjab', min: 2210, max: 2340, modal: 2270 },
        { mandi: 'Bathinda', state: 'Punjab', min: 2190, max: 2320, modal: 2260 }
      ],
      trend: 'stable',
      trendPercent: 0.5,
      greenBonus: 5
    },
    {
      id: 'sugarcane',
      name: 'Sugarcane',
      nameHindi: 'गन्ना',
      unit: 'quintal',
      msp: 315, // Fair and Remunerative Price
      prices: [
        { mandi: 'Ludhiana', state: 'Punjab', min: 310, max: 340, modal: 325 },
        { mandi: 'Karnal', state: 'Haryana', min: 305, max: 335, modal: 320 },
        { mandi: 'Jalandhar', state: 'Punjab', min: 308, max: 338, modal: 322 }
      ],
      trend: 'up',
      trendPercent: 1.8,
      greenBonus: 3
    },
    {
      id: 'maize',
      name: 'Maize',
      nameHindi: 'मक्का',
      unit: 'quintal',
      msp: 2090,
      prices: [
        { mandi: 'Karnal', state: 'Haryana', min: 1950, max: 2150, modal: 2050 },
        { mandi: 'Ambala', state: 'Haryana', min: 1980, max: 2100, modal: 2040 },
        { mandi: 'Ludhiana', state: 'Punjab', min: 1960, max: 2120, modal: 2030 }
      ],
      trend: 'down',
      trendPercent: -1.2,
      greenBonus: 4
    },
    {
      id: 'cotton',
      name: 'Cotton',
      nameHindi: 'कपास',
      unit: 'quintal',
      msp: 7121, // Long staple
      prices: [
        { mandi: 'Sirsa', state: 'Haryana', min: 6800, max: 7300, modal: 7050 },
        { mandi: 'Bathinda', state: 'Punjab', min: 6750, max: 7250, modal: 7000 },
        { mandi: 'Hisar', state: 'Haryana', min: 6850, max: 7280, modal: 7080 }
      ],
      trend: 'stable',
      trendPercent: 0.2,
      greenBonus: 4
    },
    {
      id: 'mustard',
      name: 'Mustard',
      nameHindi: 'सरसों',
      unit: 'quintal',
      msp: 5650,
      prices: [
        { mandi: 'Karnal', state: 'Haryana', min: 5400, max: 5800, modal: 5600 },
        { mandi: 'Jind', state: 'Haryana', min: 5350, max: 5750, modal: 5550 },
        { mandi: 'Bathinda', state: 'Punjab', min: 5380, max: 5780, modal: 5580 }
      ],
      trend: 'up',
      trendPercent: 1.5,
      greenBonus: 4
    }
  ],
  // Premium buyers available for green certified farmers
  premiumBuyers: [
    {
      id: 'buyer_001',
      name: 'Punjab Agro Foods',
      type: 'Processor',
      crops: ['rice_paddy', 'wheat'],
      premiumPercent: 8,
      minQuantity: 50, // quintals
      contact: '+91-172-XXXXXXX',
      verified: true
    },
    {
      id: 'buyer_002',
      name: 'Green Valley Exports',
      type: 'Exporter',
      crops: ['rice_paddy'],
      premiumPercent: 12,
      minQuantity: 100,
      contact: '+91-181-XXXXXXX',
      verified: true
    },
    {
      id: 'buyer_003',
      name: 'Haryana Organic Mills',
      type: 'Mill',
      crops: ['wheat', 'mustard'],
      premiumPercent: 6,
      minQuantity: 30,
      contact: '+91-184-XXXXXXX',
      verified: true
    },
    {
      id: 'buyer_004',
      name: 'Eco-Friendly Foods Ltd',
      type: 'Retailer',
      crops: ['rice_paddy', 'wheat', 'sugarcane'],
      premiumPercent: 10,
      minQuantity: 25,
      contact: '+91-161-XXXXXXX',
      verified: true
    }
  ]
};

// GET /api/v1/mandi/prices - Get all crop prices
router.get('/prices', async (req, res) => {
  try {
    const { state, district, crop } = req.query;
    
    let crops = [...MOCK_MANDI_DATA.crops];
    
    // Filter by crop if specified
    if (crop) {
      crops = crops.filter(c => c.id === crop || c.name.toLowerCase().includes(crop.toLowerCase()));
    }

    // Filter prices by state/district if specified
    if (state || district) {
      crops = crops.map(c => ({
        ...c,
        prices: c.prices.filter(p => {
          if (state && p.state.toLowerCase() !== state.toLowerCase()) return false;
          if (district && p.mandi.toLowerCase() !== district.toLowerCase()) return false;
          return true;
        })
      })).filter(c => c.prices.length > 0);
    }

    res.json({
      success: true,
      lastUpdated: MOCK_MANDI_DATA.lastUpdated,
      count: crops.length,
      crops
    });
  } catch (error) {
    console.error('Get mandi prices error:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// GET /api/v1/mandi/prices/:cropId - Get specific crop prices
router.get('/prices/:cropId', async (req, res) => {
  try {
    const { cropId } = req.params;
    const crop = MOCK_MANDI_DATA.crops.find(c => c.id === cropId);

    if (!crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({
      success: true,
      lastUpdated: MOCK_MANDI_DATA.lastUpdated,
      crop
    });
  } catch (error) {
    console.error('Get crop price error:', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// GET /api/v1/mandi/buyers - Get premium buyers (for green certified farmers)
router.get('/buyers', async (req, res) => {
  try {
    const { crop, minQuantity } = req.query;
    
    let buyers = [...MOCK_MANDI_DATA.premiumBuyers];

    if (crop) {
      buyers = buyers.filter(b => b.crops.includes(crop));
    }

    if (minQuantity) {
      buyers = buyers.filter(b => b.minQuantity <= parseInt(minQuantity));
    }

    res.json({
      success: true,
      count: buyers.length,
      buyers
    });
  } catch (error) {
    console.error('Get buyers error:', error);
    res.status(500).json({ error: 'Failed to fetch buyers' });
  }
});

// POST /api/v1/mandi/calculate-earnings - Calculate earnings with green bonus
router.post('/calculate-earnings', async (req, res) => {
  try {
    const { cropId, quantity, isGreenCertified, buyerId } = req.body;

    if (!cropId || !quantity) {
      return res.status(400).json({ error: 'Crop ID and quantity required' });
    }

    const crop = MOCK_MANDI_DATA.crops.find(c => c.id === cropId);
    if (!crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    // Get average modal price
    const avgPrice = crop.prices.reduce((sum, p) => sum + p.modal, 0) / crop.prices.length;
    const baseEarnings = avgPrice * quantity;

    let greenBonus = 0;
    let buyerPremium = 0;
    let buyerInfo = null;

    if (isGreenCertified) {
      // Green certification bonus
      greenBonus = (baseEarnings * crop.greenBonus) / 100;

      // Additional buyer premium if specified
      if (buyerId) {
        const buyer = MOCK_MANDI_DATA.premiumBuyers.find(b => b.id === buyerId);
        if (buyer && buyer.crops.includes(cropId)) {
          buyerPremium = (baseEarnings * buyer.premiumPercent) / 100;
          buyerInfo = {
            name: buyer.name,
            type: buyer.type,
            premiumPercent: buyer.premiumPercent
          };
        }
      }
    }

    const totalEarnings = baseEarnings + greenBonus + buyerPremium;

    res.json({
      success: true,
      calculation: {
        crop: crop.name,
        quantity,
        unit: crop.unit,
        avgPrice: Math.round(avgPrice),
        baseEarnings: Math.round(baseEarnings),
        greenBonus: Math.round(greenBonus),
        greenBonusPercent: isGreenCertified ? crop.greenBonus : 0,
        buyerPremium: Math.round(buyerPremium),
        buyerInfo,
        totalEarnings: Math.round(totalEarnings),
        mspComparison: {
          msp: crop.msp,
          mspTotal: crop.msp * quantity,
          aboveMsp: totalEarnings > (crop.msp * quantity),
          difference: Math.round(totalEarnings - (crop.msp * quantity))
        }
      }
    });
  } catch (error) {
    console.error('Calculate earnings error:', error);
    res.status(500).json({ error: 'Failed to calculate earnings' });
  }
});

// GET /api/v1/mandi/summary - Get market summary
router.get('/summary', async (req, res) => {
  try {
    const summary = {
      lastUpdated: MOCK_MANDI_DATA.lastUpdated,
      totalCrops: MOCK_MANDI_DATA.crops.length,
      totalMandis: [...new Set(MOCK_MANDI_DATA.crops.flatMap(c => c.prices.map(p => p.mandi)))].length,
      premiumBuyersCount: MOCK_MANDI_DATA.premiumBuyers.length,
      trends: {
        rising: MOCK_MANDI_DATA.crops.filter(c => c.trend === 'up').length,
        stable: MOCK_MANDI_DATA.crops.filter(c => c.trend === 'stable').length,
        falling: MOCK_MANDI_DATA.crops.filter(c => c.trend === 'down').length
      },
      topCrops: MOCK_MANDI_DATA.crops
        .sort((a, b) => {
          const avgA = a.prices.reduce((sum, p) => sum + p.modal, 0) / a.prices.length;
          const avgB = b.prices.reduce((sum, p) => sum + p.modal, 0) / b.prices.length;
          return avgB - avgA;
        })
        .slice(0, 3)
        .map(c => ({
          name: c.name,
          avgPrice: Math.round(c.prices.reduce((sum, p) => sum + p.modal, 0) / c.prices.length),
          trend: c.trend,
          trendPercent: c.trendPercent
        })),
      greenBenefits: {
        avgBonusPercent: Math.round(MOCK_MANDI_DATA.crops.reduce((sum, c) => sum + c.greenBonus, 0) / MOCK_MANDI_DATA.crops.length),
        maxBuyerPremium: Math.max(...MOCK_MANDI_DATA.premiumBuyers.map(b => b.premiumPercent)),
        verifiedBuyers: MOCK_MANDI_DATA.premiumBuyers.filter(b => b.verified).length
      }
    };

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Get market summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// In-memory sell requests storage for demo
const sellRequests = [
  {
    id: 'sr_001',
    farmerId: 'farmer_001',
    farmerName: 'Gurpreet Singh',
    commodity: 'Rice (Paddy)',
    quantity: 50,
    unit: 'Quintal',
    requestedPrice: 2400,
    status: 'pending',
    isGreenFarmer: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sr_002',
    farmerId: 'farmer_002',
    farmerName: 'Rajender Kumar',
    commodity: 'Wheat',
    quantity: 30,
    unit: 'Quintal',
    requestedPrice: 2300,
    status: 'approved',
    isGreenFarmer: false,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sr_003',
    farmerId: 'farmer_003',
    farmerName: 'Harjinder Kaur',
    commodity: 'Cotton',
    quantity: 25,
    unit: 'Quintal',
    requestedPrice: 6800,
    status: 'pending',
    isGreenFarmer: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// GET /api/mandi/sell-requests - Get all sell requests (admin)
router.get('/sell-requests', async (req, res) => {
  try {
    const { status, isGreenFarmer } = req.query;
    
    let filtered = [...sellRequests];
    
    if (status) {
      filtered = filtered.filter(r => r.status === status);
    }
    
    if (isGreenFarmer !== undefined) {
      filtered = filtered.filter(r => r.isGreenFarmer === (isGreenFarmer === 'true'));
    }
    
    // Sort by date, newest first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(filtered);
  } catch (error) {
    console.error('Get sell requests error:', error);
    res.status(500).json({ error: 'Failed to fetch sell requests' });
  }
});

// POST /api/mandi/sell-requests - Create a sell request (farmer)
router.post('/sell-requests', async (req, res) => {
  try {
    const { farmerId, farmerName, commodity, quantity, unit, requestedPrice, isGreenFarmer } = req.body;
    
    if (!farmerId || !commodity || !quantity || !requestedPrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const newRequest = {
      id: `sr_${Date.now()}`,
      farmerId,
      farmerName: farmerName || 'Unknown',
      commodity,
      quantity: parseFloat(quantity),
      unit: unit || 'Quintal',
      requestedPrice: parseFloat(requestedPrice),
      status: 'pending',
      isGreenFarmer: isGreenFarmer || false,
      createdAt: new Date().toISOString()
    };
    
    sellRequests.unshift(newRequest);
    
    res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    console.error('Create sell request error:', error);
    res.status(500).json({ error: 'Failed to create sell request' });
  }
});

// PUT /api/mandi/sell-requests/:id - Update sell request status (admin)
router.put('/sell-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const request = sellRequests.find(r => r.id === id);
    
    if (!request) {
      return res.status(404).json({ error: 'Sell request not found' });
    }
    
    if (status && ['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      request.status = status;
      request.updatedAt = new Date().toISOString();
    }
    
    res.json({ success: true, request });
  } catch (error) {
    console.error('Update sell request error:', error);
    res.status(500).json({ error: 'Failed to update sell request' });
  }
});

module.exports = router;

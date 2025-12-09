const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../services/database');

// Simple JWT secret (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || 'agritrack-sih2025-secret-key';
const JWT_EXPIRES_IN = '7d';

// Demo credentials
const DEMO_CREDENTIALS = {
  admin: [
    { id: 'admin_001', email: 'admin@agritrack.in', password: 'admin123', name: 'Admin User', role: 'admin' },
    { id: 'admin_002', email: 'manager@agritrack.in', password: 'manager123', name: 'District Manager', role: 'manager' }
  ],
  farmers: [
    { 
      id: 'farmer_001', 
      phone: '+919876543210', 
      pin: '1234', 
      name: 'Gurpreet Singh',
      district: 'Ludhiana',
      state: 'Punjab',
      village: 'Jagraon',
      farm_size: 15,
      green_certified: true,
      green_credits: 250,
      crops: ['Rice', 'Wheat'],
      aadhaar_last4: '7890'
    },
    { 
      id: 'farmer_002', 
      phone: '+919123456789', 
      pin: '5678', 
      name: 'Rajender Kumar',
      district: 'Karnal',
      state: 'Haryana',
      village: 'Nissing',
      farm_size: 8,
      green_certified: false,
      green_credits: 75,
      crops: ['Rice'],
      aadhaar_last4: '1234'
    },
    { 
      id: 'farmer_003', 
      phone: '+918765432109', 
      pin: '4321', 
      name: 'Harjinder Kaur',
      district: 'Patiala',
      state: 'Punjab',
      village: 'Rajpura',
      farm_size: 22,
      green_certified: true,
      green_credits: 450,
      crops: ['Rice', 'Wheat', 'Sugarcane'],
      aadhaar_last4: '5678'
    },
    { 
      id: 'farmer_004', 
      phone: '+917654321098', 
      pin: '9876', 
      name: 'Sukhdev Singh',
      district: 'Amritsar',
      state: 'Punjab',
      village: 'Ajnala',
      farm_size: 12,
      green_certified: true,
      green_credits: 320,
      crops: ['Rice', 'Wheat'],
      aadhaar_last4: '4567'
    },
    { 
      id: 'farmer_005', 
      phone: '+916543210987', 
      pin: '1111', 
      name: 'Balwinder Kaur',
      district: 'Sangrur',
      state: 'Punjab',
      village: 'Malerkotla',
      farm_size: 18,
      green_certified: false,
      green_credits: 50,
      crops: ['Rice'],
      aadhaar_last4: '8901'
    },
    { 
      id: 'farmer_006', 
      phone: '+917980638514', 
      pin: '1234', 
      name: 'Srijbasu',
      district: '',
      state: '',
      village: '',
      farm_size: 0,
      green_certified: false,
      green_credits: 0,
      crops: [],
      aadhaar_last4: ''
    }
  ]
};

// Generate JWT token
const generateToken = (user, role) => {
  return jwt.sign(
    { id: user.id, role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api/v1/auth/admin/login - Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = DEMO_CREDENTIALS.admin.find(
      a => a.email === email.toLowerCase() && a.password === password
    );

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin, admin.role);

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/v1/auth/farmer/login - Farmer login with phone + PIN
router.post('/farmer/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ error: 'Phone and PIN required' });
    }

    // Clean phone number - remove spaces, +, 91 prefix
    const cleanPhone = phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
    
    // First check demo credentials
    let farmer = DEMO_CREDENTIALS.farmers.find(f => {
      const storedPhone = f.phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
      return storedPhone === cleanPhone && f.pin === pin;
    });

    // If not found in demo, check database
    if (!farmer && db.isConfigured()) {
      const { data: dbFarmer, error } = await db.getFarmerByPhone(cleanPhone);
      if (dbFarmer && dbFarmer.pin_hash === pin) {
        farmer = {
          id: dbFarmer.id,
          phone: dbFarmer.phone,
          name: dbFarmer.name,
          district: dbFarmer.district || '',
          state: dbFarmer.state || '',
          village: dbFarmer.village || '',
          farm_size: dbFarmer.total_land_area || 0,
          green_certified: dbFarmer.green_certified || false,
          green_credits: dbFarmer.green_credits || 0,
          crops: dbFarmer.crops || [],
          aadhaar_last4: dbFarmer.aadhaar_last4 || ''
        };
      }
    }

    if (!farmer) {
      return res.status(401).json({ error: 'Invalid phone or PIN' });
    }

    const token = generateToken(farmer, 'farmer');

    res.json({
      success: true,
      token,
      user: {
        id: farmer.id,
        phone: farmer.phone,
        name: farmer.name,
        district: farmer.district,
        state: farmer.state,
        village: farmer.village,
        farm_size: farmer.farm_size,
        green_certified: farmer.green_certified,
        green_credits: farmer.green_credits,
        crops: farmer.crops,
        role: 'farmer'
      }
    });
  } catch (error) {
    console.error('Farmer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/v1/auth/farmer/register - Register new farmer
router.post('/farmer/register', async (req, res) => {
  try {
    const { phone, pin, name, district, state, village, farm_size, aadhaar_last4 } = req.body;

    // Validate required fields
    if (!phone || !pin || !name) {
      return res.status(400).json({ error: 'Phone, PIN, and name are required' });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    // Clean phone number - remove spaces, dashes, plus, and 91 prefix
    const cleanPhone = phone.replace(/[\s\-+]/g, '').replace(/^91/, '');

    if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits' });
    }

    // Check if phone already exists in demo credentials
    const existsInDemo = DEMO_CREDENTIALS.farmers.some(f => {
      const storedPhone = f.phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
      return storedPhone === cleanPhone;
    });

    if (existsInDemo) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Try database registration first (if configured and table exists)
    if (db.isConfigured()) {
      // Check if phone exists in database
      const { data: existingFarmer, error: checkError } = await db.getFarmerByPhone(cleanPhone);
      
      // If table doesn't exist, fall back to in-memory
      if (checkError?.message === 'FARMERS_TABLE_NOT_EXISTS') {
        console.log('⚠️ Farmers table not found, using in-memory registration');
      } else if (existingFarmer) {
        return res.status(409).json({ error: 'Phone number already registered' });
      } else {
        // Try to create farmer in database
        const { data: newDbFarmer, error: createError } = await db.createFarmer({
          phone: cleanPhone,
          pin_hash: pin, // In production, hash this!
          name,
          district: district || '',
          state: state || '',
          village: village || '',
          total_land_area: farm_size || 0,
          aadhaar_last4: aadhaar_last4 || '',
          crops: []
        });

        if (createError?.message === 'FARMERS_TABLE_NOT_EXISTS') {
          console.log('⚠️ Farmers table not found, using in-memory registration');
        } else if (createError) {
          console.error('Database registration error:', createError);
          return res.status(500).json({ error: 'Registration failed: ' + createError.message });
        } else if (newDbFarmer) {
          // Database registration successful!
          console.log(`✅ New farmer registered in DB: ${name} (${cleanPhone})`);
          
          const token = generateToken({ id: newDbFarmer.id, name: newDbFarmer.name }, 'farmer');
          
          return res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token,
            user: {
              id: newDbFarmer.id,
              phone: `+91${cleanPhone}`,
              name: newDbFarmer.name,
              district: newDbFarmer.district || '',
              state: newDbFarmer.state || '',
              village: newDbFarmer.village || '',
              farm_size: newDbFarmer.total_land_area || 0,
              green_certified: newDbFarmer.green_certified || false,
              green_credits: newDbFarmer.green_credits || 0,
              crops: newDbFarmer.crops || [],
              role: 'farmer'
            }
          });
        }
      }
    }

    // Fallback: In-memory registration
    const newFarmerId = `farmer_${Date.now()}`;
    const newFarmer = {
      id: newFarmerId,
      phone: `+91${cleanPhone}`,
      pin,
      name,
      district: district || '',
      state: state || '',
      village: village || '',
      farm_size: farm_size || 0,
      green_certified: false,
      green_credits: 0,
      crops: [],
      aadhaar_last4: aadhaar_last4 || ''
    };

    // Add to in-memory credentials array
    DEMO_CREDENTIALS.farmers.push(newFarmer);
    console.log(`✅ New farmer registered (in-memory): ${name} (${cleanPhone})`);

    // Generate JWT token
    const token = generateToken(newFarmer, 'farmer');

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: newFarmer.id,
        phone: newFarmer.phone,
        name: newFarmer.name,
        district: newFarmer.district,
        state: newFarmer.state,
        village: newFarmer.village,
        farm_size: newFarmer.farm_size,
        green_certified: false,
        green_credits: 0,
        crops: [],
        role: 'farmer'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// POST /api/v1/auth/login - Unified login endpoint for both admin and farmer
// Supports phone+password format for simpler UI
router.post('/login', async (req, res) => {
  try {
    const { phone, password, email } = req.body;

    // Admin login with email
    if (email) {
      const admin = DEMO_CREDENTIALS.admin.find(
        a => a.email === email && a.password === password
      );
      
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(admin, admin.role);

      return res.json({
        success: true,
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });
    }

    // Phone-based login (check both admin and farmer)
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
      
      // Simple password mapping for demo (PIN as password, or predefined passwords)
      const passwordMap = {
        '9876543210': { pin: '1234', password: 'farmer123' },
        '9123456789': { pin: '5678', password: 'farmer456' },
        '8765432109': { pin: '4321', password: 'farmer456' },
        '9988776655': { pin: '9999', password: 'farmer789' },
        '6543210987': { pin: '1111', password: 'farmer111' },
        '9999999999': { password: 'admin123', role: 'admin' }
      };

      // Check if this is the demo admin
      if (cleanPhone === '9999999999' && password === 'admin123') {
        const adminUser = {
          id: 'admin_demo',
          name: 'Demo Admin',
          role: 'admin',
          email: 'demo@agritrack.in'
        };
        const token = generateToken(adminUser, 'admin');
        return res.json({
          success: true,
          token,
          user: adminUser
        });
      }

      // Find farmer by phone
      const farmer = DEMO_CREDENTIALS.farmers.find(f => {
        const farmerPhone = f.phone.replace(/[\s\-+]/g, '').replace(/^91/, '');
        return farmerPhone === cleanPhone;
      });

      if (farmer) {
        // Accept both PIN and password for login
        const mapping = passwordMap[cleanPhone];
        const isValidPassword = password === farmer.pin || 
                              (mapping && (password === mapping.password || password === mapping.pin));
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        const token = generateToken(farmer, 'farmer');

        return res.json({
          success: true,
          token,
          user: {
            id: farmer.id,
            phone: farmer.phone,
            name: farmer.name,
            district: farmer.district,
            state: farmer.state,
            village: farmer.village,
            farm_size: farmer.farm_size,
            isGreenFarmer: farmer.green_certified,
            green_credits: farmer.green_credits,
            crops: farmer.crops,
            role: 'farmer'
          }
        });
      }

      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    return res.status(400).json({ error: 'Phone or email required' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/v1/auth/me - Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'admin' || role === 'manager') {
      const admin = DEMO_CREDENTIALS.admin.find(a => a.id === id);
      if (!admin) return res.status(404).json({ error: 'User not found' });
      
      return res.json({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
    } else {
      const farmer = DEMO_CREDENTIALS.farmers.find(f => f.id === id);
      if (!farmer) return res.status(404).json({ error: 'User not found' });
      
      return res.json({
        id: farmer.id,
        phone: farmer.phone,
        name: farmer.name,
        district: farmer.district,
        state: farmer.state,
        village: farmer.village,
        farm_size: farmer.farm_size,
        green_certified: farmer.green_certified,
        green_credits: farmer.green_credits,
        crops: farmer.crops,
        role: 'farmer'
      });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// GET /api/v1/auth/demo-credentials - Get demo credentials for testing
router.get('/demo-credentials', (req, res) => {
  res.json({
    admin: DEMO_CREDENTIALS.admin.map(a => ({
      email: a.email,
      password: a.password,
      name: a.name,
      role: a.role
    })),
    farmers: DEMO_CREDENTIALS.farmers.map(f => ({
      phone: f.phone,
      pin: f.pin,
      name: f.name,
      district: f.district,
      green_certified: f.green_certified
    }))
  });
});

// GET /api/v1/auth/farmer/:id/green-certificate - Get Green Certificate
router.get('/farmer/:id/green-certificate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const farmer = DEMO_CREDENTIALS.farmers.find(f => f.id === id);
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    if (!farmer.green_certified) {
      return res.status(400).json({ 
        error: 'Not green certified',
        message: 'Complete more scheduled harvests without burning to earn certification'
      });
    }

    const certificate = {
      certificate_id: `GC-${farmer.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      farmer_name: farmer.name,
      farmer_id: farmer.id,
      district: farmer.district,
      state: farmer.state,
      village: farmer.village,
      farm_size: farmer.farm_size,
      green_credits: farmer.green_credits,
      certification_date: new Date().toISOString(),
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      achievements: [
        { title: 'No-Burn Champion', description: 'Completed 3+ harvests without burning' },
        { title: 'Schedule Follower', description: 'Followed harvest schedule consistently' },
        { title: 'Eco Warrior', description: 'Contributed to reducing air pollution' }
      ],
      benefits: [
        '5% bonus on mandi sales through AgriTrack',
        'Priority machine booking',
        'Direct buyer connections',
        'Government subsidy eligibility'
      ],
      qr_verification_url: `https://agritrack.in/verify/GC-${farmer.id}`
    };

    res.json(certificate);
  } catch (error) {
    console.error('Get green certificate error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Export middleware for use in other routes
router.verifyToken = verifyToken;

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../services/database');

// Mock bookings for testing without database
const mockBookings = [];

// GET /api/v1/bookings - List all bookings
router.get('/', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      return res.json(mockBookings);
    }
    
    const { status, farmer_id } = req.query;
    
    const { data, error } = await db.getBookings({
      status,
      farmer_id
    });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/bookings/farmer/:farmerId - Get farmer's bookings (must be before :id)
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      const farmerBookings = mockBookings.filter(b => b.farmer_id === req.params.farmerId);
      return res.json(farmerBookings);
    }

    const { data, error } = await db.getBookings({
      farmer_id: req.params.farmerId
    });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/bookings - Create booking
router.post('/', async (req, res) => {
  try {
    const { 
      machine_id, 
      farmer_id, 
      farmer_name, 
      farmer_phone, 
      scheduled_date, 
      acres, 
      location, 
      notes 
    } = req.body;

    if (!db.isConfigured()) {
      // Mock mode: create in-memory booking
      const existingBooking = mockBookings.find(
        b => b.machine_id === machine_id && 
             b.scheduled_date === scheduled_date && 
             ['pending', 'confirmed'].includes(b.status)
      );

      if (existingBooking) {
        return res.status(409).json({ success: false, message: 'Machine already booked for this date' });
      }

      const newBooking = {
        id: `BK${Date.now()}`,
        machine_id,
        farmer_id: farmer_id || 'farmer_guest',
        farmer_name: farmer_name || 'Guest Farmer',
        farmer_phone: farmer_phone || '',
        scheduled_date: scheduled_date || new Date().toISOString(),
        acres: acres || 0,
        location: location || '',
        notes,
        status: 'pending',
        created_at: new Date().toISOString(),
        qr_data: null
      };

      // Generate QR data
      newBooking.qr_data = JSON.stringify({
        booking_id: newBooking.id,
        farmer_name: newBooking.farmer_name,
        farmer_phone: newBooking.farmer_phone,
        machine_id: newBooking.machine_id,
        location: newBooking.location,
        acres: newBooking.acres,
        date: newBooking.created_at,
        status: newBooking.status
      });

      mockBookings.push(newBooking);
      
      const io = req.app.get('io');
      io.emit('booking_update', newBooking);
      
      console.log(`📱 Booking created: ${newBooking.id} for ${farmer_name}`);
      return res.status(201).json({ success: true, booking: newBooking });
    }

    const { data, error } = await db.createBooking({
      machine_id,
      farmer_id,
      scheduled_date,
      notes
    });

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Machine already booked for this date' });
      }
      throw error;
    }

    // Emit booking update
    const io = req.app.get('io');
    io.emit('booking_update', data);

    // TODO: Send SMS notification
    console.log(`📱 SMS: Booking created for farmer ${farmer_id}`);

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/bookings/:id - Update booking status
router.patch('/:id', async (req, res) => {
  try {
    const { status, acres_covered } = req.body;

    if (!db.isConfigured()) {
      // Mock mode: update in-memory booking
      const booking = mockBookings.find(b => b.id === req.params.id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      booking.status = status;
      if (acres_covered) booking.acres_covered = acres_covered;
      booking.updated_at = new Date().toISOString();
      
      const io = req.app.get('io');
      io.emit('booking_update', booking);
      return res.json(booking);
    }

    const { data, error } = await db.updateBookingStatus(
      req.params.id,
      status,
      acres_covered
    );

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Emit status update
    const io = req.app.get('io');
    io.emit('booking_update', data);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/bookings/:id - Get single booking
router.get('/:id', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      const booking = mockBookings.find(b => b.id === req.params.id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      return res.json(booking);
    }

    const { data, error } = await db.getBookings();
    const booking = data?.find(b => b.id === req.params.id);

    if (error) throw error;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

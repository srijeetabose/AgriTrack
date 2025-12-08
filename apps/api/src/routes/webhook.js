const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const db = require('../services/database');

// POST /api/v1/auth/webhook - Clerk webhook handler
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Get the headers
  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(req.body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Verification failed' });
  }

  // Handle the event
  const eventType = evt.type;
  const userData = evt.data;

  console.log(`📨 Clerk webhook: ${eventType}`);

  if (!db.isConfigured()) {
    console.log('⚠️ Database not configured - webhook processed but not persisted');
    return res.json({ received: true, persisted: false });
  }

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated':
        const { data, error } = await db.upsertUser(userData.id, {
          email: userData.email_addresses?.[0]?.email_address,
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          phone: userData.phone_numbers?.[0]?.phone_number,
          role: 'farmer'
        });
        
        if (error) {
          console.error(`❌ Error syncing user: ${error.message}`);
        } else {
          console.log(`✅ User ${eventType === 'user.created' ? 'created' : 'updated'} in Supabase: ${userData.id}`);
        }
        break;

      case 'user.deleted':
        await supabase
          .from('users')
          .delete()
          .eq('clerk_id', userData.id);
        console.log(`✅ User deleted from Supabase: ${userData.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

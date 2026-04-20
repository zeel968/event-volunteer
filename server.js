import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import crypto, { randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import { clerkMiddleware, requireAuth, createClerkClient } from '@clerk/backend';
import { supabase } from './supabase.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// -------------------------------------------------------
// App & Middleware Setup
// -------------------------------------------------------
const app = express();
app.use(clerkMiddleware()); 
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Basic health check as requested
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// -------------------------------------------------------
// CORS Configuration
// -------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
  /vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(pattern => 
      pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

const PORT = process.env.PORT || 5000;

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const getRoleArray = (roleStr) => {
  if (!roleStr) return [];
  return roleStr.split(',').map(r => r.trim()).filter(Boolean);
};

const getOrSyncProfile = async (auth) => {
  if (!auth?.userId) return null;
  try {
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{ 
          id: randomUUID(),
          email, 
          name: clerkUser.fullName || email.split('@')[0],
          role: 'volunteer' 
        }])
        .select()
        .single();
      profile = newProfile;
    }
    return profile;
  } catch (err) {
    console.error('[Sync] Error syncing profile:', err);
    return null;
  }
};

// -------------------------------------------------------
// Mock data for in-memory events/apps (can be moved to DB later)
// -------------------------------------------------------
const events = [
  { id: 1, title: 'Summer Festival 2026', status: 'Upcoming', organizerEmail: 'admin@example.com', stipend: 500 },
  { id: 2, title: 'Tech Expo 2026', status: 'Live', organizerEmail: 'admin@example.com', stipend: 1000 }
];
const applications = [
  { id: 1, eventId: 1, email: 'test@example.com', status: 'Approved', name: 'Test User' }
];
const notifications = [];

// -------------------------------------------------------
// Protected Routes (Event Management)
// -------------------------------------------------------

app.post('/api/events', requireAuth(), async (req, res) => {
  const newEvent = req.body;
  if (!newEvent.id || !newEvent.title) return res.status(400).json({ success: false, error: 'Invalid event data' });
  
  const exists = events.find(e => e.id === Number(newEvent.id));
  if (!exists) {
    events.push(newEvent);
  }
  res.json({ success: true });
});

app.post('/api/applications', requireAuth(), (req, res) => {
  const newApp = req.body;
  if (!newApp.id || !newApp.eventId) return res.status(400).json({ success: false, error: 'Invalid app data' });
  
  const exists = applications.find(a => a.id === Number(newApp.id));
  if (!exists) {
    applications.push(newApp);
  }
  res.json({ success: true });
});

app.post('/api/events/:eventId/mark-attendance', requireAuth(), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { applicationIds, status = 'Present' } = req.body; 
    const profile = await getOrSyncProfile(req.auth);
    
    if (!profile || (!getRoleArray(profile.role).includes('organizer') && !getRoleArray(profile.role).includes('admin'))) {
      return res.status(403).json({ success: false, error: 'Forbidden: Organizer access required.' });
    }

    const updatedApps = [];
    applicationIds.forEach(appId => {
      const idx = applications.findIndex(app => app.id === Number(appId) && app.eventId === Number(eventId));
      if (idx !== -1) {
        applications[idx].status = status;
        updatedApps.push(applications[idx]);
      }
    });
    return res.json({ success: true, updated: updatedApps.length });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/events/:eventId/finish', requireAuth(), async (req, res) => {
  try {
    const { eventId } = req.params;
    const profile = await getOrSyncProfile(req.auth);

    if (!profile || (!getRoleArray(profile.role).includes('organizer') && !getRoleArray(profile.role).includes('admin'))) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const eventIndex = events.findIndex(e => e.id === Number(eventId));
    if (eventIndex !== -1) {
      events[eventIndex].status = 'Finished';
      const presentApps = applications.filter(app => app.eventId === Number(eventId) && app.status === 'Present');
      notifications.unshift(...presentApps.map(app => ({
        id: Date.now() + Math.random(),
        userEmail: app.email,
        message: `Event "${events[eventIndex].title}" finished. Please provide payment details.`,
        read: false,
        timestamp: new Date().toISOString()
      })));
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// -------------------------------------------------------
// Payment Endpoints
// -------------------------------------------------------

app.post('/api/payments/create', requireAuth(), async (req, res) => {
  try {
    const { amount, receipt, applicationId } = req.body;
    const order = await razorpay.orders.create({
      amount: Number(amount),
      currency: 'INR',
      receipt: receipt.toString(),
      payment_capture: 1,
      notes: { applicationId: applicationId.toString() }
    });
    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Razorpay error' });
  }
});

app.post('/api/payments/verify', requireAuth(), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
  const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');
    
  if (generatedSignature !== razorpay_signature) return res.status(400).json({ success: false });

  const ids = applicationId.toString().split(',').map(id => Number(id.trim()));
  ids.forEach(id => {
    const idx = applications.findIndex(app => app.id === id);
    if (idx !== -1) applications[idx].status = 'Paid';
  });
  return res.json({ success: true });
});

// -------------------------------------------------------
// Profile Endpoints
// -------------------------------------------------------

app.get('/api/profile', requireAuth(), async (req, res) => {
  const profile = await getOrSyncProfile(req.auth);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
  return res.json({ success: true, profile });
});

app.post('/api/profile', requireAuth(), async (req, res) => {
  const profile = await getOrSyncProfile(req.auth);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

  const { data, error } = await supabase
    .from('profiles')
    .update(req.body)
    .eq('id', profile.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Update failed' });
  return res.json({ success: true, profile: data });
});

// -------------------------------------------------------
// Webhooks
// -------------------------------------------------------
app.post('/api/webhooks/razorpay', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');

  if (expectedSignature !== signature) return res.status(400).send('Invalid signature');

  const { event, payload } = req.body;
  if (event === 'payment.captured' || event === 'order.paid') {
    const appId = payload.payment?.entity?.notes?.applicationId || payload.order?.entity?.notes?.applicationId;
    if (appId) {
      const idx = applications.findIndex(app => app.id === Number(appId));
      if (idx !== -1) applications[idx].status = 'Paid';
    }
  }
  return res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[Server] Clerk-Native Backend running on port ${PORT}`);
});

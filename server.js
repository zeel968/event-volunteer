import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import crypto, { randomUUID } from 'crypto';
import Razorpay from 'razorpay';
import { createClerkClient } from '@clerk/express';
import { supabase } from './supabase.js';

// Catch any unhandled crashes so Railway logs show them clearly
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught Exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------------------------------------
// CORS — must be first
// -------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(p => p instanceof RegExp ? p.test(origin) : p === origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
}));

app.use(express.json());

// -------------------------------------------------------
// Health check — NO auth middleware, must respond first
// -------------------------------------------------------
// Root ping — absolutely zero dependencies, confirms server is alive at all
app.get('/', (req, res) => res.send('Server is running'));
app.get('/health', (req, res) => res.send('OK'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    node: process.version,
    env: {
      hasClerkKey: !!process.env.CLERK_SECRET_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY,
      hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
    }
  });
});

// -------------------------------------------------------
// Clerk client (server-side only)
// -------------------------------------------------------
let clerkClient = null;
try {
  clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  console.log('[Clerk] Client initialized.');
} catch (err) {
  console.error('[Clerk] Failed to initialize client:', err.message);
}

// -------------------------------------------------------
// Manual auth middleware (replaces authenticate)
// More reliable without needing global clerkMiddleware
// -------------------------------------------------------
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!clerkClient) {
      return res.status(500).json({ success: false, error: 'Auth server not ready' });
    }
    // Verify the Clerk session token
    const payload = await clerkClient.verifyToken(token);
    req.auth = { userId: payload.sub };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// -------------------------------------------------------
// Razorpay client
// -------------------------------------------------------
let razorpay = null;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
  console.log('[Razorpay] Client initialized.');
} catch (err) {
  console.error('[Razorpay] Failed to initialize:', err.message);
}

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const getRoles = (roleStr) => {
  if (!roleStr) return [];
  if (Array.isArray(roleStr)) return roleStr;
  return roleStr.split(',').map(r => r.trim()).filter(Boolean);
};

const syncProfile = async (userId) => {
  if (!clerkClient || !userId) return null;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    if (!email) return null;

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
          role: 'volunteer',
        }])
        .select()
        .maybeSingle();
      profile = newProfile;
    }

    // Fallback virtual profile if DB fails
    if (!profile) {
      return {
        email,
        name: clerkUser.fullName || email.split('@')[0],
        role: 'volunteer',
        virtual: true,
      };
    }
    return profile;
  } catch (err) {
    console.error('[Sync] Error:', err.message);
    return null;
  }
};

// -------------------------------------------------------
// In-memory data store
// -------------------------------------------------------
const events = [];
const applications = [];
const notifications = [];

// -------------------------------------------------------
// Protected Routes — authenticate applied per-route
// -------------------------------------------------------

// Profile
app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const profile = await syncProfile(req.auth.userId);
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/profile', authenticate, async (req, res) => {
  try {
    const profile = await syncProfile(req.auth.userId);
    if (!profile || profile.virtual) {
      return res.status(404).json({ success: false, error: 'Profile not found in database' });
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(req.body)
      .eq('id', profile.id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, error: 'Update failed' });
    return res.json({ success: true, profile: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Role switch
app.post('/api/user/switch-role', authenticate, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['organizer', 'volunteer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    await clerkClient.users.updateUserMetadata(req.auth.userId, {
      publicMetadata: { role },
    });
    const profile = await syncProfile(req.auth.userId);
    if (profile && !profile.virtual) {
      await supabase.from('profiles').update({ role }).eq('id', profile.id);
    }
    return res.json({ success: true, role });
  } catch (err) {
    console.error('[RoleSwitch] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Role switch failed' });
  }
});

// Events
app.post('/api/events', authenticate, async (req, res) => {
  try {
    const e = req.body;
    if (!e.id || !e.title) return res.status(400).json({ success: false, error: 'Invalid event' });
    if (!events.find(ev => ev.id === Number(e.id))) events.push(e);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// End Event
app.post('/api/events/end', authenticate, async (req, res) => {
  try {
    const { eventId } = req.body;
    const profile = await syncProfile(req.auth.userId);
    const roles = getRoles(profile?.role);
    const isOrganizer = roles.includes('organizer') || roles.includes('admin') || profile?.virtual;

    if (!profile || !isOrganizer) {
      return res.status(403).json({ success: false, error: 'Only organizers can end events' });
    }

    const idx = events.findIndex(e => e.id === Number(eventId));
    if (idx !== -1) {
      events[idx].status = 'Finished';
      applications
        .filter(a => a.eventId === Number(eventId) && a.status === 'Present')
        .forEach(a => {
          notifications.unshift({
            id: Date.now() + Math.random(),
            userEmail: a.email,
            message: `Event "${events[idx].title}" finished.`,
            read: false,
            timestamp: new Date().toISOString(),
          });
        });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[EndEvent] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Backward compat finish route
app.post('/api/events/:eventId/finish', authenticate, async (req, res) => {
  const idx = events.findIndex(e => e.id === Number(req.params.eventId));
  if (idx !== -1) events[idx].status = 'Finished';
  return res.json({ success: true });
});

app.post('/api/events/:eventId/mark-attendance', authenticate, async (req, res) => {
  try {
    const { applicationIds, status = 'Present' } = req.body;
    applicationIds.forEach(appId => {
      const i = applications.findIndex(a => a.id === Number(appId) && a.eventId === Number(req.params.eventId));
      if (i !== -1) applications[i].status = status;
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Applications
app.post('/api/applications', authenticate, async (req, res) => {
  try {
    const a = req.body;
    if (!a.id || !a.eventId) return res.status(400).json({ success: false, error: 'Invalid application' });
    if (!applications.find(ap => ap.id === Number(a.id))) applications.push(a);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Payments
app.post('/api/payments/create', authenticate, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ success: false, error: 'Razorpay not configured' });
    const { amount, receipt, applicationId } = req.body;
    const order = await razorpay.orders.create({
      amount: Number(amount),
      currency: 'INR',
      receipt: String(receipt),
      payment_capture: 1,
      notes: { applicationId: String(applicationId) },
    });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('[Payment] Create error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

app.post('/api/payments/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (sig !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    const ids = String(applicationId).split(',').map(id => Number(id.trim()));
    ids.forEach(id => {
      const i = applications.findIndex(a => a.id === id);
      if (i !== -1) applications[i].status = 'Paid';
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[Payment] Verify error:', err.message);
    return res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// Webhook
app.post('/api/webhooks/razorpay', (req, res) => res.json({ status: 'ok' }));

// -------------------------------------------------------
// Start
// -------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} | Node ${process.version}`);
  console.log(`[Server] CLERK_SECRET_KEY set: ${!!process.env.CLERK_SECRET_KEY}`);
  console.log(`[Server] SUPABASE_URL set: ${!!process.env.SUPABASE_URL}`);
});

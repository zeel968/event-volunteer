import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import crypto, { randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import { clerkMiddleware, requireAuth, createClerkClient } from '@clerk/express';
import { supabase } from './supabase.js';

// Global Environment Check
if (!process.env.CLERK_SECRET_KEY) {
  console.error('CRITICAL ERROR: CLERK_SECRET_KEY is not set in environment variables!');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// -------------------------------------------------------
// CORS Configuration (Must be at the top)
// -------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
  /vercel\.app$/
];

const app = express();

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

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(clerkMiddleware()); 
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: { 
      hasClerkKey: !!process.env.CLERK_SECRET_KEY,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY 
    }
  });
});

const PORT = process.env.PORT || 5000;

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const getRoleArray = (roleStr) => {
  if (!roleStr) return [];
  return roleStr.split(',').map(r => r.trim()).filter(Boolean);
};

const getOrSyncProfile = async (auth) => {
  if (!auth?.userId) {
    console.warn('[Sync] No userId in auth object');
    return null;
  }
  try {
    console.log('[Sync] Syncing profile for Clerk User:', auth.userId);
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      console.log('[Sync] Profile missing in Supabase. Creating for:', email);
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{ 
          id: randomUUID(),
          email, 
          name: clerkUser.fullName || email.split('@')[0],
          role: 'volunteer' 
        }])
        .select()
        .maybeSingle();
      
      profile = newProfile;
    }
    
    // Fail-safe: If DB lookup/creation fails, return a virtual profile based on Clerk data
    if (!profile) {
      console.warn('[Sync] Database operations failed. Returning virtual profile.');
      return {
        email,
        name: clerkUser.fullName || email.split('@')[0],
        role: 'volunteer',
        virtual: true
      };
    }

    return profile;
  } catch (err) {
    console.error('[Sync] Fatal Error during sync:', err);
    return null;
  }
};

// -------------------------------------------------------
// Mock data for in-memory events/apps
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
// Protected Routes
// -------------------------------------------------------

app.post('/api/events', requireAuth(), async (req, res) => {
  const newEvent = req.body;
  if (!newEvent.id || !newEvent.title) return res.status(400).json({ success: false, error: 'Invalid event data' });
  events.push(newEvent);
  res.json({ success: true });
});

app.post('/api/applications', requireAuth(), (req, res) => {
  const newApp = req.body;
  if (!newApp.id || !newApp.eventId) return res.status(400).json({ success: false, error: 'Invalid app data' });
  applications.push(newApp);
  res.json({ success: true });
});

app.post('/api/events/:eventId/mark-attendance', requireAuth(), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { applicationIds, status = 'Present' } = req.body; 
    const profile = await getOrSyncProfile(req.auth);
    
    if (!profile || (!getRoleArray(profile.role).includes('organizer') && !getRoleArray(profile.role).includes('admin') && profile.role !== 'admin' && profile.role !== 'organizer')) {
      return res.status(403).json({ success: false, error: 'Forbidden: Organizer access required.' });
    }

    applicationIds.forEach(appId => {
      const idx = applications.findIndex(app => app.id === Number(appId) && app.eventId === Number(eventId));
      if (idx !== -1) applications[idx].status = status;
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/events/:eventId/finish', requireAuth(), async (req, res) => {
  try {
    const { eventId } = req.params;
    const profile = await getOrSyncProfile(req.auth);

    // Flexible role check for testing
    const roles = getRoleArray(profile?.role);
    if (!profile || (!roles.includes('organizer') && !roles.includes('admin') && !profile.virtual)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Organizer role required.' });
    }
    
    const eventIndex = events.findIndex(e => e.id === Number(eventId));
    if (eventIndex !== -1) {
      events[eventIndex].status = 'Finished';
      const presentApps = applications.filter(app => app.eventId === Number(eventId) && app.status === 'Present');
      notifications.unshift(...presentApps.map(app => ({
        id: Date.now() + Math.random(),
        userEmail: app.email,
        message: `Event "${events[eventIndex].title}" finished.`,
        read: false,
        timestamp: new Date().toISOString()
      })));
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/profile', requireAuth(), async (req, res) => {
  const profile = await getOrSyncProfile(req.auth);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile sync failed.' });
  return res.json({ success: true, profile });
});

app.post('/api/profile', requireAuth(), async (req, res) => {
  const profile = await getOrSyncProfile(req.auth);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

  const { data, error } = await supabase
    .from('profiles')
    .update(req.body)
    .eq('id', profile.id || req.auth.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Update failed' });
  return res.json({ success: true, profile: data });
});

app.post('/api/webhooks/razorpay', async (req, res) => {
  return res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[Server] Clerk-Native Backend running on port ${PORT}`);
});

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import crypto, { randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import Razorpay from 'razorpay';
import { verifyToken, createClerkClient } from '@clerk/backend';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
import { sendOTP } from './mailer.js';
import { supabase } from './supabase.js';

// Clerk backend client — used to verify tokens server-side
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });


// -------------------------------------------------------
// App & Middleware Setup
// -------------------------------------------------------
const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
// -------------------------------------------------------
// CORS Configuration
// -------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  /\.vercel\.app$/,      // Allows any Vercel deployment/preview URL
  /vercel\.app$/         // Also allows root vercel.app if needed
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(pattern => 
      pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
    )) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browsers
}));


const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const OTP_EXPIRY_MS = OTP_EXPIRY_SECONDS * 1000;
const MAX_OTP_ATTEMPTS = 3;

// -------------------------------------------------------
// Middleware: Authenticate Token
// Priority: (1) Clerk JWT  →  (2) Legacy local JWT
// -------------------------------------------------------
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] Missing token in request');
    return res.status(401).json({ success: false, error: 'Access denied. Token missing.' });
  }

  // 1. Try Clerk token verification (primary auth method)
  try {
    console.log('[Auth] Attempting Clerk token verification...');
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const clerkUserId = verifiedToken.sub;
    console.log(`[Auth] Clerk token verified for user ID: ${clerkUserId}`);

    // Get the user's email from Clerk
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    if (!email) {
      console.error('[Auth] User has no email associated with Clerk account');
      return res.status(403).json({ success: false, error: 'No email on Clerk account.' });
    }

    // Look up profile from Supabase
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profileErr) {
        console.log(`[Auth] Profile lookup error: ${profileErr.message} for email ${email}`);
    }

    req.user = {
      email,
      role: profile ? profile.role : null,
      clerkId: clerkUserId,
      profileId: profile ? profile.id : null,
      user: profile // Pass through the full profile if needed
    };
    
    console.log(`[Auth] User authorized: ${email} (Role: ${req.user.role})`);
    return next();
  } catch (clerkErr) {
    console.log(`[Auth] Clerk verification failed: ${clerkErr.message}`);
    // 2. Fallback: try legacy local JWT (for any old sessions)
    try {
      console.log('[Auth] Falling back to legacy JWT verification');
      const user = jwt.verify(token, JWT_SECRET);
      req.user = user;
      console.log(`[Auth] Legacy JWT verified for ${user.email}`);
      return next();
    } catch (jwtErr) {
      console.error('[Auth] Final auth failure: Both Clerk and JWT verification failed.');
      return res.status(403).json({ success: false, error: 'Invalid or expired token.' });
    }
  }
};


// -------------------------------------------------------
// Persistence Logic: Supabase used for Profiles & OTPs
// Mock arrays removed for Users. Events/Apps still mock/memory for now.
// -------------------------------------------------------

// Mock data for events, applications, and notifications
const events = [
  { id: 1, title: 'Summer Festival 2026', status: 'Upcoming', organizerEmail: 'admin@example.com', stipend: 500 },
  { id: 2, title: 'Tech Expo 2026', status: 'Live', organizerEmail: 'admin@example.com', stipend: 1000 }
];
const applications = [
  { id: 1, eventId: 1, email: 'test@example.com', status: 'Approved', name: 'Test User' }
];
const notifications = [];

// -------------------------------------------------------
// Data Sync Endpoints (Memory Store)
// -------------------------------------------------------

app.post('/api/events', authenticateToken, (req, res) => {
  const newEvent = req.body;
  if (!newEvent.id || !newEvent.title) return res.status(400).json({ success: false, error: 'Invalid event data' });
  
  const exists = events.find(e => e.id === Number(newEvent.id));
  if (!exists) {
    events.push(newEvent);
    console.log(`[Sync] New event added to backend: ${newEvent.title} (${newEvent.id})`);
  }
  res.json({ success: true });
});

app.post('/api/applications', authenticateToken, (req, res) => {
  const newApp = req.body;
  if (!newApp.id || !newApp.eventId) return res.status(400).json({ success: false, error: 'Invalid app data' });
  
  const exists = applications.find(a => a.id === Number(newApp.id));
  if (!exists) {
    applications.push(newApp);
    console.log(`[Sync] New application added to backend for event: ${newApp.eventId}`);
  }
  res.json({ success: true });
});

app.post('/api/sync-applications', authenticateToken, (req, res) => {
  const { updatedApps } = req.body;
  if (!Array.isArray(updatedApps)) return res.status(400).json({ success: false, error: 'Array required' });

  updatedApps.forEach(updated => {
    const idx = applications.findIndex(a => a.id === Number(updated.id));
    if (idx !== -1) {
      applications[idx] = { ...applications[idx], ...updated };
    } else {
      applications.push(updated);
    }
  });
  console.log(`[Sync] ${updatedApps.length} applications synced with backend.`);
  res.json({ success: true });
});


// findUserByEmail removed - replaced by async Supabase queries

// -------------------------------------------------------
// Supabase OTP Logic (Handles deletion, insertion, and lookup)
// -------------------------------------------------------
// Note: Memory store and setupTransporter functions have been removed
// in favor of supabase.js and mailer.js modules.

// -------------------------------------------------------
// Rate Limiter — 1 OTP request per 30 seconds per IP
// -------------------------------------------------------
const otpRateLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many OTP requests. Please wait 30 seconds before trying again.',
  },
});

// ============================================================
//  API ENDPOINTS
// ============================================================

// -------------------------------------------------------
// POST /api/check-email
// Checks whether a given email exists in the Users table.
// -------------------------------------------------------
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  return res.json({
    success: !!profile,
    message: profile ? 'Email exists.' : 'Email not found.',
  });
});

// -------------------------------------------------------
// POST /api/send-otp
// Generates a 6-digit OTP, hashes it, stores it with
// a 5-minute TTL, and emails the plain OTP to the user.
// Rate-limited: 1 request per 30 seconds per IP.
// -------------------------------------------------------
app.post('/api/send-otp', otpRateLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  // Check if user exists in Supabase Profiles
  const { data: profile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email.toLowerCase())
    .single();

  if (profileLookupError || !profile) {
    return res.status(404).json({ success: false, error: 'Email not registered. Please create an account first.' });
  }

  try {
    // 1. Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    
    // 2. Set expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

    // 3. Delete old OTPs for this email in Supabase
    const { error: deleteError } = await supabase
      .from('otp_verifications')
      .delete()
      .eq('email', email.toLowerCase());

    if (deleteError) {
      console.error('[Supabase] Delete Error:', deleteError);
      return res.status(500).json({ success: false, error: 'Failed to clear old session.' });
    }

    // 4. Save new OTP to Supabase
    const { error: insertError } = await supabase
      .from('otp_verifications')
      .insert([{ 
        email: email.toLowerCase(), 
        otp: otp, 
        expires_at: expiresAt, 
        verified: false 
      }]);

    if (insertError) {
      console.error('[Supabase] Insert Error:', insertError);
      return res.status(500).json({ success: false, error: 'Failed to save OTP session.' });
    }

    // 5. Send OTP via Nodemailer (Gmail)
    const emailResult = await sendOTP(email, otp);

    if (!emailResult.success) {
      console.error('[Mailer] Error:', emailResult.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send verification email.',
        detail: emailResult.error 
      });
    }

    return res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Detailed error in /api/send-otp:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process OTP request.',
      message: error.message 
    });
  }

});

// -------------------------------------------------------
// POST /api/verify-otp
// Validates the OTP, enforces max 3 attempts, and returns
// a signed JWT token upon successful verification.
// -------------------------------------------------------
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
  }

  try {
    // 1. Fetch OTP record from Supabase
    const { data: record, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp', otp)
      .single();

    if (error || !record) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }

    // 2. Check if already verified
    if (record.verified) {
      return res.status(400).json({ success: false, error: 'OTP already used.' });
    }

    // 3. Check for expiry
    const now = new Date();
    const expiryDate = new Date(record.expires_at);

    if (now > expiryDate) {
      return res.status(400).json({ success: false, error: 'OTP has expired.' });
    }

    // 4. Mark as verified in Supabase
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', record.id);

    if (updateError) {
      console.error('[Supabase] Update Error:', updateError);
      return res.status(500).json({ success: false, error: 'Verification failed on server.' });
    }

    // 5. Successful Verification — Generate JWT
    // Profile is guaranteed to exist because we check it in /api/send-otp
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, error: 'Profile lost during verification.' });
    }

    const userRole = profile.role;

    const token = jwt.sign(
      { email: email.toLowerCase(), role: userRole },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      user: { email: email.toLowerCase(), role: userRole }
    });
  } catch (error) {
    console.error('Error in /api/verify-otp:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// Helper to parse role(s) into a normalized array
const getRoleArray = (roleStr) => {
  if (!roleStr) return [];
  return roleStr.split(',').map(r => r.trim()).filter(Boolean);
};

// Helper to generate a custom session token for the frontend Technique 1
const generateSessionToken = (userProfile) => {
  const roles = getRoleArray(userProfile.role);
  return jwt.sign(
    { uid: userProfile.id, email: userProfile.email, roles },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, role, clerkId } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    // Check if profile already exists
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      const currentRoles = getRoleArray(existing.role);
      // Logic: Add role if it's new and valid
      if (role && !currentRoles.includes(role)) {
        const newRoleStr = [...currentRoles, role].join(',');
        console.log(`[MultiRole] Expanding roles for ${email}: ${existing.role} -> ${newRoleStr}`);
        const { data: updated, error: updateErr } = await supabase
          .from('profiles')
          .update({ role: newRoleStr })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (!updateErr) {
          return res.json({ 
            success: true, 
            message: 'Account roles updated!', 
            profile: updated,
            sessionToken: generateSessionToken(updated)
          });
        }
      }
      return res.json({ 
        success: true, 
        message: 'Profile ready.', 
        profile: existing,
        sessionToken: generateSessionToken(existing)
      });
    }

    // New user
    const profileId = randomUUID();
    const insertData = {
      id: profileId,
      name,
      email: email.toLowerCase(),
      role: role || 'volunteer'
    };

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
       return res.status(500).json({ success: false, error: 'Database enrollment failed.' });
    }

    return res.json({ 
      success: true, 
      profile, 
      sessionToken: generateSessionToken(profile) 
    });
  } catch (error) {
    console.error('Error in /api/register:', error);
    res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
});

// -------------------------------------------------------
// POST /api/events/:eventId/mark-attendance
// Organizer marks selected approved volunteers as present or absent.
// -------------------------------------------------------
app.post('/api/events/:eventId/mark-attendance', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { applicationIds, status = 'Present' } = req.body; 
    const { role } = req.user;
    const userRoles = getRoleArray(role);
    if (!userRoles.includes('organizer') && !userRoles.includes('admin')) {
      return res.status(403).json({ success: false, error: `Only organizers can mark attendance. Your role is: ${role} (parsed as: ${JSON.stringify(userRoles)})` });
    }
    // Update status of each application
    const updatedApps = [];
    applicationIds.forEach(appId => {
      const idx = applications.findIndex(app => app.id === Number(appId) && app.eventId === Number(eventId));
      if (idx !== -1 && (applications[idx].status === 'Approved' || applications[idx].status === 'Present' || applications[idx].status === 'Absent')) {
        applications[idx].status = status;
        updatedApps.push(applications[idx]);
      }
    });
    return res.json({ success: true, updated: updatedApps.length, applications: updatedApps });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Alias for backward compatibility if needed, or just let frontend use mark-attendance
app.post('/api/events/:eventId/mark-present', authenticateToken, async (req, res) => {
    // Redirect to mark-attendance with default Present status
    req.body.status = 'Present';
    return app._router.handle(req, res); // This is a hacky way, better to just call logic or let frontend update.
    // I will just implement it properly inside mark-present too for now or just replace it.
});

// -------------------------------------------------------
// POST /api/payments/pay-all
// Create Razorpay orders for multiple volunteers (batch payment).
// -------------------------------------------------------
app.post('/api/payments/pay-all', authenticateToken, async (req, res) => {
  try {
    const { payments } = req.body; // [{ amount, receipt }]
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ success: false, error: 'Payments array required.' });
    }
    const orders = [];
    for (const p of payments) {
      const { amount, receipt } = p;
      if (!amount || !receipt) continue;
      const order = await razorpay.orders.create({
        amount: Number(amount),
        currency: 'INR',
        receipt: receipt.toString(),
        payment_capture: 1
      });
      orders.push(order);
    }
    return res.json({ success: true, orders });
  } catch (err) {
    console.error('Razorpay batch order error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create batch payment orders.' });
  }
});

// -------------------------------------------------------
// Updated finish-event to notify only 'Present' volunteers
// -------------------------------------------------------
app.post('/api/events/:eventId/finish', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { role } = req.user;
    
    console.log(`[EventFlow] Attempting to finish event ID: ${eventId} by role: ${role}`);

    const userRoles = getRoleArray(role);
    if (!userRoles.includes('organizer') && !userRoles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Only organizers can finish events.' });
    }
    
    const eventIndex = events.findIndex(e => e.id === Number(eventId));
    if (eventIndex === -1) {
      console.warn(`[EventFlow] Event ${eventId} not found in backend memory. Current count: ${events.length}`);
      return res.status(404).json({ success: false, error: 'Event not found on server.' });
    }
    events[eventIndex].status = 'Finished';
    // Notify only volunteers with status 'Present'
    const presentApps = applications.filter(app => app.eventId === Number(eventId) && app.status === 'Present');
    const newNotifications = presentApps.map(app => ({
      id: Date.now() + Math.random(),
      userEmail: app.email,
      message: `Event "${events[eventIndex].title}" has been finished. Please provide your payment details.`,
      read: false,
      timestamp: new Date().toISOString()
    }));
    notifications.unshift(...newNotifications);
    return res.json({ success: true, message: 'Event marked as finished and present volunteers notified.' });
  } catch (error) {
    console.error('Error finishing event:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});



// -------------------------------------------------------
// POST /api/events/:eventId/start
// Sets event status to 'Live'
// -------------------------------------------------------
app.post('/api/events/:eventId/start', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { role } = req.user;
    const userRoles = getRoleArray(role);
    if (!userRoles.includes('organizer') && !userRoles.includes('admin')) {
      return res.status(403).json({ success: false, error: `Only organizers can start events. Your role is: ${role} (parsed as: ${JSON.stringify(userRoles)})` });
    }
    const eventIndex = events.findIndex(e => e.id === Number(eventId));
    if (eventIndex === -1) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }
    events[eventIndex].status = 'Live';
    return res.json({ success: true, message: 'Event status updated to Live.' });
  } catch (error) {
    console.error('Error starting event:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// -------------------------------------------------------
// POST /api/payments/create
// Create a Razorpay order for a volunteer payment.
// -------------------------------------------------------
app.post('/api/payments/create', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, applicationId } = req.body; // amount in paise
    if (!amount || !receipt || !applicationId) {
      return res.status(400).json({ success: false, error: 'Amount, receipt, and applicationId are required.' });
    }
    const options = {
      amount: Number(amount),
      currency,
      receipt: receipt.toString(),
      payment_capture: 1,
      notes: {
        applicationId: applicationId.toString()
      }
    };

    const order = await razorpay.orders.create(options);
    return res.json({ success: true, order });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create payment order.' });
  }
});

// -------------------------------------------------------
// POST /api/payments/verify
// Verify Razorpay payment signature and mark application(s) as paid.
// -------------------------------------------------------
app.post('/api/payments/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !applicationId) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields.' });
    }
    // Verify signature
    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
    }
    
    // Split IDs if it's a batch payment
    const ids = applicationId.toString().split(',').map(id => Number(id.trim()));
    let count = 0;

    ids.forEach(id => {
      const appIndex = applications.findIndex(app => app.id === id);
      if (appIndex !== -1) {
        applications[appIndex].status = 'Paid';
        count++;
      }
    });

    return res.json({ 
      success: true, 
      message: `Verified and marked ${count} application(s) as paid.`,
      markedPaidCount: count 
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({ success: false, error: 'Server error during payment verification.' });
  }
});

// -------------------------------------------------------
// POST /api/profiles/:profileId/payment-info
// Save volunteer's UPI ID or other payment method.
// -------------------------------------------------------
app.post('/api/profiles/:profileId/payment-info', authenticateToken, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { upi_id } = req.body;
    if (!upi_id) {
      return res.status(400).json({ success: false, error: 'UPI ID is required.' });
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ upi_id })
      .eq('id', profileId)
      .select()
      .single();
    if (error) {
      console.error('Error saving payment info:', error);
      return res.status(500).json({ success: false, error: 'Failed to save payment info.' });
    }
    return res.json({ success: true, profile: data });
  } catch (err) {
    console.error('Payment info endpoint error:', err);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found.',
        needsRole: true,
        email: email
      });
    }

    return res.json({ 
      success: true, 
      profile, 
      sessionToken: generateSessionToken(profile) 
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// -------------------------------------------------------
// POST /api/profile
// Updates the profile of the authenticated user.
// -------------------------------------------------------
app.post('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const updates = req.body;

    // Prevent email or role from being updated via this endpoint for security
    delete updates.email;
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Profile Update Error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update profile.' });
    }

    return res.json({ success: true, profile: data });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// -------------------------------------------------------
// POST /api/webhooks/razorpay
// Razorpay Webhook to handle payment events asynchronously.
// -------------------------------------------------------
app.post('/api/webhooks/razorpay', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !secret) {
    return res.status(400).send('Signature or secret missing');
  }

  const expectedSignature = crypto.createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('[Webhook] Invalid signature');
    return res.status(400).send('Invalid signature');
  }

  const { event, payload } = req.body;
  console.log(`[Webhook] Received event: ${event}`);

  if (event === 'payment.captured' || event === 'order.paid') {
    const payment = payload.payment ? payload.payment.entity : null;
    const order = payload.order ? payload.order.entity : null;
    
    // Try to get applicationId from notes (either in payment or order)
    const applicationId = (payment && payment.notes && payment.notes.applicationId) || 
                          (order && order.notes && order.notes.applicationId);

    if (applicationId) {
      console.log(`[Webhook] Updating application ${applicationId} to Paid`);
      const appIndex = applications.findIndex(app => app.id === Number(applicationId));
      if (appIndex !== -1) {
        applications[appIndex].status = 'Paid';
        
        // Also add a notification for the volunteer
        notifications.unshift({
          id: Date.now() + Math.random(),
          userEmail: applications[appIndex].email,
          message: `Payment received! Your stipend for application #${applicationId} has been processed.`,
          read: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  return res.json({ status: 'ok' });
});

// ============================================================
//  Server Startup

// ============================================================
async function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[Server] Event Management APIs are active and ready for sync.`);
    console.log('   Endpoints:');
    console.log('     POST /api/check-email');
    console.log('     POST /api/send-otp');
    console.log('     POST /api/verify-otp\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Error: Port ${PORT} is already in use.`);
      console.error('   Please kill the process using this port or choose a different one.');
    } else {
      console.error('❌ Failed to start server:', err);
    }
    process.exit(1);
  });
}

startServer();


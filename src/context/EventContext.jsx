import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { mockEventsData } from '../data/mockEvents';
import { supabase } from '../supabaseClient'; 
import api, { setTokenProvider } from '../api';

const EventContext = createContext();

export const useEvents = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  
  // Register the token provider so api.js can fetch tokens on demand
  useEffect(() => {
    if (clerkLoaded) {
      setTokenProvider(getToken);
    }
  }, [clerkLoaded, getToken]);

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('app_events');
    return saved ? JSON.parse(saved) : mockEventsData;
  });
  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem('app_applications');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [user, setUser] = useState(null); 
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('app_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Persists
  useEffect(() => { localStorage.setItem('app_events', JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem('app_applications', JSON.stringify(applications)); }, [applications]);
  useEffect(() => { localStorage.setItem('app_notifications', JSON.stringify(notifications)); }, [notifications]);

  /**
   * Sync Profile Logic
   * Automatically fetches or creates a Supabase profile for the Clerk user.
   */
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    const syncProfile = async () => {
      try {
        setAuthLoading(true);
        console.log(`[Sync] Attempting to reach backend: ${api.defaults.baseURL}/profile`);
        
        const response = await api.get('/profile');
        
        if (response.data.success && response.data.profile) {
          console.log('[Sync] Profile synced successfully from backend.');
          setUser(response.data.profile);
        } else {
          throw new Error('Backend sync returned invalid response.');
        }
      } catch (err) {
        // DETAILED DIAGNOSTIC LOGGING
        if (!err.response) {
          console.error('[Sync] FATAL: Backend server is unreachable. Check VITE_API_BASE_URL.');
        } else {
          console.warn('[Sync] Backend sync failed with status:', err.response.status);
        }

        // Fail-safe: Always provide a user object so the UI doesn't hang
        if (clerkUser) {
          console.log('[Sync] Using fail-safe Clerk profile.');
          setUser({
            email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses[0].emailAddress,
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            role: 'volunteer',
            id: clerkUser.id,
            isFallback: true
          });
        }
      } finally {
        setAuthLoading(false);
      }
    };

    syncProfile();
  }, [clerkLoaded, isSignedIn, clerkUser]);

  const logout = async () => {
    sessionStorage.removeItem('activePortal');
    setUser(null);
  };

  const switchActivePortal = async (role) => {
    if (!isSignedIn || !clerkUser) return { success: false, error: 'Not authenticated' };
    try {
      console.log(`[RoleSwitch] Switching to ${role}...`);
      const response = await api.post('/api/user/switch-role', { role });
      
      if (response.data.success) {
        // Force Clerk to reload user metadata in the session
        await clerkUser.reload();
        
        sessionStorage.setItem('activePortal', role);
        console.log(`[RoleSwitch] Success. Reloaded session.`);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (err) {
      console.error('[RoleSwitch] Error:', err);
      return { success: false, error: 'Failed to switch portal natively' };
    }
  };

  const setRole = async (role) => {
    // Legacy support for setRole
    return await switchActivePortal(role);
  };

  const startEvent = async (eventId) => {
    try {
      const response = await api.post(`/events/${eventId}/start`);
      if (response.data.success) {
        setEvents(prev => prev.map(e => e.id === Number(eventId) ? { ...e, status: 'Live' } : e));
      }
      return response.data;
    } catch (error) { 
      return { success: false, error: error.response?.data?.error || 'Connection error' }; 
    }
  };

  const finishEvent = async (eventId) => {
    try {
      // Aligned with user's specific request for /api/events/end
      const response = await api.post('/api/events/end', { eventId });
      if (response.data.success) {
        setEvents(prev => prev.map(e => e.id === Number(eventId) ? { ...e, status: 'Finished' } : e));
      }
      return response.data;
    } catch (error) { 
      console.error('[EventFlow] Connection failed:', error.message);
      return { success: false, error: error.response?.data?.error || 'Connection error: Backend unreachable' }; 
    }
  };

  const markAttendance = async (eventId, applicationIds, status = 'Present') => {
    try {
      const response = await api.post(`/events/${eventId}/mark-attendance`, { applicationIds, status });
      if (response.data.success) {
        setApplications(prev => prev.map(app => applicationIds.includes(app.id) ? { ...app, status } : app));
      }
      return response.data;
    } catch (error) { return { success: false, error: 'Connection error' }; }
  };

  const createPayment = async (amount, receipt, applicationId) => {
    try {
      const response = await api.post('/payments/create', { amount, receipt, applicationId });
      return response.data;
    } catch (error) { return { success: false, error: 'Connection error' }; }
  };

  const confirmPayment = async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      if (response.data.success) {
        const ids = paymentData.applicationId.toString().split(',').map(id => Number(id.trim()));
        setApplications(prev => prev.map(app => ids.includes(app.id) ? { ...app, status: 'Paid' } : app));
      }
      return response.data;
    } catch (error) { return { success: false, error: 'Connection error' }; }
  };

  const payAll = async (payments) => {
    try {
      const response = await api.post('/payments/pay-all', { payments });
      return response.data;
    } catch (error) { return { success: false, error: 'Connection error' }; }
  };

  const savePaymentInfo = async (upiId) => {
    try {
      const response = await api.post('/profile', { upi_id: upiId });
      if (response.data.success) setUser(response.data.profile);
      return response.data;
    } catch (error) { return { success: false, error: 'Connection error' }; }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addEvent = async (newEvent) => {
    const id = Date.now();
    const eventWithId = { ...newEvent, id, organizerEmail: user?.email };
    setEvents([...events, eventWithId]);
    if (isSignedIn) await api.post('/events', eventWithId).catch(() => {});
  };

  const applyToEvent = async (eventId, userDetails) => {
    const id = Date.now();
    const newApplication = {
      id, eventId, ...userDetails,
      status: 'Pending', appliedAt: new Date().toISOString()
    };
    setApplications([...applications, newApplication]);
    if (isSignedIn) await api.post('/applications', newApplication).catch(() => {});
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    let updatedApp = null;
    setApplications(apps => apps.map(app => {
      if (app.id === applicationId) {
        updatedApp = { ...app, status: newStatus };
        return updatedApp;
      }
      return app;
    }));
  };

  const fetchProfilesByEmails = async (emails) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, upi_id')
        .in('email', emails);
      if (error) throw error;
      return data;
    } catch (error) { return []; }
  };

  return (
    <EventContext.Provider value={{
      events, applications, user, authLoading, notifications,
      clerkLoaded, isSignedIn, clerkUser,
      logout, setRole, switchActivePortal,
      markNotificationAsRead, addEvent,
      applyToEvent, updateApplicationStatus,
      startEvent, finishEvent, markAttendance,
      createPayment, payAll, confirmPayment, savePaymentInfo,
      fetchProfilesByEmails
    }}>
      {children}
    </EventContext.Provider>
  );
};

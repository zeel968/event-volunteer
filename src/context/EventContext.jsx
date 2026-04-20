import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { mockEventsData } from '../data/mockEvents';
import { supabase } from '../supabaseClient'; 
import api from '../api';

const EventContext = createContext();

export const useEvents = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const hasHydrated = useRef(false);

  // --- API MANAGEMENT ---
  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('custom_api_url');
    return saved || import.meta.env.VITE_API_BASE_URL || 'https://web-production-ce51a.up.railway.app/api';
  });

  const updateApiUrl = (newUrl) => {
    let sanitized = newUrl.trim();
    if (!sanitized.startsWith('http')) sanitized = 'https://' + sanitized;
    if (sanitized.endsWith('/')) sanitized = sanitized.slice(0, -1);
    if (!sanitized.endsWith('/api')) sanitized += '/api';

    localStorage.setItem('custom_api_url', sanitized);
    setApiUrl(sanitized);
    api.defaults.baseURL = sanitized; 
    window.location.reload();
  };

  useEffect(() => {
    api.defaults.baseURL = apiUrl;
  }, [apiUrl]);
  // ------------------------------

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('app_events');
    return saved ? JSON.parse(saved) : mockEventsData;
  });
  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem('app_applications');
    return saved ? JSON.parse(saved) : [];
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('app_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('app_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('app_events', JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem('app_applications', JSON.stringify(applications)); }, [applications]);
  useEffect(() => { localStorage.setItem('app_current_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('app_notifications', JSON.stringify(notifications)); }, [notifications]);

  /**
   * Centralized Auth Verification
   * Replaces the old "Security Handshake"
   */
  const checkAuth = async () => {
    if (!isSignedIn) {
      setUser(null);
      localStorage.removeItem('clerk-db-session');
      setAuthLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('No session token');
      
      // Store token for Axios interceptor
      localStorage.setItem('clerk-db-session', token);

      // Call the simplified verification endpoint
      const response = await api.get('/auth/verify');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        throw new Error('Verification failed');
      }
    } catch (err) {
      console.error('[AuthCheck] JWT Verification Failed:', err.message);
      setUser(null);
      localStorage.removeItem('clerk-db-session');
    } finally {
      setAuthLoading(false);
    }
  };

  // Run verification on app load / auth change
  useEffect(() => {
    if (clerkLoaded) {
      checkAuth();
    }
  }, [clerkLoaded, isSignedIn]);

  // Synchronize browser state to backend if logged in
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || hasHydrated.current || authLoading) return;

    const hydrateBackend = async () => {
      console.log('[Sync] Hydrating backend with local data...');
      
      try {
        // Sync events
        for (const event of events) {
          await api.post('/events', event).catch(() => {});
        }

        // Sync applications
        if (applications.length > 0) {
          await api.post('/sync-applications', { updatedApps: applications }).catch(() => {});
        }

        hasHydrated.current = true;
        console.log('[Sync] Backend hydration complete.');
      } catch (err) {
        console.error('[Sync] Hydration failed:', err);
      }
    };

    hydrateBackend();
  }, [clerkLoaded, isSignedIn, authLoading]);

  const login = async (email, role, token) => {
    if (token) {
        localStorage.setItem('clerk-db-session', token);
        const response = await api.get('/auth/verify').catch(() => null);
        if (response?.data?.success) {
            setUser(response.data.user);
            return true;
        }
    }
    return false;
  };

  const logout = async () => {
    localStorage.removeItem('clerk-db-session');
    localStorage.removeItem('session_token');
    sessionStorage.removeItem('activePortal');
    setUser(null);
  };

  const setRole = async (role) => {
    if (!clerkUser) return { success: false, error: 'Not authenticated' };
    
    try {
      const email = clerkUser.primaryEmailAddress ? clerkUser.primaryEmailAddress.emailAddress : clerkUser.emailAddresses[0].emailAddress;
      const name = clerkUser.fullName || email.split('@')[0];

      const response = await api.post('/register', { name, email, role, clerkId: clerkUser.id });
      if (response.data.success) {
        await checkAuth();
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (err) {
      console.error('Set role error:', err);
      return { success: false, error: 'Network error' };
    }
  };

  const startEvent = async (eventId) => {
    try {
      const response = await api.post(`/events/${eventId}/start`);
      if (response.data.success) {
        setEvents(prev => prev.map(e => e.id === Number(eventId) ? { ...e, status: 'Live' } : e));
      }
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const finishEvent = async (eventId) => {
    try {
      const response = await api.post(`/events/${eventId}/finish`);
      if (response.data.success) {
        setEvents(prev => prev.map(e => e.id === Number(eventId) ? { ...e, status: 'Finished' } : e));
      }
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const markAttendance = async (eventId, applicationIds, status = 'Present') => {
    try {
      const response = await api.post(`/events/${eventId}/mark-attendance`, { applicationIds, status });
      if (response.data.success) {
        setApplications(prev => prev.map(app => applicationIds.includes(app.id) ? { ...app, status } : app));
      }
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const createPayment = async (amount, receipt, applicationId) => {
    try {
      const response = await api.post('/payments/create', { amount, receipt, applicationId });
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const confirmPayment = async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      if (response.data.success) {
        const ids = paymentData.applicationId.toString().split(',').map(id => Number(id.trim()));
        setApplications(prev => prev.map(app => ids.includes(app.id) ? { ...app, status: 'Paid' } : app));
      }
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const payAll = async (payments) => {
    try {
      const response = await api.post('/payments/pay-all', { payments });
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const savePaymentInfo = async (upiId) => {
    try {
      const profileId = user ? user.id : clerkUser ? clerkUser.id : null;
      const response = await api.post(`/profiles/${profileId}/payment-info`, { upi_id: upiId });
      if (response.data.success) setUser(prev => ({ ...prev, upi_id: upiId }));
      return response.data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addEvent = async (newEvent) => {
    const id = Date.now();
    const eventWithId = { ...newEvent, id, organizerEmail: user?.email };
    setEvents([...events, eventWithId]);

    if (isSignedIn) {
      await api.post('/events', eventWithId).catch(err => console.error('[Sync] Failed to sync event:', err));
    }
  };

  const applyToEvent = async (eventId, userDetails) => {
    const id = Date.now();
    const newApplication = {
      id, eventId, ...userDetails,
      status: 'Pending', appliedAt: new Date().toISOString()
    };
    setApplications([...applications, newApplication]);

    if (isSignedIn) {
        await api.post('/applications', newApplication).catch(err => console.error('[Sync] Failed to sync application:', err));
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    let updatedApp = null;
    setApplications(apps => apps.map(app => {
      if (app.id === applicationId) {
        updatedApp = { ...app, status: newStatus };
        if (newStatus === 'Approved' && app.status !== 'Approved') {
          setEvents(currentEvents => currentEvents.map(event => {
            if (event.id === app.eventId && event.availableSlots > 0) {
              const newNotification = {
                id: Date.now(), userEmail: app.email,
                message: 'Your application for ' + event.title + ' has been approved!',
                read: false, timestamp: new Date().toISOString()
              };
              setNotifications(prev => [newNotification, ...prev]);
              return { ...event, availableSlots: event.availableSlots - 1 };
            }
            return event;
          }));
        }
        return updatedApp;
      }
      return app;
    }));

    if (isSignedIn && updatedApp) {
        await api.post('/sync-applications', { updatedApps: [updatedApp] }).catch(err => console.error('[Sync] Failed to sync application status:', err));
    }
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
      login, logout, setRole,
      markNotificationAsRead, addEvent,
      applyToEvent, updateApplicationStatus,
      startEvent, finishEvent, markAttendance,
      createPayment, payAll, confirmPayment, savePaymentInfo,
      fetchProfilesByEmails,
      apiUrl, updateApiUrl
    }}>
      {children}
    </EventContext.Provider>
  );
};

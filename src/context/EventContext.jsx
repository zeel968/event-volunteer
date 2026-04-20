import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { mockEventsData } from '../data/mockEvents';
import { supabase } from '../supabaseClient'; 

const EventContext = createContext();

export const useEvents = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const hasHydrated = useRef(false);

  // --- AUTO-HEALING API LOGIC ---
  const [apiUrl, setApiUrl] = useState(() => {
    // 1. Check localStorage for a custom fix
    const saved = localStorage.getItem('custom_api_url');
    // 2. Fallback to Environment Variable or production default
    return saved || import.meta.env.VITE_API_BASE_URL || 'https://event-volunteer-production.up.railway.app/api';
  });

  const updateApiUrl = (newUrl) => {
    let sanitized = newUrl.trim();
    if (!sanitized.startsWith('http')) sanitized = 'https://' + sanitized;
    if (sanitized.endsWith('/')) sanitized = sanitized.slice(0, -1);
    if (!sanitized.endsWith('/api')) sanitized += '/api';

    localStorage.setItem('custom_api_url', sanitized);
    setApiUrl(sanitized);
    // Reload to ensure all context and effects catch the change
    window.location.reload();
  };
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

  const syncProfile = async (clerkToken) => {
    try {
      const response = await fetch(apiUrl + '/profile', {
        headers: { 'Authorization': 'Bearer ' + clerkToken }
      });
      
      if (!response.ok) {
         console.warn(`[Sync] Profile fetch failed with status: ${response.status}`);
         return null;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.includes("<!DOCTYPE html>")) {
           console.error("[Sync] Critical: Server returned HTML instead of JSON. Check VITE_API_BASE_URL and Vercel rewrites.");
        }
        return null;
      }

      const data = await response.json();
      if (data.success) {
        if (data.sessionToken) {
          localStorage.setItem('session_token', data.sessionToken);
        }
        setUser({ ...data.profile });
        return data.profile;
      }
    } catch (err) {
      console.error('Profile sync error:', err);
    }
    return null;
  };

  // Hydrate backend memory with local storage data
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || hasHydrated.current) return;

    const hydrateBackend = async () => {
      const token = await getToken();
      if (!token) return;

      console.log('[Sync] Hydrating backend with local data...');
      
      // Sync events
      for (const event of events) {
        await fetch(apiUrl + '/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(event)
        }).catch(() => {});
      }

      // Sync applications
      if (applications.length > 0) {
        await fetch(apiUrl + '/sync-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ updatedApps: applications })
        }).catch(() => {});
      }

      hasHydrated.current = true;
      console.log('[Sync] Backend hydration complete.');
    };

    hydrateBackend();
  }, [clerkLoaded, isSignedIn]);

  useEffect(() => {
    if (!clerkLoaded) return;

    const handleAuthChange = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            await syncProfile(token);
          }
        } catch (err) {
          console.error('[EventContext] Auth change sync error:', err);
        }
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
      setAuthLoading(false);
    };

    handleAuthChange();
  }, [clerkLoaded, isSignedIn]);

  const login = async (email, role, token) => {
    if (token) {
      const profile = await syncProfile(token);
      if (profile) return true;
    }
    return false;
  };

  const logout = async () => {
    localStorage.removeItem('session_token');
    sessionStorage.removeItem('activePortal');
    setUser(null);
  };

  const setRole = async (role) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    if (!token || !clerkUser) return { success: false, error: 'Not authenticated' };
    
    try {
      const email = clerkUser.primaryEmailAddress ? clerkUser.primaryEmailAddress.emailAddress : clerkUser.emailAddresses[0].emailAddress;
      const name = clerkUser.fullName || email.split('@')[0];

      const response = await fetch(apiUrl + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, clerkId: clerkUser.id })
      });
      const data = await response.json();
      if (data.success) {
        await syncProfile(token);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error('Set role error:', err);
      return { success: false };
    }
  };

  const startEvent = async (eventId) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const response = await fetch(apiUrl + '/events/' + eventId + '/start', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await response.json();
      if (data.success) {
        setEvents(prev => prev.map(e => e.id === Number(eventId) ? { ...e, status: 'Live' } : e));
      }
      return data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const finishEvent = async (eventId) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const response = await fetch(apiUrl + '/events/' + eventId + '/finish', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await response.json();
      if (data.success) {
        setEvents(prev => prev.map(e => e.id === Number(eventId) ? { ...e, status: 'Finished' } : e));
      }
      return data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const markAttendance = async (eventId, applicationIds, status = 'Present') => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const response = await fetch(apiUrl + '/events/' + eventId + '/mark-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ applicationIds, status })
      });
      const data = await response.json();
      if (data.success) {
        setApplications(prev => prev.map(app => applicationIds.includes(app.id) ? { ...app, status } : app));
      }
      return data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const createPayment = async (amount, receipt, applicationId) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const response = await fetch(apiUrl + '/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ amount, receipt, applicationId })
      });
      return await response.json();
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const confirmPayment = async (paymentData) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const response = await fetch(apiUrl + '/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(paymentData)
      });
      const data = await response.json();
      if (data.success) {
        const ids = paymentData.applicationId.toString().split(',').map(id => Number(id.trim()));
        setApplications(prev => prev.map(app => ids.includes(app.id) ? { ...app, status: 'Paid' } : app));
      }
      return data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const payAll = async (payments) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const response = await fetch(apiUrl + '/payments/pay-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ payments })
      });
      return await response.json();
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const savePaymentInfo = async (upiId) => {
    const token = await getToken() || localStorage.getItem('auth_token');
    try {
      const profileId = user ? user.id : clerkUser ? clerkUser.id : null;
      const response = await fetch(apiUrl + '/profiles/' + profileId + '/payment-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ upi_id: upiId })
      });
      const data = await response.json();
      if (data.success) setUser(prev => ({ ...prev, upi_id: upiId }));
      return data;
    } catch (error) { return { success: false, error: 'Network error' }; }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addEvent = async (newEvent) => {
    const id = Date.now();
    const eventWithId = { ...newEvent, id, organizerEmail: user?.email };
    setEvents([...events, eventWithId]);

    const token = await getToken() || localStorage.getItem('auth_token');
    if (token) {
      await fetch(apiUrl + '/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(eventWithId)
      }).catch(err => console.error('[Sync] Failed to sync event:', err));
    }
  };

  const applyToEvent = async (eventId, userDetails) => {
    const id = Date.now();
    const newApplication = {
      id, eventId, ...userDetails,
      status: 'Pending', appliedAt: new Date().toISOString()
    };
    setApplications([...applications, newApplication]);

    const token = await getToken() || localStorage.getItem('auth_token');
    if (token) {
        await fetch(apiUrl + '/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(newApplication)
        }).catch(err => console.error('[Sync] Failed to sync application:', err));
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

    const token = await getToken() || localStorage.getItem('auth_token');
    if (token && updatedApp) {
        await fetch(apiUrl + '/sync-applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ updatedApps: [updatedApp] })
        }).catch(err => console.error('[Sync] Failed to sync application status:', err));
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

  const [handshakeFailed, setHandshakeFailed] = useState(false);
  const [handshakeError, setHandshakeError] = useState(null);

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
      handshakeFailed, setHandshakeFailed,
      handshakeError, setHandshakeError,
      apiUrl, updateApiUrl
    }}>
      {children}
    </EventContext.Provider>
  );
};

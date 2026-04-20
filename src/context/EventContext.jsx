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
  
  // Basic State
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('app_events');
    return saved ? JSON.parse(saved) : mockEventsData;
  });
  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem('app_applications');
    return saved ? JSON.parse(saved) : [];
  });
  const [user, setUser] = useState(null); // This is the Supabase Profile
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
        const response = await api.get('/profile');
        if (response.data.success && response.data.profile) {
          setUser(response.data.profile);
        }
      } catch (err) {
        console.error('[Sync] Profile sync failed:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    syncProfile();
  }, [clerkLoaded, isSignedIn]);

  const logout = async () => {
    sessionStorage.removeItem('activePortal');
    setUser(null);
  };

  // Helper for manual role switching/setting if needed
  const setRole = async (role) => {
    if (!isSignedIn) return { success: false, error: 'Not authenticated' };
    try {
      const response = await api.post('/profile', { role });
      if (response.data.success) {
        setUser(response.data.profile);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (err) {
      return { success: false, error: 'Sync failed' };
    }
  };

  // Business Logic
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
      const response = await api.post('/profile', { upi_id: upiId });
      if (response.data.success) setUser(response.data.profile);
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
      logout, setRole,
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

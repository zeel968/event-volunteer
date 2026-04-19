import { Navigate, useLocation } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * ProtectedRoute - Enforces 'Separate Login URLs' logic.
 * Checks for BOTH successful Clerk auth AND the correct activePortal in sessionStorage.
 */
const ProtectedRoute = ({ children, requiredPortal }) => {
  const { user, authLoading, clerkLoaded, isSignedIn } = useEvents();
  const location = useLocation();
  const [activePortal, setActivePortal] = useState(sessionStorage.getItem('activePortal'));

  // Sync portal state from session storage on ogni route change
  useEffect(() => {
    setActivePortal(sessionStorage.getItem('activePortal'));
  }, [location.pathname]);

  if (!clerkLoaded || authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0b' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  // 1. Core Auth Check (Clerk)
  if (!isSignedIn) {
    // If not signed in, go back to the SPECIFIC login page for this route
    return <Navigate to={`/${requiredPortal}/login`} state={{ from: location }} replace />;
  }

  // 2. Profile Sync Check
  if (!user) {
    // This handles the transition/sync phase. 
    // We don't redirect to /auth-redirect anymore; we stay on portal login or handle sync in context.
    // For simplicity with 'Separate URLs', we'll redirect back to login if no profile exists.
    return <Navigate to={`/${requiredPortal}/login`} replace />;
  }

  // 3. Portal Isolation Check (Technique 1 requirement)
  // If user is logged into Clerk but activePortal doesn't match the route's requirement,
  // we treat them as unauthorized for THIS specific portal.
  if (requiredPortal && activePortal !== requiredPortal) {
    console.warn(`[PortalGuard] Access denied. Current: ${activePortal}, Required: ${requiredPortal}`);
    // Boot them back to the login page of the PORTAL they are trying to access
    return <Navigate to={`/${requiredPortal}/login`} replace />;
  }

  return children;
};

export default ProtectedRoute;

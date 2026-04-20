import { Navigate, useLocation } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * ProtectedRoute - Enforces 'Separate Login URLs' logic.
 * Checks for BOTH successful Clerk auth AND the correct activePortal in sessionStorage.
 */
const ProtectedRoute = ({ children, requiredPortal }) => {
  const { user, isLoaded: clerkLoaded, authLoading, handshakeFailed, isSignedIn } = useEvents();
  const location = useLocation();
  const [activePortal, setActivePortal] = useState(sessionStorage.getItem('activePortal'));

  // Sync portal state from session storage on ogni route change
  useEffect(() => {
    setActivePortal(sessionStorage.getItem('activePortal'));
  }, [location.pathname]);

  // 1. Loading State
  if (!clerkLoaded || authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Verifying security session...</p>
      </div>
    );
  }

  // 2. Not Signed In (Clerk)
  if (!isSignedIn) {
    console.log('[ProtectedRoute] User not signed in. Redirecting to login.');
    return <Navigate to={`/${requiredPortal}/login`} state={{ from: location }} replace />;
  }

  // 3. Handshake Failure Guard
  // If the security handshake previously failed, DO NOT redirect back to it.
  // This breaks the infinite flicker loop.
  if (handshakeFailed) {
    console.warn('[ProtectedRoute] Handshake failed previously. Staying on current page/login.');
    return <Navigate to={`/${requiredPortal}/login?error=handshake_failed`} replace />;
  }

  // 4. Portal Isolation Check
  // Check if they are in the wrong portal session
  if (requiredPortal && activePortal && activePortal !== requiredPortal) {
    console.warn(`[PortalGuard] Portal mismatch. Current: ${activePortal}, Required: ${requiredPortal}`);
    // Boot them back to the login page of the PORTAL they are trying to access
    return <Navigate to={`/${requiredPortal}/login`} replace />;
  }

  // 5. Missing Profile Check
  // If signed in but no profile exists in context yet
  if (!user) {
    console.warn('[ProtectedRoute] Signed in but no profile found. Handshake might be required.');
    // If we have no activePortal, we MUST go to login to pick one
    if (!activePortal) {
      return <Navigate to={`/${requiredPortal}/login`} replace />;
    }
    // Only redirect to handshake if it HASN'T failed yet
    return <Navigate to={`/auth-redirect?portal=${activePortal}`} replace />;
  }

  return children;
};

export default ProtectedRoute;

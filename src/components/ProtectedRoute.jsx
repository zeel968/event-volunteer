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

  // 3. Profile Isolation Check (Technique 1 requirement)
  // Check if they are in the wrong portal session
  if (requiredPortal && activePortal && activePortal !== requiredPortal) {
    console.warn(`[PortalGuard] Portal mismatch. Current: ${activePortal}, Required: ${requiredPortal}`);
    // Boot them back to the login page of the PORTAL they are trying to access
    return <Navigate to={`/${requiredPortal}/login`} replace />;
  }

  // 4. Missing Profile Check
  // If signed in but no profile exists in context yet
  if (!user) {
    console.warn('[ProtectedRoute] Signed in but no profile found. Handshake might be required.');
    // If we have no activePortal, we MUST go to login to pick one
    if (!activePortal) {
      return <Navigate to={`/${requiredPortal}/login`} replace />;
    }
    // If we have an activePortal but no profile, redirect to handshake
    return <Navigate to={`/auth-redirect?portal=${activePortal}`} replace />;
  }

  return children;
};

export default ProtectedRoute;

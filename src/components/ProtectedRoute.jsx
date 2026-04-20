import { Navigate, useLocation } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * ProtectedRoute - Enforces native Clerk auth and Portal isolation.
 */
const ProtectedRoute = ({ children, requiredPortal }) => {
  const { clerkLoaded, isSignedIn, authLoading } = useEvents();
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
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Verifying session...</p>
      </div>
    );
  }

  // 2. Not Signed In (Clerk Native)
  if (!isSignedIn) {
    return <Navigate to={`/${requiredPortal}/login`} state={{ from: location }} replace />;
  }

  // 3. Portal Isolation Check
  if (requiredPortal && activePortal && activePortal !== requiredPortal) {
    console.warn(`[PortalGuard] Portal mismatch. Current: ${activePortal}, Required: ${requiredPortal}`);
    return <Navigate to={`/${requiredPortal}/login`} replace />;
  }

  return children;
};

export default ProtectedRoute;

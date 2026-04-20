import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { Loader2 } from 'lucide-react';

/**
 * AuthRedirect - Simplified bridge for automated authentication.
 * Now just waits for context to verify background session and redirects.
 */
function AuthRedirect() {
  const { authLoading, user, setRole } = useEvents();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Wait for the background verify/checkAuth in EventContext to finish
    if (authLoading) return;

    const finalize = async () => {
      const portalIntent = searchParams.get('portal') || sessionStorage.getItem('activePortal') || 'volunteer';
      
      if (user) {
        // Already have a profile, go to dashboard
        sessionStorage.setItem('activePortal', portalIntent);
        navigate(portalIntent === 'organizer' ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
      } else {
        // No profile yet, attempt automatic registration/setRole for this portal
        const result = await setRole(portalIntent);
        if (result.success) {
          sessionStorage.setItem('activePortal', portalIntent);
          navigate(portalIntent === 'organizer' ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
        } else {
          // If all else fails, go back to portal login
          navigate(`/${portalIntent}/login`);
        }
      }
    };

    finalize();
  }, [authLoading, user, navigate, searchParams, setRole]);

  return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Securing Session</h2>
        <p style={{ color: '#888', marginTop: '10px' }}>Finalizing your secure connection to the platform...</p>
      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default AuthRedirect;

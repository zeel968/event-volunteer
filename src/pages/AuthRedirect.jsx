import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * AuthRedirect - Finalized bridge for Separate Login URLs technique.
 * Preserves the portal intent passed from PortalLogin with high stability.
 */
function AuthRedirect() {
  const { authLoading, clerkLoaded, isSignedIn, clerkUser } = useEvents();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Initiating security handshake...');
  const syncAttempted = useRef(false);

  // 1. TIMEOUT FALLBACK: If handshake takes too long, go home
  useEffect(() => {
    if (!clerkLoaded) return;
    
    let timer;
    if (!isSignedIn) {
      console.log('[AuthRedirect] Waiting for session sync (Max 10s)...');
      timer = setTimeout(() => {
        if (!isSignedIn) {
          console.warn('[AuthRedirect] Handshake timed out. Redirecting to home.');
          navigate('/', { replace: true });
        }
      }, 10000); // Increased patience to 10 seconds
    }
    return () => timer && clearTimeout(timer);
  }, [clerkLoaded, isSignedIn, navigate]);

  // 2. MAIN SYNC LOGIC
  useEffect(() => {
    const finalizeAuth = async () => {
      // Must wait for Clerk to be ready and User to be signed in
      if (!clerkLoaded || !isSignedIn || authLoading) return;

      if (!syncAttempted.current) {
        syncAttempted.current = true;
        
        // READ THE PORTAL FROM THE URL (fallback to volunteer)
        const portalIntent = searchParams.get('portal');
        const activePortal = portalIntent || sessionStorage.getItem('activePortal') || 'volunteer';
        
        console.log(`[AuthRedirect] Portal Intent detected: ${activePortal}`);
        setStatus(`Synchronizing ${activePortal} profile...`);

        try {
          // SYNC PROFILE: Notify backend about the current session
          const token = await window.Clerk.session.getToken();
          await fetch('/api/register', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              name: clerkUser.fullName || clerkUser.username || clerkUser.emailAddresses[0].emailAddress.split('@')[0], 
              email: clerkUser.emailAddresses[0].emailAddress, 
              role: activePortal 
            })
          });

          // LOCK THE PORTAL (Source of truth for ProtectedRoute)
          sessionStorage.setItem('activePortal', activePortal);
          
          setStatus(`Finalizing ${activePortal} dashboard...`);
          
          // Slight delay for visual confirmation of "Security Handshake"
          setTimeout(() => {
            navigate(activePortal === 'organizer' ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
          }, 600);
          
        } catch (err) {
          console.error('[AuthRedirect] Handshake sync failed, proceeding with local session:', err);
          sessionStorage.setItem('activePortal', activePortal);
          navigate(activePortal === 'organizer' ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
        }
      }
    };

    finalizeAuth();
  }, [clerkLoaded, authLoading, isSignedIn, navigate, searchParams, clerkUser]);

  return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative' }}
      >
         <motion.div 
           animate={{ rotate: 360 }} 
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
           style={{ width: '100px', height: '100px', border: '2px solid rgba(0,229,255,0.05)', borderTop: '2px solid #00e5ff', borderRadius: '50%' }} 
         />
         <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#00e5ff' }}>
            <Zap size={36} className="animate-pulse" />
         </div>
      </motion.div>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 20px' }}>
        <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.5px' }}>Security Handshake</h2>
        <p style={{ color: '#888', fontSize: '1rem', lineHeight: 1.5 }}>{status}</p>
      </div>
      
      <style>{`
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  );
}

export default AuthRedirect;

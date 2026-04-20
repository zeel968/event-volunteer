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
  const { authLoading, clerkLoaded, isSignedIn, clerkUser, setHandshakeFailed } = useEvents();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Initiating security handshake...');
  const [debugUrl, setDebugUrl] = useState(import.meta.env.VITE_API_BASE_URL || '/api');
  const [showDebug, setShowDebug] = useState(false);
  const syncAttempted = useRef(false);

  // 1. MAIN SYNC LOGIC
  useEffect(() => {
    const finalizeAuth = async () => {
      if (!clerkLoaded || !isSignedIn || authLoading) return;

      if (!syncAttempted.current) {
        syncAttempted.current = true;
        setHandshakeFailed(false); // Reset on new attempt
        
        const portalIntent = searchParams.get('portal');
        const activePortal = portalIntent || sessionStorage.getItem('activePortal') || 'volunteer';
        
        console.log(`[AuthRedirect] Portal Intent: ${activePortal} | Target API: ${debugUrl}`);
        setStatus(`Synchronizing ${activePortal} profile...`);

        try {
          const token = await window.Clerk.session.getToken();
          const response = await fetch(`${debugUrl}/register`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              name: clerkUser.fullName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0], 
              email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress, 
              role: activePortal 
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
              throw new Error(`API Route Mismatch: The server at [${debugUrl}] returned HTML (likely your own index.html). This usually means your VITE_API_BASE_URL is wrong or Vercel is redirecting API calls back to the frontend.`);
            }
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Registration failed on server.');

          sessionStorage.setItem('activePortal', activePortal);
          setStatus(`Finalizing ${activePortal} dashboard...`);
          
          setTimeout(() => {
            navigate(activePortal === 'organizer' ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
          }, 600);
          
        } catch (err) {
          console.error('[AuthRedirect] Handshake sync failed:', err);
          setStatus(`Handshake Error: ${err.message}`);
          setHandshakeFailed(true); // Signal to ProtectedRoute to stop the loop
        }
      }
    };

    finalizeAuth();
  }, [clerkLoaded, authLoading, isSignedIn, navigate, searchParams, clerkUser, debugUrl, setHandshakeFailed]);

  return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'relative' }}>
         <motion.div 
           animate={!status.includes('Error') ? { rotate: 360 } : {}} 
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
           style={{ width: '100px', height: '100px', border: '2px solid rgba(0,229,255,0.05)', borderTop: `2px solid ${status.includes('Error') ? '#ff4d4d' : '#00e5ff'}`, borderRadius: '50%' }} 
         />
         <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: status.includes('Error') ? '#ff4d4d' : '#00e5ff' }}>
            {status.includes('Error') ? <ShieldCheck size={36} /> : <Zap size={36} className="animate-pulse" />}
         </div>
      </motion.div>

      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '0 20px' }}>
        <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>
          {status.includes('Error') ? 'Handshake Failed' : 'Security Handshake'}
        </h2>
        <p style={{ color: status.includes('Error') ? '#ff4d4d' : '#888', fontSize: '0.9rem', lineHeight: 1.6, background: status.includes('Error') ? 'rgba(255,0,0,0.1)' : 'transparent', padding: '10px', borderRadius: '8px' }}>
          {status}
        </p>
        
        {status.includes('Error') && (
          <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => { syncAttempted.current = false; setStatus('Retrying handshake...'); setHandshakeFailed(false); }}
              style={{ padding: '12px 24px', background: '#fff', color: '#000', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Retry Handshake
            </button>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              {showDebug ? 'Hide Debug' : 'Debug API URL'}
            </button>
          </div>
        )}

        {showDebug && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '30px', padding: '20px', background: '#111', borderRadius: '16px', border: '1px solid #222', textAlign: 'left' }}>
            <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '10px' }}>Current Base URL: <code style={{color: '#00e5ff'}}>{debugUrl}</code></p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="https://your-backend.railway.app/api" 
                style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}
                value={debugUrl === '/api' ? '' : debugUrl}
                onChange={(e) => setDebugUrl(e.target.value)}
              />
              <button 
                onClick={() => { syncAttempted.current = false; setStatus('Attempting with new URL...'); setHandshakeFailed(false); }}
                style={{ background: '#00e5ff', color: '#000', border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 'bold' }}
              >
                Apply
              </button>
            </div>
            <p style={{ marginTop: '10px', color: '#666', fontSize: '0.75rem' }}>
              TIP: If you are on Vercel, relative paths like "/api" often fail. Try your full backend URL from Railway.
            </p>
          </motion.div>
        )}
      </div>

      <style>{`
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  );
}

      
      <style>{`
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  );
}

export default AuthRedirect;

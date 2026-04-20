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
  const { authLoading, clerkLoaded, isSignedIn, clerkUser, setHandshakeFailed, apiUrl, updateApiUrl } = useEvents();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Initiating security handshake...');
  const [tempUrl, setTempUrl] = useState(apiUrl);
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
        
        console.log(`[AuthRedirect] Portal Intent: ${activePortal} | Target API: ${apiUrl}`);
        setStatus(`Synchronizing ${activePortal} profile...`);

        try {
          const token = await window.Clerk.session.getToken();
          const response = await fetch(`${apiUrl}/register`, {
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
            
            // AUTOMATIC HEALING: If we see a 405 or 404 on the Vercel Domain, we KNOW it's a config issue
            if (response.status === 405 || response.status === 404 || errorText.includes('<!DOCTYPE html>')) {
              setShowDebug(true); // Automatically show the fix-it box
              throw new Error(`Connection Mismatch (405): You are currently trying to talk to the Backend at [${apiUrl}]. Since your backend is on Railway, this URL is likely incorrect. Please enter your FULL Railway URL below.`);
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
  }, [clerkLoaded, authLoading, isSignedIn, navigate, searchParams, clerkUser, apiUrl, setHandshakeFailed]);

  return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'relative' }}>
         <motion.div 
           animate={!status.includes('Error') ? { rotate: 360 } : {}} 
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
           style={{ width: '100px', height: '100px', border: '2px solid rgba(0,229,255,0.05)', borderTop: `2px solid ${status.includes('Handshake Error') ? '#ff4d4d' : '#00e5ff'}`, borderRadius: '50%' }} 
         />
         <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: status.includes('Handshake Error') ? '#ff4d4d' : '#00e5ff' }}>
            {status.includes('Handshake Error') ? <ShieldCheck size={36} /> : <Zap size={36} className="animate-pulse" />}
         </div>
      </motion.div>

      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '0 20px' }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.5px' }}>
          {status.includes('Handshake Error') ? 'Connection Issue Found' : 'Security Handshake'}
        </h2>
        <p style={{ color: status.includes('Handshake Error') ? '#ff4d4d' : '#888', fontSize: '0.95rem', lineHeight: 1.6, background: status.includes('Handshake Error') ? 'rgba(255,0,0,0.05)' : 'transparent', padding: '15px', borderRadius: '12px', border: status.includes('Handshake Error') ? '1px solid rgba(255,0,0,0.1)' : 'none' }}>
          {status}
        </p>
        
        {status.includes('Handshake Error') && (
          <div style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => { syncAttempted.current = false; setStatus('Retrying handshake...'); setHandshakeFailed(false); }}
              style={{ padding: '14px 28px', background: '#fff', color: '#000', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              Try Again
            </button>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              {showDebug ? 'Close Fix Tool' : '🔧 Fix Connection'}
            </button>
          </div>
        )}

        {showDebug && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '40px', padding: '25px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(0,229,255,0.2)', textAlign: 'left', backdropFilter: 'blur(20px)' }}>
            <h3 style={{ color: '#00e5ff', fontSize: '1.1rem', marginBottom: '15px', fontWeight: 700 }}>Auto-Healing: Backend Config</h3>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '15px' }}>
              Your frontend is currently pointing to <code style={{color: '#fff', background: '#222', padding: '2px 6px', borderRadius: '4px'}}>{apiUrl}</code>. 
              <strong>Please enter your full Railway URL below:</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="https://your-backend.railway.app/api" 
                style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#fff', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }}
                value={tempUrl === '/api' ? '' : tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
              />
              <button 
                onClick={() => { if(tempUrl) updateApiUrl(tempUrl); }}
                style={{ background: '#00e5ff', color: '#000', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
              >
                APPLY & SYNC
              </button>
            </div>
            <p style={{ marginTop: '15px', color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>
              💡 This will save the URL in your browser and reload the page automatically.
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

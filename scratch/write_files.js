const fs = require('fs');

const authRedirect = `import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function AuthRedirect() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your account...');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate('/sign-in', { replace: true }); return; }

    const resolveRole = async () => {
      try {
        setStatus('Checking your profile...');
        const token = await getToken();
        localStorage.setItem('auth_token', token);

        const res = await fetch(API_BASE_URL + '/profile', {
          headers: { Authorization: 'Bearer ' + token }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile) {
            const role = data.profile.role;
            if (!role) {
              setStatus('Please select your role...');
              setTimeout(() => navigate('/select-role', { replace: true }), 600);
              return;
            }
            setStatus(role === 'admin' ? 'Welcome, Organizer!' : 'Welcome back!');
            setTimeout(() => navigate(role === 'admin' ? '/organizer' : '/volunteer', { replace: true }), 800);
            return;
          }
        }

        const email = user.primaryEmailAddress ? user.primaryEmailAddress.emailAddress : user.emailAddresses[0].emailAddress;
        const name = user.fullName || email.split('@')[0];
        setStatus('Setting up your profile...');
        await fetch(API_BASE_URL + '/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, clerkId: user.id })
        }).catch(() => {});

        setTimeout(() => navigate('/select-role', { replace: true }), 600);
      } catch (err) {
        console.error('[AuthRedirect]', err);
        setStatus('Something went wrong. Redirecting...');
        setTimeout(() => navigate('/sign-in', { replace: true }), 1500);
      }
    };

    resolveRole();
  }, [isLoaded, isSignedIn]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Loader2 size={48} style={{ color: 'var(--accent-primary, #00e5ff)', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--text-muted, #aaa)', fontSize: '1rem' }}>{status}</p>
      <style>{'@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }'}</style>
    </div>
  );
}

export default AuthRedirect;
`;

fs.writeFileSync('src/pages/AuthRedirect.jsx', authRedirect, 'utf8');
console.log('AuthRedirect.jsx written OK');

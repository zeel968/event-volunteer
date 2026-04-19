import { SignIn } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';

function SignInPage() {
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent') || 'volunteer';
  const redirectUrl = `/auth-redirect?intent=${intent}`;

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <SignIn 
        routing="path" 
        path="/sign-in" 
        afterSignInUrl={redirectUrl} 
        afterSignUpUrl={redirectUrl}
        signUpUrl={`/sign-up?intent=${intent}`} 
      />
    </div>
  );
}

export default SignInPage;

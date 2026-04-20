import React, { useEffect } from 'react';
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Users } from "lucide-react";
import { useEvents } from "../context/EventContext";

/**
 * PortalLogin - Official Clerk Component Wrapper for Separate Login URL technique.
 * If already signed in, sets the portal immediately and navigates to dashboard.
 * If not signed in, shows Clerk sign-in/up component.
 */
const PortalLogin = ({ portal }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clerkLoaded, isSignedIn, user } = useEvents();
  
  // Detect if we are on a register sub-route
  const isSignUp = location.pathname.includes('register');
  const isOrganizer = portal === 'organizer';
  
  const themeColor = isOrganizer ? '#00e5ff' : '#7c7cff';
  const PortalIcon = isOrganizer ? ShieldCheck : Users;
  const portalName = isOrganizer ? "Organizer" : "Volunteer";

  // KEY FIX: If user is already signed in, just set the portal and redirect
  useEffect(() => {
    if (clerkLoaded && isSignedIn && user) {
      sessionStorage.setItem('activePortal', portal);
      navigate(isOrganizer ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
    }
  }, [clerkLoaded, isSignedIn, user, portal, navigate, isOrganizer]);

  // Shared Clerk Props
  const clerkProps = {
    routing: "path",
    path: `/${portal}/${isSignUp ? 'register' : 'login'}`,
    forceRedirectUrl: `/auth-redirect?portal=${portal}`,
    signInUrl: `/${portal}/login`,
    signUpUrl: `/${portal}/register`,
    appearance: {
      variables: {
        colorPrimary: themeColor,
        colorBackground: "#0d0d10",
        colorText: "#ffffff",
        colorTextSecondary: "#888888",
        colorInputBackground: "rgba(255,255,255,0.03)",
        colorInputText: "#ffffff",
        borderRadius: "20px",
        fontFamily: "'Inter', sans-serif"
      },
      elements: {
        formButtonPrimary: {
          backgroundColor: themeColor,
          color: "#000",
          fontSize: "1rem",
          fontWeight: "700",
          textTransform: "none",
          "&:hover": {
            backgroundColor: isOrganizer ? "#00c3db" : "#6060ff"
          }
        },
        card: {
          background: "#0d0d10",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 64px -12px rgba(0,0,0,0.6)",
          padding: "10px"
        },
        footer: {
          background: "none !important",
          backgroundColor: "transparent !important",
          backgroundImage: "none !important",
          borderTop: "1px solid rgba(255,255,255,0.05) !important"
        },
        footerActionLink: {
          color: themeColor,
          "&:hover": { color: themeColor, opacity: 0.8 }
        },
        headerTitle: { fontSize: "1.5rem", fontWeight: "800", letterSpacing: "-0.5px" },
        headerSubtitle: { fontSize: "0.95rem", color: "#888" },
        dividerLine: { background: "rgba(255,255,255,0.1)" },
        dividerText: { color: "#555" },
        socialButtonsBlockButton: {
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          "&:hover": { background: "rgba(255,255,255,0.06)" }
        }
      }
    },
    layout: {
      socialButtonsVariant: "blockButton",
      showOptionalFields: false
    }
  };

  // Localization
  const localization = {
    signIn: {
      start: {
        title: `${portalName} Portal`,
        subtitle: `Access your ${portalName.toLowerCase()} account`
      }
    },
    signUp: {
      start: {
        title: `Create ${portalName} Account`,
        subtitle: "Join the volunteer community"
      }
    }
  };

  // If already signed in, show a loading state while the useEffect redirects
  if (clerkLoaded && isSignedIn) {
    if (user) {
      return (
        <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            style={{ width: '60px', height: '60px', border: '2px solid rgba(0,229,255,0.1)', borderTop: `2px solid ${themeColor}`, borderRadius: '50%' }} 
          />
        </div>
      );
    }
    
    // Signed in but no profile yet (Handshake needed)
    return (
      <div style={{ minHeight: "100vh", background: "#060608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Session Detected</h2>
          <p style={{ color: '#888', marginTop: '10px' }}>Your account is signed in, but we need to synchronize your {portalName} portal.</p>
        </div>
        <button 
          onClick={() => navigate(`/auth-redirect?portal=${portal}`)}
          style={{ background: themeColor, color: '#000', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          Initialize Security Handshake
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      {/* Dynamic Background Elements */}
      <div style={{ position: "fixed", top: "20%", left: "10%", width: "400px", height: "400px", background: `radial-gradient(circle, ${isOrganizer ? 'rgba(0,229,255,0.03)' : 'rgba(124,124,255,0.04)'} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Portal Branding Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center", marginBottom: "32px", zIndex: 1 }}
      >
        <div style={{ display: "inline-flex", padding: "16px", borderRadius: "22px", background: `rgba(${isOrganizer ? '0,229,255' : '124,124,255'}, 0.08)`, border: "1px solid rgba(255,255,255,0.05)", color: themeColor, marginBottom: "16px" }}>
          <PortalIcon size={32} />
        </div>
        <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.5px" }}>{portalName} Portal</h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ width: "100%", display: "flex", justifyContent: "center", zIndex: 1 }}
      >
        {isSignUp ? (
          <SignUp {...clerkProps} localization={localization} />
        ) : (
          <SignIn {...clerkProps} localization={localization} />
        )}
      </motion.div>

      <style>{`
        /* Deep Overrides for Clerk UI issues */
        .cl-rootBox .cl-card { 
          background-color: #0d0d10 !important; 
        }
        .cl-footer { 
          background: transparent !important; 
          background-image: none !important;
        }
        .cl-internal-b3fm6y { 
          background: transparent !important; 
          color: #555 !important;
          border-top: 1px solid rgba(255,255,255,0.03) !important;
        }
        .cl-identityPreviewText { color: #fff !important; }
        .cl-formFieldLabel { color: #aaa !important; font-size: 0.85rem !important; margin-bottom: 6px !important; }
      `}</style>
    </div>
  );
};

export default PortalLogin;

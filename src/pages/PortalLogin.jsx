import React, { useEffect } from 'react';
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Users } from "lucide-react";
import { useEvents } from "../context/EventContext";

/**
 * PortalLogin - Official Clerk Component Wrapper.
 * If already signed in, navigates to dashboard.
 */
const PortalLogin = ({ portal }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clerkLoaded, isSignedIn, user } = useEvents();
  
  const isSignUp = location.pathname.includes('register');
  const isOrganizer = portal === 'organizer';
  const themeColor = isOrganizer ? '#00e5ff' : '#7c7cff';
  const PortalIcon = isOrganizer ? ShieldCheck : Users;
  const portalName = isOrganizer ? "Organizer" : "Volunteer";

  useEffect(() => {
    if (clerkLoaded && isSignedIn && user) {
      sessionStorage.setItem('activePortal', portal);
      navigate(isOrganizer ? '/organizer/dashboard' : '/volunteer/dashboard', { replace: true });
    }
  }, [clerkLoaded, isSignedIn, user, portal, navigate, isOrganizer]);

  const clerkProps = {
    routing: "path",
    path: `/${portal}/${isSignUp ? 'register' : 'login'}`,
    forceRedirectUrl: isOrganizer ? '/organizer/dashboard' : '/volunteer/dashboard',
    signInUrl: `/${portal}/login`,
    signUpUrl: `/${portal}/register`,
    appearance: {
      variables: {
        colorPrimary: themeColor,
        colorBackground: "#0d0d10",
        colorText: "#ffffff",
        borderRadius: "20px",
      }
    }
  };

  if (clerkLoaded && isSignedIn && !user) {
     return (
        <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            style={{ width: '60px', height: '60px', border: '2px solid rgba(0,229,255,0.1)', borderTop: `2px solid ${themeColor}`, borderRadius: '50%' }} 
          />
        </div>
      );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center", marginBottom: "32px" }}
      >
        <div style={{ display: "inline-flex", padding: "16px", borderRadius: "22px", background: `rgba(${isOrganizer ? '0,229,255' : '124,124,255'}, 0.08)`, color: themeColor, marginBottom: "16px" }}>
          <PortalIcon size={32} />
        </div>
        <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900 }}>{portalName} Portal</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {isSignUp ? <SignUp {...clerkProps} /> : <SignIn {...clerkProps} />}
      </motion.div>
    </div>
  );
};

export default PortalLogin;

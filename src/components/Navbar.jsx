import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { useClerk, useUser as useClerkUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, LogOut, User, ShieldCheck, LayoutDashboard, Bell, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

function Navbar() {
  const { user, logout, notifications } = useEvents();
  const { signOut } = useClerk();
  const { isSignedIn } = useClerkUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const unreadCount = user ? notifications.filter(n => n.userEmail === user.email && !n.read).length : 0;

  const handleLogout = async () => {
    logout();
    await signOut();
    navigate('/');
  };

  const NavItem = ({ to, icon: Icon, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Icon size={18} />
        <span>{children}</span>
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            style={{ position: 'absolute', bottom: '-24px', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)', boxShadow: '0 -2px 10px rgba(0,229,255,0.5)' }}
            initial={false}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </Link>
    );
  };

  const activePortal = sessionStorage.getItem('activePortal');

  return (
    <motion.div
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        background: scrolled ? 'rgba(5, 5, 8, 0.85)' : 'rgba(5, 5, 8, 0.4)',
        borderBottomColor: scrolled ? 'rgba(255,255,255,0.1)' : 'transparent',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none'
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--text-main)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
        <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
          <Activity color="var(--accent-primary)" size={28} />
        </motion.div>
        EV<span style={{ color: 'var(--accent-primary)' }}>App</span>
      </Link>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <NavItem to="/browse" icon={Search}>Browse</NavItem>
        <NavItem to="/map" icon={MapPin}>Map</NavItem>

        {isSignedIn && activePortal === 'organizer' && (
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <NavItem to="/organizer/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
            <NavItem to="/organizer-profile" icon={User}>Profile</NavItem>
          </div>
        )}

        {isSignedIn && activePortal === 'volunteer' && (
          <div style={{ position: 'relative', display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <NavItem to="/volunteer/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
            <NavItem to="/profile" icon={User}>Profile</NavItem>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  style={{ position: 'absolute', top: '-6px', right: '-28px', background: 'var(--accent-danger)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {isSignedIn && (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="primary-btn"
            style={{ marginLeft: '1rem', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={16} />
            <span style={{ fontSize: '0.9rem' }}>Logout</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default Navbar;

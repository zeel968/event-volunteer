import { useState, useMemo, useEffect } from 'react';
import { useEvents } from '../context/EventContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Clock, MapPin, IndianRupee, Info, ChevronRight, ChevronDown, CreditCard, ShieldCheck } from 'lucide-react';
import PaymentInfoForm from '../components/PaymentInfoForm';

function VolunteerDashboard() {
  const { events, applications, user, notifications, markNotificationAsRead, applyToEvent } = useEvents();
  const [activeTab, setActiveTab] = useState('available');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const userApplications = useMemo(() => applications.filter(app => app.email === user?.email), [applications, user]);
  const approvedEventIds = useMemo(() => 
    userApplications.filter(app => ['Approved', 'Present', 'Absent', 'Paid'].includes(app.status)).map(app => app.eventId), 
  [userApplications]);
  const appliedEventIds = useMemo(() => userApplications.map(app => app.eventId), [userApplications]);

  const approvedEvents = useMemo(() => events.filter(e => approvedEventIds.includes(e.id)), [events, approvedEventIds]);

  const userNotifications = useMemo(() => {
    return notifications.filter(n => n.userEmail === user?.email).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [notifications, user]);

  // Note: markNotificationAsRead is removed from auto-useEffect to prevent infinite loops.
  // It should be called on specific user actions like clicking the notification.

  const handleTabChange = (id) => {
    if (activeTab === id) return;
    setActiveTab(id);
    setIsExpanded(false);
  };

  let selectedContent = activeTab === 'available' ? null : events.find(e => e.id === activeTab);
  const isApproved = approvedEventIds.includes(activeTab);

  return (
    <div className="container" style={{ paddingTop: "120px", minHeight: "90vh" }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", flexWrap: "wrap", gap: "20px" }}
      >
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent-secondary)", background: "rgba(124,124,255,0.1)", padding: "4px 12px", borderRadius: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>Volunteer Portal</span>
          <h2 style={{ fontSize: "2.8rem", margin: "12px 0 8px 0", fontWeight: 800 }}>Volunteer Dashboard</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "600px" }}>
            Welcome back, {user?.name || user?.email?.split('@')[0]}! Track your applications and approved events.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
           <button 
             onClick={() => {
                sessionStorage.removeItem('activePortal');
                window.location.href = '/organizer/login';
             }}
             style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "12px 20px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}
           >
             <ShieldCheck size={18} /> Switch to Organizer
           </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {userNotifications.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '30px', padding: '16px 24px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <Bell size={20} /> Recent Notifications
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {userNotifications.slice(0, 3).map(n => (
                <li key={n.id} style={{ fontSize: "0.95rem", color: "var(--text-main)", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>• {n.message}</span>
                  {n.message.includes('provide your payment details') && (
                    <button 
                      onClick={() => setShowPaymentForm(true)}
                      style={{ background: 'var(--accent-primary)', color: 'black', border: 'none', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, marginLeft: '12px' }}
                    >
                      Enter UPI ID
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentForm && (
          <PaymentInfoForm onClose={() => setShowPaymentForm(false)} />
        )}
      </AnimatePresence>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <button
            className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => handleTabChange('available')}
          >
            <Info size={18} /> Dashboard Home
          </button>

          {approvedEvents.length > 0 && (
            <h4 style={{ margin: '24px 0 12px 12px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Approved Events
            </h4>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {approvedEvents.map(event => (
              <button
                key={event.id}
                className={`tab-btn ${activeTab === event.id ? 'active' : ''}`}
                onClick={() => handleTabChange(event.id)}
              >
                <CheckCircle size={18} color="var(--accent-success)" /> 
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="content-area">
          <AnimatePresence mode="wait">
            {activeTab === 'available' ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="glass-card" 
                style={{ textAlign: "center", padding: "60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
              >
                <div style={{ background: "rgba(124,124,255,0.1)", padding: "24px", borderRadius: "50%", color: "var(--accent-secondary)", marginBottom: "24px" }}>
                  <MapPin size={48} />
                </div>
                <h3 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>Ready to Volunteer?</h3>
                <p style={{ color: "var(--text-muted)", maxWidth: "400px", lineHeight: 1.6, marginBottom: "24px" }}>
                  Head over to the Browse section or Map to discover new opportunities. You have currently applied to <strong style={{ color: "var(--text-main)" }}>{appliedEventIds.length}</strong> events.
                </p>
                <div style={{ display: "flex", gap: "16px" }}>
                   <a href="/browse" className="primary-btn" style={{ textDecoration: "none" }}>Browse Events</a>
                   <a href="/map" className="primary-btn" style={{ textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", color: "var(--text-main)" }}>View Map</a>
                </div>
              </motion.div>
            ) : selectedContent ? (
              <motion.div 
                key={selectedContent.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="event-card"
                style={{ position: "relative" }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: isApproved ? "var(--accent-success)" : "var(--accent-primary)" }} />
                
                <div className="event-header">
                  <div>
                    <span style={{ 
                      fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", display: "inline-block", marginBottom: "16px",
                      background: isApproved ? "rgba(16,185,129,0.1)" : "rgba(0,229,255,0.1)",
                      color: isApproved ? "var(--accent-success)" : "var(--accent-primary)"
                    }}>
                      {isApproved ? 'Approved & Confirmed' : 'Application Pending'}
                    </span>
                    <h3 style={{ fontSize: "2rem", fontWeight: 800 }}>{selectedContent.title}</h3>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", margin: "24px 0", color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={16} color="var(--accent-primary)"/> {selectedContent.time || "TBD"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={16} color="var(--accent-primary)"/> {selectedContent.location || "Location TBD"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><IndianRupee size={16} color="var(--accent-success)"/> {selectedContent.stipend}</div>
                </div>

                <p style={{ color: "var(--text-main)", lineHeight: 1.7, fontSize: "1.05rem", marginBottom: "32px", opacity: 0.9 }}>
                  {selectedContent.description || "No description provided."}
                </p>

                <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: "24px", marginBottom: "24px" }}>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        {isApproved ? (
                          <div style={{ marginBottom: "24px" }}>
                            <h4 style={{ marginBottom: '16px', color: 'var(--text-main)', display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={18}/> Exact Location Map</h4>
                            <div style={{ width: '100%', height: '300px', borderRadius: '16px', overflow: 'hidden', border: "1px solid var(--border-glass)", boxShadow: "var(--shadow-glow)" }}>
                              <iframe
                                width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"
                                src={`https://www.google.com/maps?q=${encodeURIComponent(selectedContent.location || 'New Delhi, India')}&hl=en&z=14&output=embed`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginBottom: "24px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border-glass)" }}>
                            <p style={{ color: "var(--text-muted)" }}>📍 Full location map will be revealed once your application is approved.</p>
                            <p style={{ marginTop: '12px', color: "var(--text-main)" }}><strong>Requirements:</strong> {selectedContent.requirements || "None specific"}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ flex: 1, background: "transparent", border: "1px solid var(--border-glass)", color: "var(--text-main)", padding: "12px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600 }}
                  >
                    {isExpanded ? <><ChevronDown size={18}/> Hide Details</> : <><ChevronRight size={18}/> View Full Details</>}
                  </motion.button>

                  {!isApproved && !appliedEventIds.includes(selectedContent.id) && (
                    <motion.button
                       whileTap={{ scale: 0.95 }}
                       className="primary-btn"
                       style={{ flex: 1, margin: 0 }}
                       onClick={() => {
                        applyToEvent(selectedContent.id, { name: user?.email.split('@')[0], email: user?.email });
                        alert("Application submitted successfully!");
                        setActiveTab('available');
                      }}
                    >
                      Instant Apply
                    </motion.button>
                  )}
                  {!isApproved && appliedEventIds.includes(selectedContent.id) && (
                    <button style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", cursor: "not-allowed", fontWeight: 600 }}>
                       Application Pending
                    </button>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default VolunteerDashboard;

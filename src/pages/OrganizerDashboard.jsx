import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PlusCircle, ClipboardList, Calendar, Clock, IndianRupee, Users, Square } from "lucide-react";
import { useEvents } from "../context/EventContext";

const isEventFinished = (event) => {
  if (event.status === 'Finished') return true;
  if (!event.date) return false;
  const eventDateTime = new Date(`${event.date}T${event.startTime || '23:59'}`);
  return eventDateTime < new Date();
};

function OrganizerDashboard() {
  const { user, events, applications, finishEvent } = useEvents();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const myEvents = events.filter(e => e.organizerEmail === user?.email);

  const handleEndEvent = async (id) => {
    if (!window.confirm('Are you sure you want to end this event? This will stop new applications and unlock the payment dashboard.')) return;
    
    setProcessingId(id);
    try {
      const res = await finishEvent(id);
      if (res.success) {
        alert('Event finished successfully!');
      } else {
        alert('Failed to end event: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error ending event.');
    } finally {
      setProcessingId(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="container" style={{ minHeight: "80vh", paddingTop: "120px" }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", flexWrap: "wrap", gap: "20px" }}
      >
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--accent-primary)", background: "rgba(0,229,255,0.1)", padding: "4px 12px", borderRadius: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>Organizer Portal</span>
          <h2 style={{ fontSize: "2.8rem", margin: "12px 0 8px 0", fontWeight: 800 }}>Organizer Dashboard</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "600px" }}>
            Welcome back, {user?.organization_name || user?.name || user?.email?.split('@')[0]}! 
            Manage your events and orchestration from this command center.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
           <button 
             onClick={() => {
                sessionStorage.removeItem('activePortal');
                navigate('/volunteer/login');
             }}
             style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "12px 20px", borderRadius: "16px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}
           >
             <Users size={18} /> Switch to Volunteer
           </button>
        </div>
      </motion.div>

      <motion.div 
        className="grid" 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Link to="/create-event" style={{ textDecoration: 'none', color: 'inherit' }}>
          <motion.div className="glass-card" variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px" }}>
            <div style={{ background: "rgba(0,229,255,0.1)", padding: "20px", borderRadius: "50%", color: "var(--accent-primary)" }}>
              <PlusCircle size={40} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Create New Event</h3>
              <p style={{ color: "var(--text-muted)" }}>Post a new staffing requirement and reach volunteers instantly.</p>
            </div>
          </motion.div>
        </Link>
        
        <Link to="/manage-applications" style={{ textDecoration: 'none', color: 'inherit' }}>
          <motion.div className="glass-card" variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px" }}>
            <div style={{ background: "rgba(124,124,255,0.1)", padding: "20px", borderRadius: "50%", color: "var(--accent-secondary)" }}>
              <ClipboardList size={40} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Manage Applications</h3>
              <p style={{ color: "var(--text-muted)" }}>Review and approve volunteer requests for your active events.</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: '40px' }}>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Your Events</h3>
        
        {myEvents.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px', border: '1px dashed var(--border-glass)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No events created yet. Click "Create New Event" to get started!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '10px' }}>[Debug: Your Email: {user?.email || 'N/A'}, Total App Events: {events.length}, Orgs seen: {Array.from(new Set(events.map(e => e.organizerEmail))).join(', ')}]</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myEvents.map(event => {
              const finished = isEventFinished(event);
              const approvedCount = applications.filter(a => a.eventId === event.id && (a.status === 'Approved' || a.status === 'Present')).length;

              return (
                <motion.div 
                  key={event.id} 
                  className="glass-card" 
                  whileHover={{ y: -2 }}
                  style={{ 
                    padding: '24px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    border: finished ? '1px solid var(--accent-success)' : '1px solid var(--border-glass)', 
                    boxShadow: finished ? '0 0 20px rgba(16,185,129,0.1)' : 'none' 
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{event.title}</h4>
                      <span style={{ 
                        padding: '3px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase',
                        background: finished ? 'rgba(16,185,129,0.15)' : 'rgba(0,229,255,0.1)',
                        color: finished ? 'var(--accent-success)' : 'var(--accent-primary)'
                      }}>
                        {finished ? '✓ Finished' : 'Active'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14}/> {event.date || 'No date'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> {event.startTime || '--:--'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IndianRupee size={14}/> ₹{event.stipend}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14}/> {approvedCount} volunteers</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexShrink: 0, marginLeft: '20px' }}>
                    {!finished ? (
                      <>
                        <Link to={'/event-attendance/' + event.id} className="primary-btn" style={{ padding: '10px 18px', fontSize: '0.85rem', margin: 0 }}>
                          Attendance
                        </Link>
                        <button 
                          onClick={() => handleEndEvent(event.id)}
                          disabled={processingId === event.id}
                          style={{ 
                            padding: '10px 18px', fontSize: '0.85rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-danger)',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <Square size={14}/> {processingId === event.id ? 'Wait...' : 'End Event'}
                        </button>
                      </>
                    ) : (
                      <Link to={'/payment-dashboard/' + event.id} className="primary-btn" style={{ padding: '12px 24px', fontSize: '0.9rem', background: 'var(--accent-success)', color: 'black', boxShadow: '0 0 15px rgba(16,185,129,0.3)', margin: 0 }}>
                        💰 Pay Volunteers
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default OrganizerDashboard;

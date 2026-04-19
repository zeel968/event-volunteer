import { useState } from "react";
import { useEvents } from "../context/EventContext";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, IndianRupee, HandHeart, Users, X, Calendar, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BrowseEvents() {
  const navigate = useNavigate();
  const { events, applyToEvent, user, isSignedIn } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [applicantDetails, setApplicantDetails] = useState({ name: "", email: "", upiId: "" });

  const handleApplyClick = (event) => {
    if (!isSignedIn) {
      alert("Please sign in to apply for events.");
      navigate("/sign-in");
      return;
    }
    setApplicantDetails({
      name: user?.name || user?.email?.split('@')[0] || "",
      email: user?.email || "",
      upiId: ""
    });
    setSelectedEvent(event);
  };

  const handleConfirmApplication = (e) => {
    e.preventDefault();
    if (!applicantDetails.name || !applicantDetails.email || !applicantDetails.upiId) return;

    applyToEvent(selectedEvent.id, applicantDetails);
    alert("Application submitted successfully!");
    setSelectedEvent(null);
    setApplicantDetails({ name: "", email: "", upiId: "" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="container" style={{ paddingTop: "120px", minHeight: "90vh" }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "8px" }}>Explore Opportunities</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px" }}>Find nearby events that match your skills and apply instantly.</p>
      </motion.div>

      <motion.div className="grid" variants={containerVariants} initial="hidden" animate="visible">
        {events.map(event => (
          <motion.div key={event.id} className="glass-card" variants={itemVariants} whileHover={{ y: -8, scale: 1.02 }} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "inline-block", padding: "4px 12px", background: "rgba(0,229,255,0.1)", color: "var(--accent-primary)", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "16px" }}>
                {event.role}
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "16px", lineHeight: 1.3 }}>{event.title}</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={16} /> {event.location || "Multiple Locations"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><IndianRupee size={16} /> ₹{event.stipend} Stipend</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Users size={16} /> {event.availableSlots} / {event.totalSeats} Slots Left</div>
                {event.date && <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Calendar size={16} /> {event.date} {event.startTime && `at ${event.startTime}`}</div>}
              </div>
            </div>

            <motion.button 
              whileTap={{ scale: (event.availableSlots === 0 || event.status === 'Live' || event.status === 'Finished') ? 1 : 0.95 }}
              className="primary-btn" 
              onClick={() => handleApplyClick(event)}
              disabled={event.availableSlots === 0 || event.status === 'Live' || event.status === 'Finished'}
              style={{ width: "100%", justifyContent: "center", opacity: (event.availableSlots === 0 || event.status === 'Live' || event.status === 'Finished') ? 0.6 : 1 }}
            >
              {event.status === 'Live' || event.status === 'Finished' ? "Closed" : (event.availableSlots === 0 ? "Full" : <> <HandHeart size={18} /> Apply Now </>)}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}
          >
            <motion.div 
              className="form-card"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{ width: "100%", maxWidth: "500px", margin: 0, position: "relative" }}
            >
              <button onClick={() => setSelectedEvent(null)} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={24} />
              </button>
              
              <h2 style={{ fontSize: "1.8rem", marginBottom: "24px", paddingRight: "30px" }}>Apply: {selectedEvent.title}</h2>

              <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid var(--border-glass)", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <p><strong>Role:</strong> <span style={{ color: "var(--accent-primary)" }}>{selectedEvent.role}</span></p>
                <p><strong>Stipend:</strong> <span style={{ color: "var(--accent-success)" }}>₹{selectedEvent.stipend}</span></p>
                <p><strong>Requirements:</strong> <span style={{ color: "var(--text-muted)" }}>{selectedEvent.requirements}</span></p>
                <p><strong>Availability:</strong> <span style={{ color: selectedEvent.availableSlots === 0 ? "var(--accent-danger)" : "var(--accent-success)" }}>{selectedEvent.availableSlots} slots remaining</span></p>
              </div>

              <form onSubmit={handleConfirmApplication} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ marginTop: 0 }}>Full Name</label>
                  <input placeholder="Jane Doe" value={applicantDetails.name} onChange={e => setApplicantDetails({ ...applicantDetails, name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ marginTop: 0 }}>Email Address</label>
                  <input type="email" placeholder="jane@example.com" value={applicantDetails.email} onChange={e => setApplicantDetails({ ...applicantDetails, email: e.target.value })} required />
                </div>
                <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "12px" }}>
                  <label style={{ marginTop: 0, color: "var(--accent-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                    <Wallet size={14}/> Your UPI ID (to receive stipend)
                  </label>
                  <input placeholder="e.g. yourname@paytm or 9876543210@upi" value={applicantDetails.upiId} onChange={e => setApplicantDetails({ ...applicantDetails, upiId: e.target.value })} required />
                </div>
                <motion.button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={selectedEvent.availableSlots === 0 || selectedEvent.status === 'Live' || selectedEvent.status === 'Finished'} 
                  style={{ opacity: (selectedEvent.availableSlots === 0 || selectedEvent.status === 'Live' || selectedEvent.status === 'Finished') ? 0.5 : 1, marginTop: "16px" }}
                  whileTap={{ scale: (selectedEvent.availableSlots === 0 || selectedEvent.status === 'Live' || selectedEvent.status === 'Finished') ? 1 : 0.98 }}
                >
                  {selectedEvent.status === 'Live' || selectedEvent.status === 'Finished' ? "Applications Closed" : (selectedEvent.availableSlots === 0 ? "Event is Full" : "Confirm Application")}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default BrowseEvents;

import { useEvents } from "../context/EventContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, User, Mail, Tag } from "lucide-react";

function ManageApplications() {
  const { applications, events, updateApplicationStatus } = useEvents();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="container" style={{ paddingTop: "120px", minHeight: "90vh" }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "8px" }}>Manage Applications</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px" }}>Review, approve, or reject incoming volunteer requests.</p>
      </motion.div>

      {applications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", background: "var(--bg-card)", borderRadius: "20px", border: "1px dashed var(--border-glass)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>No applications received yet.</p>
        </div>
      ) : (
        <motion.div className="grid" variants={containerVariants} initial="hidden" animate="visible">
          <AnimatePresence>
            {applications.map((app) => {
              const event = events.find((e) => e.id === app.eventId);
              
              let statusColor = "var(--text-muted)";
              let statusBg = "rgba(255,255,255,0.05)";
              if(app.status === 'Approved') { statusColor = "var(--accent-success)"; statusBg = "rgba(16,185,129,0.1)"; }
              if(app.status === 'Rejected') { statusColor = "var(--accent-danger)"; statusBg = "rgba(239,68,68,0.1)"; }

              return (
                <motion.div 
                  key={app.id} 
                  className="glass-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                  whileHover={{ y: -4 }}
                  style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-primary)" }}>
                        {event?.title || "Unknown Event"}
                      </h3>
                      <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, color: statusColor, background: statusBg }}>
                        {app.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-main)" }}>
                        <User size={16} color="var(--text-muted)" /> <span>{app.name || "Anonymous"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-main)" }}>
                        <Mail size={16} color="var(--text-muted)" /> <span>{app.email || "N/A"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-main)" }}>
                        <Tag size={16} color="var(--text-muted)" /> <span>Role: {event?.role || "Volunteer"}</span>
                      </div>
                    </div>
                  </div>

                  {app.status === "Pending" && (
                    <div style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="primary-btn"
                        onClick={() => updateApplicationStatus(app.id, "Approved")}
                        style={{ flex: 1, background: "rgba(16,185,129,0.15)", border: "1px solid var(--accent-success)", color: "var(--accent-success)", padding: "10px" }}
                      >
                        <CheckCircle size={18} /> Approve
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="primary-btn"
                        onClick={() => updateApplicationStatus(app.id, "Rejected")}
                        style={{ flex: 1, background: "rgba(239,68,68,0.15)", border: "1px solid var(--accent-danger)", color: "var(--accent-danger)", padding: "10px" }}
                      >
                        <XCircle size={18} /> Reject
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

export default ManageApplications;

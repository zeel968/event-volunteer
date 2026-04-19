import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Users, Zap, Globe, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../context/EventContext";

function Home() {
  const navigate = useNavigate();
  const { clerkLoaded, authLoading } = useEvents();

  if (!clerkLoaded || authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0b" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ color: "var(--accent-primary)" }}>
          <Zap size={48} />
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0b", position: "relative", overflow: "hidden" }}>
      {/* Dynamic Backgrounds */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "5%", width: "30vw", height: "30vw", background: "radial-gradient(circle, rgba(124,124,255,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container"
        style={{ position: "relative", zIndex: 1, paddingTop: "120px", textAlign: "center" }}
      >
        <motion.div variants={itemVariants} style={{ display: "inline-block", padding: "8px 20px", borderRadius: "30px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--accent-primary)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1.5px", marginBottom: "32px" }}>
          VOLUNTEERING REDEFINED
        </motion.div>

        <motion.h1 variants={itemVariants} style={{ fontSize: "clamp(2.5rem, 8vw, 4.5rem)", fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: "24px" }}>
          The Portal to <br /><span className="text-gradient">Meaningful Impact</span>
        </motion.h1>

        <motion.p variants={itemVariants} style={{ fontSize: "1.2rem", color: "var(--text-muted)", maxWidth: "700px", margin: "0 auto 64px auto", lineHeight: 1.6 }}>
          Choose your portal to get started. Dedicated experiences for event organizers and passionate volunteers.
        </motion.p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
          {/* Organizer Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -10 }}
            onClick={() => navigate('/organizer/login')}
            style={{ cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "32px", padding: "48px 32px", textAlign: "center", transition: "all 0.3s ease" }}
          >
            <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "rgba(0,229,255,0.1)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px auto" }}>
              <ShieldCheck size={40} />
            </div>
            <h2 style={{ fontSize: "1.8rem", color: "#fff", marginBottom: "16px" }}>I am an Organizer</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "0.95rem" }}>Post events, manage teams, and orchestrate success from a powerful dashboard.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "var(--accent-primary)", fontWeight: 700 }}>
              ENTER PORTAL <ArrowRight size={18} />
            </div>
          </motion.div>

          {/* Volunteer Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -10 }}
            onClick={() => navigate('/volunteer/login')}
            style={{ cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "32px", padding: "48px 32px", textAlign: "center", transition: "all 0.3s ease" }}
          >
            <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "rgba(124,124,255,0.1)", color: "var(--accent-secondary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px auto" }}>
              <Users size={40} />
            </div>
            <h2 style={{ fontSize: "1.8rem", color: "#fff", marginBottom: "16px" }}>I am a Volunteer</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "0.95rem" }}>Find opportunities, build your profile, and contribute to amazing local events.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "var(--accent-secondary)", fontWeight: 700 }}>
              ENTER PORTAL <ArrowRight size={18} />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Home;

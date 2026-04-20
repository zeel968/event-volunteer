import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../context/EventContext";
import { motion } from "framer-motion";
import { ShieldAlert, Mail, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import api from "../api";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle, user } = useEvents();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? "/organizer" : "/volunteer");
    }
  }, [user, navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/send-otp', { email });
      const data = response.data;
      if (data.success) {
        if (data.devMode) {
          setOtp(data.otp);
          console.log("[Dev Mode] Ethereal Preview:", data.previewUrl);
        }
        setStep(2);
      } else {
        alert(data.error || "Failed to send OTP");
      }
    } catch (err) {
      alert("Error connecting to server. Is the backend running?");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/verify-otp', { email, otp });
      const data = response.data;
      if (data.success) {
        if (await login(email, 'admin', data.token)) {
          navigate("/organizer");
        } else {
          alert("Login failed on frontend.");
        }
      } else {
        alert(data.error || "Invalid OTP");
      }
    } catch (err) {
      alert("Error verifying OTP.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", top: "50%", right: "20%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(124,124,255,0.15) 0%, transparent 70%)", filter: "blur(50px)", pointerEvents: "none" }}></div>
      
      <motion.div 
        className="form-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", delay: 0.1 }}
        style={{ borderTop: "4px solid var(--accent-secondary)" }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: "rgba(124,124,255,0.1)", padding: "16px", borderRadius: "50%", marginBottom: "16px", color: "var(--accent-secondary)" }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>Organizer Access</h2>
          <p style={{ color: "var(--text-muted)" }}>Secure OTP login for event administrators.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={16} /> Admin Email
              </label>
              <input 
                type="email" 
                placeholder="admin@test.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <motion.button 
              type="submit" 
              className="primary-btn" 
              style={{ marginTop: "12px", width: "100%", background: "linear-gradient(135deg, var(--accent-secondary), #5A5AEE)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? "Sending..." : <>Send OTP <ArrowRight size={18} /></>}
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyRound size={16} /> Enter OTP
              </label>
              <input 
                type="text" 
                placeholder="123456" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
              />
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "8px" }}>
                Code sent to {email}. <span style={{color: "var(--accent-secondary)", cursor: "pointer"}} onClick={() => { setStep(1); setOtp(""); }}>Wrong email?</span>
              </p>
              {otp && <p style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "2px" }}>✓ Testing Mode: Code auto-filled from Ethereal Simulator.</p>}
            </div>

            <motion.button 
              type="submit" 
              className="primary-btn" 
              style={{ marginTop: "12px", width: "100%", background: "linear-gradient(135deg, var(--accent-secondary), #5A5AEE)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? "Verifying..." : <>Verify Admin Access <ArrowRight size={18} /></>}
            </motion.button>
          </form>
        )}

        <div style={{ margin: "30px 0", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-glass)" }}></div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-glass)" }}></div>
        </div>

        <motion.button 
          onClick={signInWithGoogle}
          className="secondary-btn" 
          style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)" }}
          whileTap={{ scale: 0.98 }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: "18px" }} />
          Continue with Google
        </motion.button>

        <p style={{ textAlign: "center", marginTop: "24px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          New organizer? <Link to="/register?role=admin" style={{ color: "var(--accent-secondary)", textDecoration: "none", fontWeight: 600 }}>Create account</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default AdminLogin;

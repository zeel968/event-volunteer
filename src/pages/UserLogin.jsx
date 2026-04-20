import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../context/EventContext";
import { motion } from "framer-motion";
import { KeyRound, Mail, ArrowRight, Loader2 } from "lucide-react";

function UserLogin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle, user, apiUrl } = useEvents();
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
      const response = await fetch(`${apiUrl}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        if (data.devMode) {
          // Dev mode: automatically set OTP to make testing smoother to bypass lack of SMTP
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
      const response = await fetch(`${apiUrl}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (data.success) {
        if (await login(email, 'volunteer', data.token)) {
          navigate("/volunteer");
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
      <div style={{ position: "absolute", top: "20%", left: "20%", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }}></div>
      
      <motion.div 
        className="form-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>Welcome Back</h2>
          <p style={{ color: "var(--text-muted)" }}>Sign in with Email to continue.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={16} /> Email Address
              </label>
              <input 
                type="email" 
                placeholder="volunteer@test.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <motion.button 
              type="submit" 
              className="primary-btn" 
              style={{ marginTop: "12px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
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
                Code sent to {email}. <span style={{color: "var(--accent-primary)", cursor: "pointer"}} onClick={() => { setStep(1); setOtp(""); }}>Wrong email?</span>
              </p>
              {otp && <p style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "2px" }}>✓ Testing Mode: Code auto-filled from Ethereal Simulator.</p>}
            </div>

            <motion.button 
              type="submit" 
              className="primary-btn" 
              style={{ marginTop: "12px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? "Verifying..." : <>Verify & Login <ArrowRight size={18} /></>}
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
          Don't have an account? <Link to="/register" style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 600 }}>Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default UserLogin;

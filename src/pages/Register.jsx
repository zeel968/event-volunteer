import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useEvents } from "../context/EventContext";
import { motion } from "framer-motion";
import { UserPlus, Mail, KeyRound, Type, ArrowRight } from "lucide-react";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const { register, apiUrl } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");
    if (roleParam === "admin" || roleParam === "user") {
      setRole(roleParam);
    }
  }, [location]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role })
      });
      const data = await response.json();
      if (data.success) {
        alert("Registration successful! Please login.");
        navigate(role === 'admin' ? "/admin-login" : "/user-login");
      } else {
        alert(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      alert("Error connecting to server. Is the backend running?");
    }
  };

  return (
    <div style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <motion.div 
        className="form-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
        style={{ maxWidth: "550px", width: "100%" }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: "rgba(16,185,129,0.1)", padding: "16px", borderRadius: "50%", marginBottom: "16px", color: "var(--accent-success)" }}>
            <UserPlus size={32} />
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>Create an Account</h2>
          <p style={{ color: "var(--text-muted)" }}>Join the platform to volunteer or organize events.</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}><Type size={16}/> Full Name</label>
              <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>Role Selection</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginTop: "8px", width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-glass)", color: "white" }}>
                <option value="user">Volunteer</option>
                <option value="admin">Organizer</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}><Mail size={16} /> Email Address</label>
            <input type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}><KeyRound size={16} /> Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <motion.button 
            type="submit" 
            className="primary-btn" 
            style={{ marginTop: "16px", width: "100%", background: "linear-gradient(135deg, var(--accent-success), #059669)", color: "white" }}
            whileTap={{ scale: 0.98 }}
          >
            Complete Registration <ArrowRight size={18} />
          </motion.button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Already have an account? <Link to="/user-login" style={{ color: "var(--accent-success)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Register;

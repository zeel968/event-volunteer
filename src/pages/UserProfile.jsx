import { useState, useMemo, useEffect } from 'react';
import { useEvents } from '../context/EventContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserRound, 
  Clock, 
  Award, 
  TrendingUp, 
  CalendarDays, 
  MapPin, 
  CheckCircle2, 
  Zap,
  ShieldCheck,
  Star,
  Edit3,
  Save,
  X,
  Phone,
  Mail,
  Building2
} from 'lucide-react';

function UserProfile() {
  const { user, applications, events, updateProfile } = useEvents();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    city: user?.city || '',
    skills: user?.skills || ['Crowd Management', 'First Aid']
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        phone: user.phone || '',
        city: user.city || '',
        skills: user.skills || ['Crowd Management', 'First Aid']
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile(formData);
    if (result.success) {
      setIsEditing(false);
    } else {
      alert(result.error || "Failed to update profile");
    }
    setSaving(false);
  };

  // Derived Analytics
  const userApps = useMemo(() => applications.filter(a => a.email === user?.email), [applications, user]);
  const approvedApps = useMemo(() => userApps.filter(a => a.status === 'Approved'), [userApps]);
  
  const pastEvents = useMemo(() => {
    return approvedApps.map(app => {
      const eventDetails = events.find(e => e.id === app.eventId);
      return {
        ...eventDetails,
        date: eventDetails?.date || 'Past Date',
        status: 'Completed',
        hoursEarned: 5 // Static for demo
      };
    }).filter(e => e.id);
  }, [approvedApps, events]);

  const totalHours = pastEvents.reduce((acc, curr) => acc + curr.hoursEarned, 0) || 0;
  const impactScore = (totalHours * 10) + (approvedApps.length * 50);
  
  const getRank = (hours) => {
    if(hours >= 50) return { title: 'Elite Volunteer', color: 'var(--accent-warning)', icon: <Star size={24} color="var(--accent-warning)" /> };
    if(hours >= 20) return { title: 'Pro Volunteer', color: 'var(--accent-primary)', icon: <Award size={24} color="var(--accent-primary)" /> };
    return { title: 'Rising Star', color: 'var(--accent-success)', icon: <TrendingUp size={24} color="var(--accent-success)" /> };
  };

  const rank = getRank(totalHours);

  return (
    <div className="container" style={{ paddingTop: "120px", paddingBottom: "60px", minHeight: "90vh" }}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "1000px", margin: "0 auto" }}
      >
        
        {/* HERO SECTION */}
        <motion.div className="glass-card" style={{ position: "relative", overflow: "hidden", padding: "40px" }}>
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: `radial-gradient(circle, ${rank.color}30 0%, transparent 70%)`, filter: "blur(40px)" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
              <div style={{ position: "relative", width: "100px", height: "100px", borderRadius: "50%", background: "var(--bg-glass)", border: "2px solid var(--border-glass)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${rank.color}40`, flexShrink: 0 }}>
                <UserRound size={48} color="var(--text-main)" />
                <div style={{ position: "absolute", bottom: "-5px", right: "-5px", background: "var(--bg-main)", borderRadius: "50%", padding: "4px" }}>
                  {rank.icon}
                </div>
              </div>

              <div>
                {!isEditing ? (
                  <>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "8px", background: `linear-gradient(135deg, var(--text-main) 0%, ${rank.color} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {user?.name || 'Volunteer'}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Mail size={16} /> {user?.email}</span>
                      <span>•</span>
                      <span style={{ color: rank.color, fontWeight: 600 }}>{rank.title}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input 
                      style={{ fontSize: "1.5rem", padding: "8px 12px", width: "300px" }}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Your Full Name"
                    />
                    <input 
                      style={{ fontSize: "0.9rem", padding: "6px 12px", width: "300px" }}
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Your City"
                    />
                  </div>
                )}
              </div>
            </div>

            <button 
              className="primary-btn" 
              style={{ padding: "10px 20px", background: isEditing ? "var(--bg-glass)" : "var(--accent-primary)", color: isEditing ? "var(--text-main)" : "white" }}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
            >
              {isEditing ? (saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save</>) : <><Edit3 size={18} /> Edit Profile</>}
            </button>
          </div>

          <AnimatePresence>
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: "30px", borderTop: "1px solid var(--border-glass)", paddingTop: "20px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginBottom: "8px" }}>Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      placeholder="+1 234 567 890" 
                    />
                  </div>
                  <div>
                    <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginBottom: "8px" }}>Bio</label>
                    <textarea 
                      style={{ width: "100%", height: "80px", padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", color: "white" }}
                      value={formData.bio} 
                      onChange={(e) => setFormData({...formData, bio: e.target.value})} 
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isEditing && user?.bio && (
            <p style={{ marginTop: "24px", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "700px" }}>
              {user.bio}
            </p>
          )}
        </motion.div>

        {/* ANALYTICS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {[
            { label: 'Total Hours', value: totalHours, icon: <Clock size={24} color="var(--accent-primary)" /> },
            { label: 'Events Attended', value: pastEvents.length, icon: <CheckCircle2 size={24} color="var(--accent-success)" /> },
            { label: 'Impact Score', value: impactScore, icon: <Zap size={24} color="var(--accent-warning)" /> }
          ].map((stat, idx) => (
            <motion.div key={idx} className="glass-card" style={{ padding: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{stat.label}</p>
                <h3 style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stat.value}</h3>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "12px", border: "1px solid var(--border-glass)" }}>
                {stat.icon}
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px", alignItems: "start" }}>
          
          {/* INFO & SKILLS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <motion.div className="glass-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={18} color="var(--accent-primary)" /> Contact Info
              </h3>
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ color: "var(--text-muted)" }}><Phone size={16} /></div>
                  <span style={{ color: "var(--text-main)" }}>{user?.phone || 'Not provided'}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ color: "var(--text-muted)" }}><MapPin size={16} /></div>
                  <span style={{ color: "var(--text-main)" }}>{user?.city || 'Location not set'}</span>
                </div>
              </div>
            </motion.div>

            <motion.div className="glass-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={18} color="var(--accent-warning)" /> Skills
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(user?.skills || ['Crowd Management', 'First Aid']).map((skill, i) => (
                  <span key={i} style={{ background: "rgba(0,229,255,0.1)", color: "var(--accent-primary)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>{skill}</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* TIMELINE */}
          <motion.div className="glass-card" style={{ padding: "32px" }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "32px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CalendarDays size={20} color="var(--accent-success)" /> Volunteer Timeline
            </h3>
            
            {pastEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <Clock size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                <p>No past events yet. Your journey starts here!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {pastEvents.map((event, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: "12px", height: "12px", background: "var(--accent-success)", borderRadius: "50%", boxShadow: "0 0 10px var(--accent-success)" }} />
                      <div style={{ flex: 1, width: "2px", background: "var(--border-glass)", margin: "4px 0" }} />
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "16px", padding: "16px", marginBottom: idx === pastEvents.length - 1 ? 0 : "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <h4 style={{ fontWeight: 700 }}>{event.title}</h4>
                        <span style={{ color: "var(--accent-success)", fontSize: "0.8rem" }}>+{event.hoursEarned} hrs</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}

const Loader2 = ({ className }) => <div className={className} style={{ width: "20px", height: "20px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>;

export default UserProfile;
;

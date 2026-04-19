import { useState, useEffect } from 'react';
import { useEvents } from '../context/EventContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Globe, 
  Edit3, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Activity,
  MapPin,
  TrendingUp
} from 'lucide-react';

function OrganizerProfile() {
  const { user, events, applications, updateProfile } = useEvents();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    organization_name: user?.organization_name || '',
    organization_type: user?.organization_type || '',
    website: user?.website || '',
    bio: user?.bio || '',
    city: user?.city || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        organization_name: user.organization_name || '',
        organization_type: user.organization_type || '',
        website: user.website || '',
        bio: user.bio || '',
        city: user.city || ''
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

  // Stats
  const hostedEventsCount = events.filter(e => e.organizerEmail === user?.email).length;
  const totalApplications = applications.filter(a => {
    const event = events.find(e => e.id === a.eventId);
    return event?.organizerEmail === user?.email;
  }).length;

  return (
    <div className="container" style={{ paddingTop: "120px", paddingBottom: "60px", minHeight: "90vh" }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}
      >
        
        {/* Header / Hero */}
        <div className="glass-card" style={{ padding: "40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(124,124,255,0.1) 0%, transparent 70%)", filter: "blur(40px)" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
              <div style={{ width: "100px", height: "100px", borderRadius: "24px", background: "var(--bg-glass)", border: "2px solid var(--border-glass)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                <Building2 size={48} color="var(--accent-secondary)" />
              </div>
              
              <div>
                {!isEditing ? (
                  <>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "8px" }}>
                      {user?.organization_name || user?.name || 'Organization Name'}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><ShieldCheck size={16} color="var(--accent-secondary)" /> Verified Organizer</span>
                      <span>•</span>
                      <span>{user?.organization_type || 'Event Host'}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <input 
                      value={formData.organization_name}
                      onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
                      placeholder="Organization Name"
                      style={{ fontSize: "1.5rem", width: "400px" }}
                    />
                    <select 
                      value={formData.organization_type}
                      onChange={(e) => setFormData({...formData, organization_type: e.target.value})}
                      style={{ padding: "10px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", color: "white", border: "1px solid var(--border-glass)" }}
                    >
                      <option value="">Select Org Type</option>
                      <option value="Non-profit">Non-profit</option>
                      <option value="Community">Community</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Educational">Educational</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <button 
              className="primary-btn" 
              style={{ padding: "12px 24px", background: isEditing ? "var(--bg-glass)" : "var(--accent-secondary)" }}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
            >
              {isEditing ? (saving ? <Loader2Icon /> : <><Save size={18} /> Save Changes</>) : <><Edit3 size={18} /> Edit Profile</>}
            </button>
          </div>

          {!isEditing && user?.bio && (
            <p style={{ marginTop: "32px", color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1.7, maxWidth: "800px" }}>
              {user.bio}
            </p>
          )}

          {isEditing && (
            <div style={{ marginTop: "32px" }}>
              <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>About Organization</label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Write a brief description about your organization..."
                style={{ width: "100%", height: "120px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", color: "white" }}
              />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {[
            { label: 'Active Events', value: hostedEventsCount, icon: <Calendar color="var(--accent-secondary)" /> },
            { label: 'Total Applications', value: totalApplications, icon: <Users color="var(--accent-success)" /> },
            { label: 'Organizer Score', value: 850, icon: <TrendingUp color="var(--accent-warning)" /> }
          ].map((stat, i) => (
            <div key={i} className="glass-card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{stat.label}</p>
                <h3 style={{ fontSize: "2rem", fontWeight: 800 }}>{stat.value}</h3>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "12px" }}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Details Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="glass-card" style={{ padding: "24px" }}>
              <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}><Activity size={20} color="var(--accent-secondary)" /> Official Links</h3>
              <div style={{ display: "grid", gap: "16px" }}>
                {!isEditing ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}>
                      <Globe size={16} /> <a href={user?.website} target="_blank" style={{ color: "var(--accent-secondary)" }}>{user?.website || 'No website set'}</a>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}>
                      <Mail size={16} /> <span>{user?.email}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}>
                      <MapPin size={16} /> <span>{user?.city || 'Worldwide'}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <input 
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="Organization Website (URL)"
                    />
                    <input 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Organization Location (City)"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "32px" }}>
            <h3 style={{ marginBottom: "24px" }}>Quick Management</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <motion.button whileHover={{ scale: 1.02 }} style={{ padding: "20px", borderRadius: "16px", background: "rgba(124,124,255,0.1)", border: "1px solid var(--accent-secondary)", color: "var(--accent-secondary)", fontWeight: 600 }}>
                View All Events
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} style={{ padding: "20px", borderRadius: "16px", background: "rgba(16,185,129,0.1)", border: "1px solid var(--accent-success)", color: "var(--accent-success)", fontWeight: 600 }}>
                Review Applications
              </motion.button>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

const Loader2Icon = () => <div style={{ width: "18px", height: "18px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>;

export default OrganizerProfile;

import { useState } from "react";
import { useEvents } from "../context/EventContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarPlus, MapPin, IndianRupee, Users, FileText, Briefcase, Calendar, Clock, Loader2 } from "lucide-react";

const InputWrapper = ({ icon: Icon, children }) => (
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
      <Icon size={18} />
    </div>
    {children}
  </div>
);

function CreateEvent() {
  const { addEvent, user } = useEvents();
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);

  const [formData, setFormData] = useState({
    title: "", 
    role: "", 
    stipend: "", 
    totalSeats: "", 
    requirements: "", 
    location: "", // Address string entered by user
    date: "",
    startTime: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null; // Fallback or handle error
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.role || !formData.date || !formData.location) return;

    setIsPublishing(true);

    // 1. Fetch real coordinates from the address text
    const coords = await geocodeAddress(formData.location);
    
    if (!coords) {
      alert("Could not find that location precisely. Please try adding more detail (e.g., City, State).");
      setIsPublishing(false);
      return;
    }

    // 2. Publish event with fetched coordinates
    await addEvent({
      ...formData,
      stipend: Number(formData.stipend),
      totalSeats: Number(formData.totalSeats),
      availableSlots: Number(formData.totalSeats),
      organizerEmail: user?.email,
      lat: coords.lat, 
      lng: coords.lng,
      status: 'Upcoming'
    });

    setIsPublishing(false);
    navigate("/organizer");
  };

  return (
    <div style={{ minHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px" }}>
      <motion.div 
        className="form-card" 
        style={{ maxWidth: "600px", margin: 0, width: "100%" }}
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: "rgba(0,229,255,0.1)", padding: "16px", borderRadius: "50%", marginBottom: "16px", color: "var(--accent-primary)" }}>
            <CalendarPlus size={32} />
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 700 }}>Post New Event</h2>
          <p style={{ color: "var(--text-muted)" }}>Coordinates will be automatically fetched from your address.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Title & Role */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <InputWrapper icon={Briefcase}>
              <input name="title" placeholder="Event Title" value={formData.title} onChange={handleChange} required style={{ paddingLeft: "44px", marginTop: 0 }} />
            </InputWrapper>
            <InputWrapper icon={Users}>
              <input name="role" placeholder="Role Needed" value={formData.role} onChange={handleChange} required style={{ paddingLeft: "44px", marginTop: 0 }} />
            </InputWrapper>
          </div>

          {/* Date & Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: 0 }}><Calendar size={14}/> Event Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ marginTop: 0, paddingLeft: "16px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: 0 }}><Clock size={14}/> Start Time</label>
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required style={{ marginTop: 0, paddingLeft: "16px" }} />
            </div>
          </div>
          
          {/* Location Name - Now used for Geocoding */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
             <label style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: 0 }}>
               <MapPin size={14} /> Full Location Address
             </label>
             <input 
               name="location" 
               placeholder="e.g. Narendra Modi Stadium, Ahmedabad, Gujarat" 
               value={formData.location} 
               onChange={handleChange} 
               required 
               disabled={isPublishing}
               style={{ marginTop: 0, paddingLeft: "16px" }} 
             />
             <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>We'll automatically calculate the coordinates for our discovery map.</p>
          </div>
          
          {/* Stipend & Seats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <InputWrapper icon={IndianRupee}>
              <input type="number" name="stipend" placeholder="Stipend Per Volunteer (₹)" value={formData.stipend} onChange={handleChange} required style={{ paddingLeft: "44px", marginTop: 0 }} />
            </InputWrapper>
            <InputWrapper icon={Users}>
              <input type="number" name="totalSeats" placeholder="Total Volunteer Seats" value={formData.totalSeats} onChange={handleChange} required style={{ paddingLeft: "44px", marginTop: 0 }} />
            </InputWrapper>
          </div>

          {/* Requirements */}
          <div style={{ position: "relative" }}>
             <div style={{ position: "absolute", left: "16px", top: "16px", color: "var(--text-muted)", pointerEvents: "none" }}>
              <FileText size={18} />
             </div>
             <textarea name="requirements" placeholder="Requirements (e.g. skills, experience needed)" value={formData.requirements} onChange={handleChange} required style={{ paddingLeft: "44px", minHeight: "100px", resize: "vertical" }} />
          </div>

          <motion.button 
            type="submit" 
            className="primary-btn" 
            style={{ marginTop: "10px", justifyContent: "center", gap: "10px" }} 
            disabled={isPublishing}
            whileTap={{ scale: isPublishing ? 1 : 0.98 }}
          >
            {isPublishing ? (
              <> <Loader2 size={18} className="anim-spin" /> Publishing... </>
            ) : (
              "Publish Event"
            )}
          </motion.button>
        </form>

        <style>{`
           .anim-spin { animation: spin 1s linear infinite; }
           @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </motion.div>
    </div>
  );
}
export default CreateEvent;

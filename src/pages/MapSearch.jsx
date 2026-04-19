import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState, useMemo } from "react";
import { useEvents } from "../context/EventContext";
import { motion } from "framer-motion";
import { Map, Navigation } from "lucide-react";

function MapSearch() {
  const { events, applications, user } = useEvents();
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation([position.coords.latitude, position.coords.longitude]);
    });
  }, []);

  const visibleEvents = useMemo(() => {
    // If Organizer, show everything
    if (user?.role === 'admin' || user?.role === 'organizer') return events;
    
    // If Volunteer or Guest, show all upcoming/live events for discovery
    return events.filter(event => event.status !== 'Finished');
  }, [events, user]);


  if (!userLocation) return (
    <div className="container" style={{ paddingTop: "120px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ color: "var(--accent-primary)" }}>
         <Navigation size={48} />
      </motion.div>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: "120px", minHeight: "90vh" }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
           <Map size={36} color="var(--accent-secondary)" /> Live Staffing Map
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "30px" }}>Explore approved opportunities around your location.</p>
      </motion.div>

      <motion.div 
        className="map-wrapper"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        style={{ border: "2px solid var(--border-glass)", borderRadius: "24px", padding: "8px", background: "var(--bg-card)", boxShadow: "var(--shadow-glow-strong)" }}
      >
        <MapContainer center={userLocation} zoom={13} style={{ height: "100%", width: "100%", borderRadius: "16px" }}>
          <TileLayer
            attribution='© OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={userLocation}>
            <Popup>
              <strong>You are here</strong>
            </Popup>
          </Marker>
          {visibleEvents.map((event) => (
            <Marker key={event.id} position={[event.lat, event.lng]}>
              <Popup>
                <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>{event.title}</h3>
                <p style={{ margin: "0 0 4px 0", color: "#666" }}><strong>Role:</strong> {event.role}</p>
                <p style={{ margin: "0", color: "#10B981", fontWeight: "bold" }}>₹{event.stipend}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </motion.div>
    </div>
  );
}
export default MapSearch;

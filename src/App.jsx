import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PortalLogin from './pages/PortalLogin';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CreateEvent from './pages/CreateEvent';
import VolunteerDashboard from './pages/VolunteerDashboard';
import BrowseEvents from './pages/BrowseEvents';
import MapSearch from './pages/MapSearch';
import ManageApplications from './pages/ManageApplications';
import UserProfile from './pages/UserProfile';
import OrganizerProfile from './pages/OrganizerProfile';
import EventAttendance from './pages/EventAttendance';
import PaymentDashboard from './pages/PaymentDashboard';
import AuthRedirect from './pages/AuthRedirect';

import { EventProvider } from './context/EventContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <EventProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Home />} />

          {/* Separate Login Portals (Official Clerk Integration) */}
          <Route path="/organizer/login/*" element={<PortalLogin portal="organizer" />} />
          <Route path="/organizer/register/*" element={<PortalLogin portal="organizer" />} />
          
          <Route path="/volunteer/login/*" element={<PortalLogin portal="volunteer" />} />
          <Route path="/volunteer/register/*" element={<PortalLogin portal="volunteer" />} />

          {/* Shared Tools */}
          <Route path="/browse" element={<BrowseEvents />} />
          <Route path="/map" element={<MapSearch />} />

          {/* Auth Bridge */}
          <Route path="/auth-redirect" element={<AuthRedirect />} />

          {/* Organizer Portal (Protected) */}
          <Route path="/organizer/dashboard" element={
            <ProtectedRoute requiredPortal="organizer" allowedRoles={['organizer', 'admin']}>
              <OrganizerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/create-event" element={
            <ProtectedRoute requiredPortal="organizer" allowedRoles={['organizer', 'admin']}>
              <CreateEvent />
            </ProtectedRoute>
          } />
          <Route path="/manage-applications" element={
            <ProtectedRoute requiredPortal="organizer" allowedRoles={['organizer', 'admin']}>
              <ManageApplications />
            </ProtectedRoute>
          } />
          <Route path="/event-attendance/:eventId" element={
            <ProtectedRoute requiredPortal="organizer" allowedRoles={['organizer', 'admin']}>
              <EventAttendance />
            </ProtectedRoute>
          } />
          <Route path="/payment-dashboard/:eventId" element={
            <ProtectedRoute requiredPortal="organizer" allowedRoles={['organizer', 'admin']}>
              <PaymentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/organizer-profile" element={
            <ProtectedRoute requiredPortal="organizer" allowedRoles={['organizer', 'admin']}>
              <OrganizerProfile />
            </ProtectedRoute>
          } />

          {/* Volunteer Portal (Protected) */}
          <Route path="/volunteer/dashboard" element={
            <ProtectedRoute requiredPortal="volunteer" allowedRoles={['volunteer', 'user']}>
              <VolunteerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute requiredPortal="volunteer" allowedRoles={['volunteer', 'user']}>
              <UserProfile />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </EventProvider>
  );
}

export default App;

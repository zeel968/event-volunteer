import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, User, Mail, Calendar, Loader2, ArrowLeft, Play, Flag, Info } from 'lucide-react';

function EventAttendance() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { events, applications, startEvent, finishEvent, markAttendance } = useEvents();

  const event = events.find(e => e.id === Number(eventId));
  const approvedApps = applications.filter(app => app.eventId === Number(eventId) && (app.status === 'Approved' || app.status === 'Present' || app.status === 'Absent' || app.status === 'Paid'));

  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleSelect = (appId) => {
    setSelectedIds(prev => prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]);
  };

  const selectAll = () => {
    if (selectedIds.length === approvedApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvedApps.map(a => a.id));
    }
  };

  const handleMarkAttendance = async (status) => {
    if (selectedIds.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one volunteer.' });
      return;
    }
    setLoading(true);
    const res = await markAttendance(eventId, selectedIds, status);
    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: `Marked ${selectedIds.length} volunteer(s) as ${status}.` });
      setSelectedIds([]);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update attendance.' });
    }
  };

  const handleStart = async () => {
    setLoading(true);
    const res = await startEvent(eventId);
    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Event is now Live!' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to start event.' });
    }
  };

  const handleFinish = async () => {
    if (!window.confirm('Are you sure you want to finish this event? This will notify all present volunteers to submit their payment info.')) return;
    setLoading(true);
    const res = await finishEvent(eventId);
    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Event finished and volunteers notified.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to finish event.' });
    }
  };

  return (
    <div className="container" style={{ paddingTop: '120px', minHeight: '90vh' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <button 
          onClick={() => navigate('/organizer/dashboard')} 
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}
        >
          <ArrowLeft size={16}/> Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '1px' }}>📋 Attendance Management</span>
            <h2 style={{ fontSize: '2.5rem', marginTop: '4px' }}>{event?.title || 'Event'}</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Current Status: <strong style={{ color: event?.status === 'Live' ? 'var(--accent-primary)' : (event?.status === 'Finished' ? 'var(--accent-success)' : 'var(--accent-warning)') }}>{event?.status || 'Upcoming'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {event?.status !== 'Live' && event?.status !== 'Finished' && (
              <button className="primary-btn" onClick={handleStart} disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : <Play size={16} />} Start Event
              </button>
            )}
            {event?.status === 'Live' && (
              <button className="primary-btn" onClick={handleFinish} disabled={loading} style={{ background: 'var(--accent-success)', color: 'black' }}>
                {loading ? <Loader2 size={16} className="spin" /> : <Flag size={16} />} Finish Event
              </button>
            )}
            {event?.status === 'Finished' && (
              <button className="primary-btn" onClick={() => navigate(`/payment-dashboard/${eventId}`)} style={{ background: 'var(--accent-secondary)' }}>
                Go to Payments
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ 
              padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px',
              background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
              color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}
          >
            {message.type === 'success' ? <CheckCircle size={18}/> : <Info size={18}/>}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {approvedApps.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px', border: '1px dashed var(--border-glass)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No approved volunteers for this event.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.3rem' }}>Select Volunteers ({selectedIds.length} selected)</h3>
            <button onClick={selectAll} style={{ background: 'none', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {selectedIds.length === approvedApps.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', width: '50px' }}></th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Volunteer Info</th>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Current Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedApps.map((app, index) => (
                  <tr key={app.id} style={{ borderTop: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '16px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(app.id)} 
                        onChange={() => toggleSelect(app.id)}
                        style={{ width: '18px', height: '18px' }}
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(124,124,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
                          <User size={18} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>{app.name || 'Anonymous'}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{app.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                        background: app.status === 'Present' ? 'rgba(16,185,129,0.1)' : (app.status === 'Absent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'),
                        color: app.status === 'Present' ? 'var(--accent-success)' : (app.status === 'Absent' ? 'var(--accent-danger)' : 'var(--text-muted)')
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                       {/* Quick individual actions could go here */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '16px', position: 'sticky', bottom: '20px', background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)', zIndex: 100 }}>
             <button 
               className="primary-btn" 
               disabled={loading || selectedIds.length === 0} 
               onClick={() => handleMarkAttendance('Present')}
               style={{ flex: 1, background: 'var(--accent-success)', color: 'black' }}
             >
               {loading ? <Loader2 size={18} className="spin" /> : <CheckCircle size={18} />} Mark Present
             </button>
             <button 
               className="primary-btn" 
               disabled={loading || selectedIds.length === 0} 
               onClick={() => handleMarkAttendance('Absent')}
               style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)' }}
             >
               {loading ? <Loader2 size={18} className="spin" /> : <XCircle size={18} />} Mark Absent
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventAttendance;

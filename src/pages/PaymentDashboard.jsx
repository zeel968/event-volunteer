import React, { useState } from 'react';
import { useEvents } from '../context/EventContext';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, CreditCard, User, Mail, Wallet, IndianRupee, ArrowLeft, Check, Loader2 } from 'lucide-react';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { events, applications, updateApplicationStatus, createPayment, confirmPayment } = useEvents();

  const event = events.find(e => e.id === Number(eventId));
  
  const unpaidVolunteers = applications.filter(
    app => app.eventId === Number(eventId) && ['Approved', 'Present'].includes(app.status)
  );

  const paidVolunteers = applications.filter(
    app => app.eventId === Number(eventId) && app.status === 'Paid'
  );

  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === unpaidVolunteers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidVolunteers.map(v => v.id));
    }
  };

  const selectedVolunteers = unpaidVolunteers.filter(v => selectedIds.includes(v.id));
  const totalAmount = selectedVolunteers.length * (event?.stipend || 0);

  const handlePayAll = async () => {
    if (selectedIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select volunteers to pay first.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setMessage({ type: 'error', text: 'Failed to load Razorpay. Check your internet connection.' });
        setLoading(false);
        return;
      }

      // Create order on backend
      const amountPaise = totalAmount * 100;
      const receipt = `event_${eventId}_batch_${Date.now()}`;
      const orderRes = await createPayment(amountPaise, receipt, selectedIds.join(','));

      if (!orderRes.success) {
        setMessage({ type: 'error', text: orderRes.error || 'Failed to create payment order.' });
        setLoading(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: orderRes.order.amount,
        currency: orderRes.order.currency || 'INR',
        name: 'Volunteer Stipend Payment',
        description: `Paying ${selectedIds.length} volunteer(s) for: ${event?.title}`,
        order_id: orderRes.order.id,
        handler: async function (response) {
          // Verify payment
          const verifyRes = await confirmPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            applicationId: selectedIds.join(',') // pass all IDs for backend status update
          });

          if (verifyRes.success) {
            // Mark all selected volunteers as Paid
            selectedIds.forEach(id => updateApplicationStatus(id, 'Paid'));
            setSelectedIds([]);
            setMessage({ type: 'success', text: `Successfully paid ${selectedIds.length} volunteer(s)! ₹${totalAmount} processed.` });
          } else {
            setMessage({ type: 'error', text: 'Payment verification failed. Contact support.' });
          }
        },
        prefill: {
          email: event?.organizerEmail || ''
        },
        theme: { color: '#10B981' },
        modal: {
          ondismiss: function() {
            setMessage({ type: 'error', text: 'Payment cancelled.' });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    }

    setLoading(false);
  };

  return (
    <div className="container" style={{ paddingTop: '120px', minHeight: '90vh' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <button 
          onClick={() => navigate('/organizer')} 
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}
        >
          <ArrowLeft size={16}/> Back to Dashboard
        </button>

        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--accent-success)', fontWeight: 700, letterSpacing: '1px' }}>💰 Payment Dashboard</span>
        <h2 style={{ fontSize: '2.2rem', marginTop: '4px' }}>{event?.title || 'Event'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', marginBottom: '24px' }}>
          {event?.date} at {event?.startTime || '--:--'} • {event?.location} • Stipend: ₹{event?.stipend || 0} per volunteer
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-warning)' }}>{unpaidVolunteers.length}</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending</p>
          </div>
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-success)' }}>{paidVolunteers.length}</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paid</p>
          </div>
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{selectedIds.length}</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selected</p>
          </div>
        </div>
      </motion.div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ 
              padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600,
              background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
              color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}
          >
            {message.type === 'success' ? <CheckCircle size={18}/> : <CreditCard size={18}/>}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Volunteer List */}
      {unpaidVolunteers.length === 0 && paidVolunteers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px', border: '1px dashed var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>No Volunteers Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>No approved volunteers found for this event.</p>
        </div>
      ) : (
        <>
          {/* Unpaid */}
          {unpaidVolunteers.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--accent-warning)' }}>⏳ Select & Pay ({unpaidVolunteers.length})</h3>
                <button 
                  onClick={selectAll}
                  style={{ background: 'none', border: '1px solid var(--border-glass)', color: 'var(--accent-primary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {selectedIds.length === unpaidVolunteers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {unpaidVolunteers.map((v, index) => {
                  const isSelected = selectedIds.includes(v.id);
                  return (
                    <motion.div 
                      key={v.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => toggleSelect(v.id)}
                      className="glass-card" 
                      style={{ 
                        padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', cursor: 'pointer',
                        border: isSelected ? '1px solid var(--accent-success)' : '1px solid var(--border-glass)',
                        boxShadow: isSelected ? '0 0 20px rgba(16,185,129,0.15)' : 'none'
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{ 
                        width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                        border: isSelected ? 'none' : '2px solid var(--border-glass)',
                        background: isSelected ? 'var(--accent-success)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={16} color="black" strokeWidth={3}/>}
                      </div>

                      {/* Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 200px' }}>
                        <div style={{ width: '44px', height: '44px', background: 'rgba(124,124,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)', flexShrink: 0 }}>
                          <User size={22} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{v.name || 'Volunteer'}</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12}/> {v.email}</p>
                        </div>
                      </div>

                      {/* UPI */}
                      <div style={{ flex: '1 1 180px' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>UPI ID</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: v.upiId ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                          <Wallet size={16}/>
                          <span style={{ fontWeight: 600 }}>{v.upiId || 'Not Provided'}</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', flex: '0 0 auto' }}>
                        <IndianRupee size={16}/>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{event?.stipend || 0}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pay All Button */}
              {selectedIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card" 
                  style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--accent-success)', boxShadow: '0 0 30px rgba(16,185,129,0.15)', marginBottom: '40px' }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Pay {selectedIds.length} Volunteer{selectedIds.length > 1 ? 's' : ''}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total: <strong style={{ color: 'var(--accent-success)', fontSize: '1.2rem' }}>₹{totalAmount}</strong></p>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    className="primary-btn"
                    disabled={loading}
                    onClick={handlePayAll}
                    style={{ 
                      padding: '14px 32px', fontSize: '1rem',
                      background: 'var(--accent-success)', color: 'black', border: 'none',
                      boxShadow: '0 0 20px rgba(16,185,129,0.4)'
                    }}
                  >
                    {loading ? <><Loader2 size={18} className="spin"/> Processing...</> : <><CreditCard size={18}/> Pay ₹{totalAmount} via Razorpay</>}
                  </motion.button>
                </motion.div>
              )}
            </>
          )}

          {/* Paid */}
          {paidVolunteers.length > 0 && (
            <>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--accent-success)' }}>✅ Paid ({paidVolunteers.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {paidVolunteers.map(v => (
                  <div key={v.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle size={20} color="var(--accent-success)" />
                      <span style={{ fontWeight: 600 }}>{v.name || 'Volunteer'}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.email}</span>
                      <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{v.upiId}</span>
                    </div>
                    <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>₹{event?.stipend || 0} Paid ✓</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default PaymentDashboard;

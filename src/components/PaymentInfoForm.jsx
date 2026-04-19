import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEvents } from '../context/EventContext';
import { Send, CheckCircle, X, Loader2 } from 'lucide-react';

function PaymentInfoForm({ onClose }) {
  const { savePaymentInfo, user } = useEvents();
  const [upiId, setUpiId] = useState(user?.upi_id || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!upiId.includes('@')) {
      return setError('Please enter a valid UPI ID (e.g., name@bank)');
    }
    setLoading(true);
    setError('');
    const res = await savePaymentInfo(upiId);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(res.error || 'Failed to save payment info.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="glass-card" 
        style={{ padding: '32px', maxWidth: '400px', width: '90%', position: 'relative' }}
      >
        {!success && (
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ color: 'var(--accent-success)', marginBottom: '16px' }}>
              <CheckCircle size={64} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>UPI ID Saved!</h3>
            <p style={{ color: 'var(--text-muted)' }}>Organizer will now be able to process your stipend.</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Payment Details</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Please provide your UPI ID to receive your stipend for the event you attended.
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>UPI ID</label>
                <input 
                  type="text" 
                  placeholder="yourname@upi" 
                  value={upiId} 
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                  required
                />
              </div>

              {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem' }}>{error}</p>}

              <button className="primary-btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
                {loading ? <Loader2 size={20} className="spinner" /> : <><Send size={18} /> Save UPI ID</>}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default PaymentInfoForm;

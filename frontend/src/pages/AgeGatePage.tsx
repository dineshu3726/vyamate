import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AgeGatePage() {
  const { user, updateUser, token } = useAuthStore();
  const navigate = useNavigate();
  const [method, setMethod] = useState<'dob' | 'id' | null>(null);
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!dob) { toast.error('Please enter your date of birth'); return; }
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 16) { toast.error('You must be 16 or older to use VyaMate'); return; }

    setLoading(true);
    try {
      const res = await authAPI.updateProfile({ ageVerified: true });
      updateUser(res.data);
      toast.success('Age verified!');
      navigate('/vibe-check');
    } catch { toast.error('Verification failed'); }
    finally { setLoading(false); }
  }

  if (!token) { navigate('/login'); return null; }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={iconBox}><ShieldCheck size={32} color="#fff" /></div>
        <h1 style={titleStyle}>Age Verification Required</h1>
        <p style={subtitleStyle}>VyaMate is only available to users 16 and older. This keeps our community safe.</p>

        {!method ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            <button onClick={() => setMethod('dob')} style={optBtnStyle}>
              Verify with Date of Birth
            </button>
            <button onClick={() => setMethod('id')} style={{ ...optBtnStyle, background: 'var(--teal-light)', color: 'var(--teal)' }}>
              Verify with Digital ID
            </button>
          </div>
        ) : method === 'id' ? (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ background: 'var(--teal-light)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <p style={{ color: 'var(--teal-dark)', fontSize: 14 }}>Digital ID verification integration coming soon.<br />Please use Date of Birth method for now.</p>
            </div>
            <button onClick={() => setMethod('dob')} style={optBtnStyle}>Use Date of Birth Instead</button>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            <label style={labelStyle}>Date of Birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={inputStyle} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '10px 14px', background: '#FFF8E7', borderRadius: 10, border: '1px solid #F59E0B30' }}>
              <AlertCircle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#92601A' }}>Your date of birth is used only for age verification and is not shown to other users.</p>
            </div>
            <button onClick={verify} disabled={loading} style={{ ...optBtnStyle, marginTop: 16 }}>
              {loading ? 'Verifying...' : 'Confirm & Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: 'linear-gradient(160deg, #E0F5F5 0%, #fff 60%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '40px 28px',
  maxWidth: 400, width: '100%', boxShadow: '0 16px 48px rgba(0,156,157,0.12)',
};
const iconBox: React.CSSProperties = {
  width: 64, height: 64, background: 'var(--teal)', borderRadius: 18,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(0,156,157,0.3)',
};
const titleStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, textAlign: 'center', color: 'var(--text)', marginBottom: 8 };
const subtitleStyle: React.CSSProperties = { fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 };
const optBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', background: 'var(--teal)', color: '#fff',
  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)',
  borderRadius: 10, fontSize: 15, color: 'var(--text)', background: '#fff', outline: 'none',
};

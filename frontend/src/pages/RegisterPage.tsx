import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import VyaMateLogo from '../components/common/VyaMateLogo';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dob) { toast.error('Date of birth required'); return; }
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 16) { toast.error('You must be 16 or older'); return; }
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password, dob });
      setAuth(res.data.user, res.data.token);
      toast.success('Account created!');
      navigate('/age-gate');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <VyaMateLogo height={90} showText={true} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal)', marginTop: 6 }}>Join VyaMate</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Find your neighborhood workout crew</p>
      </div>

      <div style={cardStyle}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Date of Birth <span style={{ color: 'var(--error)', fontSize: 11 }}>(must be 16+)</span></label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required
                style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={eyeBtn}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={submitBtn}>
            {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 700 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: 'linear-gradient(160deg, #E0F5F5 0%, #fff 60%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '28px 24px',
  maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,156,157,0.1)',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: 'var(--text)' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)',
  borderRadius: 10, fontSize: 14, color: 'var(--text)', background: '#fff', outline: 'none',
};
const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
};
const submitBtn: React.CSSProperties = {
  width: '100%', padding: '13px', background: 'var(--teal)', color: '#fff',
  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
};

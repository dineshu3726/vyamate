import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import VyaMateLogo from '../components/common/VyaMateLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      setAuth(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  }

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <VyaMateLogo height={110} showText={true} />
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Your neighborhood workout crew</p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Sign In</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={eyeBtn}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? <Loader size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          New to VyaMate?{' '}
          <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 700 }}>Create Account</Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: 'linear-gradient(160deg, #E0F5F5 0%, #fff 60%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '28px 24px',
  maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,156,157,0.1)',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)',
  borderRadius: 10, fontSize: 15, color: 'var(--text)', background: '#fff', outline: 'none',
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

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import VyaMateLogo from '../components/common/VyaMateLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <VyaMateLogo height={90} />
        </div>
      </div>

      <div style={cardStyle}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--teal)', fontWeight: 600, marginBottom: 20, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Sign In
        </Link>

        {!sent ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Mail size={24} color="var(--teal)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Forgot Password?</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                No worries! Enter your registered email and we'll send you a strong temporary password instantly.
              </p>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  style={inputStyle}
                />
              </div>

              <button type="submit" disabled={loading} style={submitBtn}>
                {loading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                  : <><Mail size={16} /> Send Temporary Password</>
                }
              </button>
            </form>

            <div style={{ marginTop: 20, background: 'var(--teal-light)', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, color: 'var(--teal-dark)', lineHeight: 1.6, margin: 0 }}>
                🔐 We'll generate a strong temporary password and email it to you. It expires in <strong>1 hour</strong> and you'll be asked to set a new one after logging in.
              </p>
            </div>
          </>
        ) : (
          <SuccessState email={email} />
        )}
      </div>
    </div>
  );
}

function SuccessState({ email }: { email: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#E8FBF3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <CheckCircle2 size={40} color="#10B981" />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Check Your Inbox!</h3>

      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>
        We've sent a temporary password to
      </p>
      <div style={{ background: 'var(--teal-light)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'inline-block' }}>
        <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 14 }}>{email}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', background: '#F8FAFB', borderRadius: 14, padding: '16px', marginBottom: 24 }}>
        {[
          { n: '1', text: 'Open the email from VyaMate' },
          { n: '2', text: 'Copy the temporary password' },
          { n: '3', text: 'Sign in — you\'ll be asked to create a new password' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--teal)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 3 }}>{s.text}</span>
          </div>
        ))}
      </div>

      <Link to="/login" style={{ display: 'block', background: 'var(--teal)', color: '#fff', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 15, textDecoration: 'none', textAlign: 'center' }}>
        Go to Sign In →
      </Link>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5 }}>
        Didn't receive it? Check your spam folder or{' '}
        <button
          onClick={() => window.location.reload()}
          style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600, cursor: 'pointer', fontSize: 12, padding: 0 }}
        >
          try again
        </button>.
      </p>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: 'linear-gradient(160deg, #E0F5F5 0%, #fff 60%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '28px 24px',
  maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,156,157,0.1)',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)',
  borderRadius: 10, fontSize: 15, color: 'var(--text)', background: '#fff', outline: 'none', boxSizing: 'border-box',
};
const submitBtn: React.CSSProperties = {
  width: '100%', padding: '13px', background: 'var(--teal)', color: '#fff',
  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
};

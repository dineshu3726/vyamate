import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import VyaMateLogo from '../components/common/VyaMateLogo';

// ── Password strength ──────────────────────────────────────────────────────────

interface StrengthResult {
  score: number;       // 0–4
  label: string;
  color: string;
  checks: { label: string; pass: boolean }[];
}

function checkStrength(pwd: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters', pass: pwd.length >= 8 },
    { label: 'Uppercase letter (A–Z)', pass: /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter (a–z)', pass: /[a-z]/.test(pwd) },
    { label: 'Number (0–9)', pass: /[0-9]/.test(pwd) },
    { label: 'Special character (!@#…)', pass: /[^A-Za-z0-9]/.test(pwd) },
  ];
  const score = checks.filter(c => c.pass).length;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: '', color: 'transparent' },
    1: { label: 'Very Weak', color: '#EF4444' },
    2: { label: 'Weak', color: '#F97316' },
    3: { label: 'Fair', color: '#F59E0B' },
    4: { label: 'Strong', color: '#10B981' },
    5: { label: 'Very Strong', color: '#009C9D' },
  };
  return { score, ...map[score], checks };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const { updateUser } = useAuthStore();
  const navigate = useNavigate();

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = checkStrength(newPwd);
  const match = newPwd && confirmPwd && newPwd === confirmPwd;
  const canSubmit = strength.score >= 3 && match;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await authAPI.changePassword(newPwd);
      updateUser({ mustChangePassword: false });
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/'), 1800);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
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
        {!done ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <ShieldCheck size={26} color="var(--teal)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Create New Password</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You're signed in with a temporary password. Set a strong new password to secure your account.
              </p>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* New password */}
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    autoFocus
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowNew(s => !s)} style={eyeBtn}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {newPwd.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 4, borderRadius: 4,
                          background: i <= strength.score ? strength.color : '#E2EDED',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    {strength.label && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: strength.color }}>{strength.label}</div>
                    )}
                  </div>
                )}

                {/* Checklist */}
                {newPwd.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                    {strength.checks.map(c => (
                      <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: c.pass ? '#10B981' : '#E2EDED',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.2s',
                        }}>
                          {c.pass && <CheckCircle2 size={10} color="#fff" />}
                        </div>
                        <span style={{ color: c.pass ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    style={{
                      ...inputStyle,
                      paddingRight: 44,
                      borderColor: confirmPwd
                        ? match ? '#10B981' : '#EF4444'
                        : 'var(--border)',
                    }}
                  />
                  <button type="button" onClick={() => setShowConfirm(s => !s)} style={eyeBtn}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPwd && !match && (
                  <p style={{ fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>Passwords don't match</p>
                )}
                {confirmPwd && match && (
                  <p style={{ fontSize: 12, color: '#10B981', marginTop: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                style={{
                  ...submitBtn,
                  background: canSubmit ? 'var(--teal)' : '#CBD5E1',
                  cursor: canSubmit ? 'pointer' : 'default',
                  marginTop: 4,
                }}
              >
                {loading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</>
                  : <><Lock size={16} /> Set New Password</>
                }
              </button>
            </form>
          </>
        ) : (
          <DoneState />
        )}
      </div>
    </div>
  );
}

function DoneState() {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E8FBF3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'fadeUp 0.4s ease' }}>
        <CheckCircle2 size={48} color="#10B981" />
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Password Updated!</h3>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Your new password is set. Taking you to the app…
      </p>
      <div style={{ marginTop: 20, height: 4, borderRadius: 4, background: 'var(--teal-light)', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 4, animation: 'progress 1.8s linear forwards' }} />
      </div>
      <style>{`@keyframes progress { from { width: 0 } to { width: 100% } }`}</style>
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
const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
};
const submitBtn: React.CSSProperties = {
  width: '100%', padding: '13px', color: '#fff',
  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

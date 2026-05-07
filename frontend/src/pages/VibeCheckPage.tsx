import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, CheckCircle, Play } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const RULES = [
  { icon: '🤝', title: 'Respect Everyone', desc: 'Treat all VyaMate members with kindness, regardless of fitness level or background.' },
  { icon: '📍', title: 'Meet in Public Spaces', desc: 'Always meet at visible public locations — parks, gyms, or community centers.' },
  { icon: '🔒', title: 'Privacy First', desc: 'Never share personal contact details before building trust. Use in-app chat.' },
  { icon: '🛡️', title: 'Safe Word Protection', desc: 'If you feel unsafe, use the Safe Word button to instantly block & report.' },
  { icon: '🚫', title: 'Zero Harassment', desc: 'Any form of harassment, discrimination, or inappropriate behavior is grounds for removal.' },
];

export default function VibeCheckPage() {
  const { updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<'video' | 'rules' | 'done'>('video');
  const [countdown, setCountdown] = useState(30);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step !== 'video') return;
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); setStep('rules'); return 0; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [step]);

  async function complete() {
    if (!agreed) { toast.error('Please agree to the community guidelines'); return; }
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({ vibeCheckDone: true });
      updateUser(res.data);
      toast.success('Welcome to the VyaMate community!');
      navigate('/onboarding');
    } catch { toast.error('Failed to save. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={iconBox}><Heart size={28} color="#fff" fill="#fff" /></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>Neighborhood Respect</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
          Before you connect, take 30 seconds to understand our community values.
        </p>

        {step === 'video' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--teal), #005f60)',
              borderRadius: 16, padding: '40px 20px', marginBottom: 20,
              position: 'relative',
            }}>
              <Play size={48} color="#fff" style={{ opacity: 0.8 }} />
              <div style={{
                position: 'absolute', bottom: 12, right: 12,
                background: 'rgba(0,0,0,0.5)', borderRadius: 20,
                padding: '4px 12px', color: '#fff', fontSize: 13, fontWeight: 700,
              }}>
                0:{countdown.toString().padStart(2, '0')}
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Watching Neighborhood Respect video... ({countdown}s remaining)
            </p>
            <div style={{ marginTop: 16, background: 'var(--teal-light)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--teal)', width: `${((30 - countdown) / 30) * 100}%`, transition: 'width 1s linear' }} />
            </div>
          </div>
        )}

        {step === 'rules' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {RULES.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--teal-light)', borderRadius: 12, border: '1px solid #c0e9e9' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--teal)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I agree to treat all VyaMate members with respect and follow the community guidelines.
              </span>
            </label>
            <button onClick={complete} disabled={!agreed || loading} style={{
              width: '100%', padding: '14px', background: agreed ? 'var(--teal)' : '#ccc',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: agreed ? 'pointer' : 'not-allowed',
            }}>
              {loading ? 'Saving...' : 'I Agree — Continue to VyaMate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: 'linear-gradient(160deg, #E0F5F5 0%, #fff 60%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '36px 24px',
  maxWidth: 440, width: '100%', boxShadow: '0 16px 48px rgba(0,156,157,0.12)', margin: '20px 0',
};
const iconBox: React.CSSProperties = {
  width: 56, height: 56, background: 'var(--teal)', borderRadius: 16,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(0,156,157,0.3)',
};

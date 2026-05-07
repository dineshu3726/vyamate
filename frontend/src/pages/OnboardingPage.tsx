import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Activity, Clock, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { ACTIVITIES, SCHEDULES, FITNESS_LEVELS } from '../types';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const { updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [activities, setActivities] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');
  const [schedule, setSchedule] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locDone, setLocDone] = useState(false);

  function toggleActivity(a: string) {
    setActivities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  }
  function toggleSchedule(s: string) {
    setSchedule(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }

  async function getLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          await authAPI.updateProfile({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          updateUser({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocDone(true);
          toast.success('Location set!');
        } catch { toast.error('Failed to save location'); }
        setLocating(false);
      },
      () => { toast.error('Location denied — you can set it later in Profile'); setLocating(false); }
    );
  }

  async function finish() {
    if (activities.length === 0) { toast.error('Pick at least one activity'); return; }
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({ activities, fitnessLevel, schedule, bio });
      updateUser(res.data);
      toast.success('Profile complete!');
      navigate('/');
    } catch { toast.error('Save failed'); }
    finally { setLoading(false); }
  }

  const steps = [
    {
      title: 'What activities do you love?',
      subtitle: 'Pick all that apply',
      icon: <Activity size={24} color="#fff" />,
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ACTIVITIES.map(a => (
            <button key={a} onClick={() => toggleActivity(a)} style={chipStyle(activities.includes(a))}>{a}</button>
          ))}
        </div>
      ),
      canNext: activities.length > 0,
    },
    {
      title: 'What\'s your fitness level?',
      subtitle: 'Be honest — it helps find the right match',
      icon: <Activity size={24} color="#fff" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FITNESS_LEVELS.map(l => (
            <button key={l} onClick={() => setFitnessLevel(l)} style={{
              padding: '16px 20px', borderRadius: 14, border: `2px solid ${fitnessLevel === l ? 'var(--teal)' : 'var(--border)'}`,
              background: fitnessLevel === l ? 'var(--teal-light)' : '#fff',
              textAlign: 'left', cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 700, color: fitnessLevel === l ? 'var(--teal)' : 'var(--text)', fontSize: 15 }}>{l}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {l === 'Beginner' ? 'Just starting out, learning the basics' : l === 'Intermediate' ? 'Consistent routine, building strength' : 'Advanced training, high intensity'}
              </div>
            </button>
          ))}
        </div>
      ),
      canNext: true,
    },
    {
      title: 'When do you usually work out?',
      subtitle: 'Helps match you with people on similar schedules',
      icon: <Clock size={24} color="#fff" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCHEDULES.map(s => (
            <button key={s} onClick={() => toggleSchedule(s)} style={{
              padding: '12px 16px', borderRadius: 12,
              border: `2px solid ${schedule.includes(s) ? 'var(--teal)' : 'var(--border)'}`,
              background: schedule.includes(s) ? 'var(--teal-light)' : '#fff',
              cursor: 'pointer', textAlign: 'left',
              color: schedule.includes(s) ? 'var(--teal-dark)' : 'var(--text)',
              fontWeight: schedule.includes(s) ? 600 : 400, fontSize: 14,
            }}>{s}</button>
          ))}
        </div>
      ),
      canNext: schedule.length > 0,
    },
    {
      title: 'Enable Location',
      subtitle: 'Find workout partners near you',
      icon: <MapPin size={24} color="#fff" />,
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'var(--teal-light)', borderRadius: 16, padding: '32px 20px', marginBottom: 20 }}>
            <MapPin size={40} color="var(--teal)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              VyaMate uses your location to find workout partners nearby.<br /><br />
              <strong style={{ color: 'var(--teal)' }}>Privacy first:</strong> Your exact location is never shown. Others only see a ~300m neighborhood bubble.
            </p>
          </div>
          {locDone ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--success)', fontWeight: 600 }}>
              ✓ Location enabled
            </div>
          ) : (
            <button onClick={getLocation} disabled={locating} style={bigBtn}>{locating ? 'Getting location...' : 'Enable Location'}</button>
          )}
          <button onClick={finish} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
            Skip for now
          </button>
        </div>
      ),
      canNext: true,
      isFinal: true,
    },
  ];

  const current = steps[step];

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--teal)' : 'var(--teal-light)' }} />
          ))}
        </div>

        <div style={{ width: 48, height: 48, background: 'var(--teal)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {current.icon}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{current.title}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>{current.subtitle}</p>

        <div style={{ marginBottom: 28 }}>{current.content}</div>

        {!current.isFinal && (
          <button onClick={() => current.canNext && setStep(s => s + 1)}
            disabled={!current.canNext}
            style={{ ...bigBtn, background: current.canNext ? 'var(--teal)' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Continue <ChevronRight size={18} />
          </button>
        )}
        {current.isFinal && locDone && (
          <button onClick={finish} disabled={loading} style={{ ...bigBtn, marginTop: 12 }}>
            {loading ? 'Setting up...' : 'Enter VyaMate'}
          </button>
        )}
      </div>
    </div>
  );
}

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 20,
  border: `2px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
  background: active ? 'var(--teal)' : '#fff',
  color: active ? '#fff' : 'var(--text)', fontWeight: active ? 600 : 400,
  fontSize: 13, cursor: 'pointer',
});
const bigBtn: React.CSSProperties = {
  width: '100%', padding: '14px', background: 'var(--teal)', color: '#fff',
  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
};
const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: 'linear-gradient(160deg, #E0F5F5 0%, #fff 60%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '32px 24px',
  maxWidth: 440, width: '100%', boxShadow: '0 16px 48px rgba(0,156,157,0.12)', margin: '20px 0',
};

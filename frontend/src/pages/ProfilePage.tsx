import React, { useState } from 'react';
import { MapPin, Star, Award, LogOut, Edit3, Check, Navigation, Bell } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI, matchAPI } from '../services/api';
import { ACTIVITIES, SCHEDULES, FITNESS_LEVELS, ENDORSEMENTS } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [activities, setActivities] = useState<string[]>(user?.activities || []);
  const [fitnessLevel, setFitnessLevel] = useState(user?.fitnessLevel || 'Beginner');
  const [schedule, setSchedule] = useState<string[]>(user?.schedule || []);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showPending, setShowPending] = useState(false);

  async function saveProfile() {
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({ bio, activities, fitnessLevel, schedule });
      updateUser(res.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to save'); }
    finally { setLoading(false); }
  }

  async function enableLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await authAPI.updateProfile({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          updateUser(res.data);
          toast.success('Location updated!');
        } catch { toast.error('Failed'); }
        setLocating(false);
      },
      () => { toast.error('Location denied'); setLocating(false); }
    );
  }

  async function loadPending() {
    try {
      const res = await matchAPI.getPending();
      setPendingRequests(res.data);
      setShowPending(true);
    } catch { toast.error('Failed to load requests'); }
  }

  async function respondRequest(matchId: string, action: 'accept' | 'decline') {
    try {
      await matchAPI.respond(matchId, action);
      setPendingRequests(p => p.filter(r => r._id !== matchId));
      if (action === 'accept') toast.success('Match accepted! Chat is now unlocked.');
      else toast.success('Request declined.');
    } catch { toast.error('Failed'); }
  }

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const toggle = (arr: string[], val: string, set: React.Dispatch<React.SetStateAction<string[]>>) => {
    set(a => a.includes(val) ? a.filter(x => x !== val) : [...a, val]);
  };

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      {/* Profile Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--teal), #005f60)', borderRadius: 20, padding: '24px 20px', marginBottom: 16, color: '#fff', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, flexShrink: 0 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.name}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{user?.fitnessLevel} · {user?.activities?.slice(0, 2).join(', ')}</div>
            {user?.localHero && (
              <div style={{ marginTop: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                ⭐ Local Hero
              </div>
            )}
          </div>
          <button onClick={() => { if (editing) saveProfile(); else setEditing(true); }} disabled={loading}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
            {editing ? <><Check size={13} /> Save</> : <><Edit3 size={13} /> Edit</>}
          </button>
        </div>

        {/* Grit Points */}
        <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{user?.gritPoints || 0}</div>
            <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>GRIT POINTS</div>
          </div>
          {Object.entries(user?.endorsements || {}).slice(0, 3).map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{v as number}</div>
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>{k.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Requests */}
      <div onClick={loadPending} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color="var(--teal)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Match Requests</span>
        </div>
        <span style={{ background: 'var(--teal)', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
      </div>

      {showPending && pendingRequests.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingRequests.map(r => (
            <div key={r._id} style={{ background: 'var(--teal-light)', borderRadius: 12, padding: '12px 14px', border: '1px solid #c0e9e9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {r.sender?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.sender?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.sender?.fitnessLevel} · {r.sender?.activities?.join(', ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => respondRequest(r._id, 'accept')} style={{ padding: '6px 12px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                <button onClick={() => respondRequest(r._id, 'decline')} style={{ padding: '6px 10px', background: '#f0f0f0', color: 'var(--text)', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit sections */}
      {editing ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid var(--border)', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Edit Profile</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Tell others about your fitness journey..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', resize: 'vertical', outline: 'none', background: '#fff' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Activities</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACTIVITIES.map(a => (
                <button key={a} onClick={() => toggle(activities, a, setActivities)} style={chip(activities.includes(a))}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Fitness Level</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FITNESS_LEVELS.map(l => (
                <button key={l} onClick={() => setFitnessLevel(l)} style={{ ...chip(fitnessLevel === l), flex: 1 }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Schedule</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SCHEDULES.map(s => (
                <button key={s} onClick={() => toggle(schedule, s, setSchedule)} style={{
                  padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${schedule.includes(s) ? 'var(--teal)' : 'var(--border)'}`,
                  background: schedule.includes(s) ? 'var(--teal-light)' : '#fff', cursor: 'pointer',
                  color: schedule.includes(s) ? 'var(--teal-dark)' : 'var(--text)', fontWeight: schedule.includes(s) ? 600 : 400, fontSize: 13, textAlign: 'left',
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Activities */}
          <div style={section}>
            <h3 style={sectionTitle}>Activities</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {user?.activities?.map(a => (
                <span key={a} style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{a}</span>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div style={section}>
            <h3 style={sectionTitle}>Workout Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {user?.schedule?.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Location */}
      <div style={section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={sectionTitle}>Location</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {user?.lat ? '✓ Location enabled (300m bubble for privacy)' : 'Location not set'}
            </p>
          </div>
          <button onClick={enableLocation} disabled={locating} style={{ background: 'var(--teal-light)', border: '1px solid #c0e9e9', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', color: 'var(--teal)', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Navigation size={12} />
            {locating ? 'Locating...' : user?.lat ? 'Update' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} style={{ width: '100%', padding: '13px', background: '#FFF0F0', border: '1px solid #FCA5A5', borderRadius: 14, fontSize: 14, fontWeight: 700, color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        <LogOut size={15} /> Sign Out
      </button>
    </div>
  );
}

const section: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid var(--border)', marginBottom: 12 };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 };
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' };
const chip = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
  background: active ? 'var(--teal)' : '#fff', color: active ? '#fff' : 'var(--text)',
  fontWeight: active ? 600 : 400, fontSize: 12, cursor: 'pointer',
});

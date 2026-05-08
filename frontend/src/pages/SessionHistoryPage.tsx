import React, { useState, useEffect } from 'react';
import { Flame, Plus, Trash2, Clock, Dumbbell, X, Loader, ChevronLeft, Star } from 'lucide-react';
import { sessionAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Session, ACTIVITIES } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface HistoryData {
  sessions: Session[];
  streak: number;
  totalSessions: number;
  totalMinutes: number;
  favoriteActivity: string | null;
}

const ACTIVITY_EMOJI: Record<string, string> = {
  Running: '🏃', Cycling: '🚴', Yoga: '🧘', Powerlifting: '🏋️', HIIT: '⚡',
  Swimming: '🏊', Tennis: '🎾', Basketball: '🏀', Walking: '🚶', CrossFit: '💪',
  Pilates: '🤸', Boxing: '🥊',
};

export default function SessionHistoryPage() {
  const { updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await sessionAPI.getHistory();
      setData(res.data);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    try {
      await sessionAPI.delete(id);
      setData(d => d ? {
        ...d,
        sessions: d.sessions.filter(s => s._id !== id),
        totalSessions: d.totalSessions - 1,
        totalMinutes: d.totalMinutes - (d.sessions.find(s => s._id === id)?.durationMinutes || 0),
      } : d);
      toast.success('Session removed');
    } catch { toast.error('Failed to remove session'); }
  }

  function handleLogged(session: Session) {
    setData(d => {
      if (!d) return d;
      const sessions = [session, ...d.sessions];
      const activityCount: Record<string, number> = {};
      sessions.forEach(s => { activityCount[s.activity] = (activityCount[s.activity] || 0) + 1; });
      const favoriteActivity = Object.entries(activityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return {
        sessions,
        totalSessions: d.totalSessions + 1,
        totalMinutes: d.totalMinutes + session.durationMinutes,
        favoriteActivity,
        streak: d.streak, // will refresh on next full load
      };
    });
    // Refresh to get updated streak
    load();
    setShowLog(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Loader size={28} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', display: 'flex', padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Session History</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Track your workout consistency</p>
        </div>
        <button onClick={() => setShowLog(true)} style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Log
        </button>
      </div>

      {/* Streak banner */}
      {data && data.streak > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #FF6B35, #F7931E)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🔥</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{data.streak}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>day streak — keep it up!</div>
          </div>
          {data.streak >= 7 && (
            <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <Star size={16} color="#fff" fill="#fff" />
              <div style={{ fontSize: 9, color: '#fff', fontWeight: 700, marginTop: 2 }}>WEEKLY</div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <StatCard value={data.totalSessions} label="Workouts" icon={<Dumbbell size={16} color="var(--teal)" />} />
          <StatCard value={`${Math.round(data.totalMinutes / 60)}h`} label="Total Time" icon={<Clock size={16} color="var(--teal)" />} />
          <StatCard
            value={data.favoriteActivity ? (ACTIVITY_EMOJI[data.favoriteActivity] || '🏅') : '—'}
            label={data.favoriteActivity || 'Favorite'}
            icon={<Flame size={16} color="var(--teal)" />}
          />
        </div>
      )}

      {/* Grit tip */}
      <div style={{ background: 'var(--teal-light)', border: '1px solid #c0e9e9', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
        <Star size={14} color="var(--teal)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: 'var(--teal-dark)', lineHeight: 1.5 }}>
          <strong>+5 Grit Points</strong> awarded for each logged session. Stay consistent to climb the leaderboard!
        </p>
      </div>

      {/* Session list */}
      {!data || data.sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <Dumbbell size={48} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No sessions yet</p>
          <p style={{ fontSize: 13 }}>Log your first workout to start tracking your streak!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.sessions.map(s => (
            <SessionCard key={s._id} session={s} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showLog && (
        <LogSessionModal
          onClose={() => setShowLog(false)}
          onLogged={handleLogged}
        />
      )}
    </div>
  );
}

function StatCard({ value, label, icon }: { value: string | number; label: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 12px', border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: (id: string) => void }) {
  const emoji = ACTIVITY_EMOJI[session.activity] || '🏅';
  const date = new Date(session.completedAt);
  const isToday = new Date().toDateString() === date.toDateString();
  const isYesterday = new Date(Date.now() - 86400000).toDateString() === date.toDateString();
  const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{session.activity}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {session.durationMinutes} min</span>
          <span>·</span>
          <span>{dateLabel} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {session.notes && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{session.notes}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>+{session.gritPointsEarned}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>GRIT</div>
        </div>
        <button onClick={() => onDelete(session._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function LogSessionModal({ onClose, onLogged }: { onClose: () => void; onLogged: (s: Session) => void }) {
  const [activity, setActivity] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!activity || !durationMinutes) { toast.error('Activity and duration are required'); return; }
    const dur = parseInt(durationMinutes);
    if (isNaN(dur) || dur < 1 || dur > 600) { toast.error('Duration must be 1–600 minutes'); return; }
    setLoading(true);
    try {
      const res = await sessionAPI.log({ activity, durationMinutes: dur, notes, completedAt });
      toast.success(`Session logged! +${res.data.gritPointsEarned} Grit Points`);
      onLogged(res.data);
    } catch { toast.error('Failed to log session'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Log Workout</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Activity</label>
            <select value={activity} onChange={e => setActivity(e.target.value)} style={inp}>
              <option value="">Select activity</option>
              {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Duration (minutes)</label>
            <input
              type="number" min="1" max="600"
              value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)}
              placeholder="e.g. 45" style={inp}
            />
          </div>

          <div>
            <label style={lbl}>When</label>
            <input
              type="datetime-local"
              value={completedAt} onChange={e => setCompletedAt(e.target.value)}
              style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Notes (optional)</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="How did it go? Personal bests, how you felt..."
              rows={2} style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          {/* Quick duration chips */}
          <div>
            <label style={lbl}>Quick select</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[15, 30, 45, 60, 90].map(d => (
                <button key={d} onClick={() => setDurationMinutes(String(d))} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${durationMinutes === String(d) ? 'var(--teal)' : 'var(--border)'}`,
                  background: durationMinutes === String(d) ? 'var(--teal)' : '#fff',
                  color: durationMinutes === String(d) ? '#fff' : 'var(--text)',
                }}>{d}m</button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={loading} style={{ width: '100%', padding: 13, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Flame size={16} /> {loading ? 'Logging...' : 'Log Workout (+5 Grit)'}
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' };
const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', background: '#fff', outline: 'none', boxSizing: 'border-box' };

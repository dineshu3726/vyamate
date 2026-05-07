import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Info, UserPlus, Star, Loader, Navigation, Filter } from 'lucide-react';
import { matchAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MatchUser, ACTIVITIES, FITNESS_LEVELS } from '../types';
import toast from 'react-hot-toast';

type Mode = 'neighbor' | 'peer';

export default function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('neighbor');
  const [results, setResults] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5);
  const [filterActivity, setFilterActivity] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showWhy, setShowWhy] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { load(); }, [mode, radius, filterActivity, filterLevel]);

  async function load() {
    setLoading(true);
    try {
      let res;
      if (mode === 'neighbor') res = await matchAPI.neighbors(radius);
      else res = await matchAPI.peers(filterActivity || undefined, filterLevel || undefined);
      setResults(res.data);
    } catch { toast.error('Failed to load matches'); }
    finally { setLoading(false); }
  }

  async function sendRequest(targetId: string) {
    try {
      await matchAPI.sendRequest(targetId);
      setPendingIds(s => new Set([...s, targetId]));
      toast.success('Match request sent!');
    } catch { toast.error('Failed to send request'); }
  }

  const hasLocation = !!user?.lat;

  return (
    <div style={{ padding: '0 0 20px' }}>
      {/* Mode toggle */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={toggleContainer}>
          <button onClick={() => setMode('neighbor')} style={toggleBtn(mode === 'neighbor')}>
            <MapPin size={14} /> Neighbor
          </button>
          <button onClick={() => setMode('peer')} style={toggleBtn(mode === 'peer')}>
            <Users size={14} /> Peer
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
          {mode === 'neighbor' ? 'Proximity-first: Find partners within your radius' : 'Skill-first: Match by activity & fitness level'}
        </p>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {mode === 'neighbor' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <MapPin size={14} color="var(--teal)" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Radius:</span>
            {[1, 2, 5, 10].map(r => (
              <button key={r} onClick={() => setRadius(r)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${radius === r ? 'var(--teal)' : 'var(--border)'}`,
                background: radius === r ? 'var(--teal)' : '#fff',
                color: radius === r ? '#fff' : 'var(--text)',
              }}>{r}mi</button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            <select value={filterActivity} onChange={e => setFilterActivity(e.target.value)} style={selectStyle}>
              <option value="">All Activities</option>
              {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
            </select>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={selectStyle}>
              <option value="">All Levels</option>
              {FITNESS_LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        )}
        <button onClick={load} style={{ background: 'var(--teal-light)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--teal)', display: 'flex', alignItems: 'center' }}>
          <Navigation size={14} />
        </button>
      </div>

      {/* No location warning */}
      {mode === 'neighbor' && !hasLocation && (
        <div style={{ margin: '0 16px 12px', background: '#FFF8E7', border: '1px solid #F59E0B30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 8 }}>
          <MapPin size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#92601A' }}>
            Location not set. Go to Profile → Enable Location to find nearby partners.
          </p>
        </div>
      )}

      {/* Active Beacon */}
      <div style={{ margin: '0 16px 12px', background: 'var(--teal)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 2s infinite' }} />
        <span style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 500 }}>Post an Active Beacon — let neighbors know you're out!</span>
        <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Go Live
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader size={28} color="var(--teal)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <Users size={48} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No matches found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your filters or expanding your radius.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
          {results.map(u => (
            <div key={u._id} style={matchCard}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={avatarStyle}>{u.name?.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{u.name}</span>
                    {u.localHero && (
                      <span style={{ background: '#FFF3CD', color: '#92601A', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                        ⭐ Local Hero
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {u.fitnessLevel} · {u.activities?.slice(0, 2).join(', ')}
                    {mode === 'neighbor' && u.dist && ` · ${u.dist} mi away`}
                  </div>
                </div>
                {u.gritPoints !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>{u.gritPoints}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>GRIT</div>
                  </div>
                )}
              </div>

              {u.bio && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{u.bio}</p>}

              {/* Schedule chips */}
              {u.schedule && u.schedule.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {u.schedule.map((s: string) => (
                    <span key={s} style={{ fontSize: 11, background: 'var(--teal-light)', color: 'var(--teal-dark)', padding: '3px 9px', borderRadius: 10, fontWeight: 500 }}>
                      🕐 {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Proximity blur badge */}
              {mode === 'neighbor' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                  <MapPin size={11} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Neighborhood bubble (~300m area)</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowWhy(showWhy === u._id ? null : (u._id || ''))}
                  style={{ flex: 1, padding: '9px', background: 'var(--teal-light)', border: '1px solid #c0e9e9', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--teal)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Info size={13} /> Why?
                </button>
                {pendingIds.has(u._id || '') ? (
                  <button disabled style={{ flex: 2, padding: '9px', background: '#f0f0f0', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                    Request Sent
                  </button>
                ) : (
                  <button onClick={() => sendRequest(u._id || '')}
                    style={{ flex: 2, padding: '9px', background: 'var(--teal)', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <UserPlus size={13} /> Connect
                  </button>
                )}
              </div>

              {/* Why explanation */}
              {showWhy === u._id && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                  <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                    <strong>Why you're seeing this:</strong><br />{u.matchReason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const toggleContainer: React.CSSProperties = {
  display: 'flex', background: 'var(--teal-light)', borderRadius: 12, padding: 4,
};
const toggleBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '10px', border: 'none', borderRadius: 9,
  background: active ? 'var(--teal)' : 'transparent',
  color: active ? '#fff' : 'var(--text-secondary)',
  fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all 0.2s',
});
const matchCard: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '16px',
  boxShadow: '0 2px 12px rgba(0,156,157,0.06)', border: '1px solid var(--border)',
};
const avatarStyle: React.CSSProperties = {
  width: 48, height: 48, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--teal), #005f60)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
};
const selectStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, color: 'var(--text)', background: '#fff', outline: 'none',
};

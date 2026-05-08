import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Globe, Loader, Star } from 'lucide-react';
import { leaderboardAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface LeaderEntry {
  rank: number;
  _id: string;
  name: string;
  gritPoints: number;
  localHero: boolean;
  activities: string[];
  fitnessLevel: string;
  endorsements: Record<string, number>;
  endorsementCount: number;
  isMe: boolean;
}

type TabType = 'global' | 'neighborhood';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabType>('global');
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const res = await leaderboardAPI.get(tab);
      setData(res.data.leaderboard);
      setMyRank(res.data.myRank);
      setTotalUsers(res.data.totalUsers);
    } catch { toast.error('Failed to load leaderboard'); }
    finally { setLoading(false); }
  }

  const heroes = data.filter(u => u.localHero).slice(0, 3);
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <Trophy size={22} color="var(--teal)" />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Leaderboard</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top Grit Points earners in your community</p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', background: 'var(--teal-light)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button onClick={() => setTab('global')} style={tabBtn(tab === 'global')}>
          <Globe size={13} /> Global
        </button>
        <button onClick={() => setTab('neighborhood')} style={tabBtn(tab === 'neighborhood')}>
          <MapPin size={13} /> Neighborhood
        </button>
      </div>

      {tab === 'neighborhood' && !user?.lat && (
        <div style={{ background: '#FFF8E7', border: '1px solid #F59E0B30', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
          <MapPin size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#92601A' }}>Enable location in Profile to see your neighborhood leaderboard.</p>
        </div>
      )}

      {/* My rank banner */}
      {myRank && (
        <div style={{ background: 'linear-gradient(135deg, var(--teal), #005f60)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' }}>
            #{myRank}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Your Rank</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{user?.gritPoints || 0} Grit Points · out of {totalUsers} users</div>
          </div>
          {user?.localHero && (
            <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 16 }}>⭐</div>
              <div style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>LOCAL HERO</div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader size={28} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <Trophy size={48} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No rankings yet</p>
          <p style={{ fontSize: 13 }}>Complete workouts and get endorsed to earn Grit Points!</p>
        </div>
      ) : (
        <>
          {/* Local Heroes spotlight */}
          {heroes.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#92601A' }}>Local Heroes</span>
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {heroes.map(h => (
                  <div key={h._id} style={{ flexShrink: 0, textAlign: 'center', width: 72 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 auto 6px', border: '2px solid #FDE68A' }}>
                      {h.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                    <div style={{ fontSize: 10, color: '#92601A', fontWeight: 600 }}>{h.gritPoints} pts</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
              {/* 2nd place */}
              <PodiumCard entry={top3[1]} medal={MEDALS[1]} color={MEDAL_COLORS[1]} height={90} />
              {/* 1st place */}
              <PodiumCard entry={top3[0]} medal={MEDALS[0]} color={MEDAL_COLORS[0]} height={110} />
              {/* 3rd place */}
              <PodiumCard entry={top3[2]} medal={MEDALS[2]} color={MEDAL_COLORS[2]} height={76} />
            </div>
          )}

          {/* Ranked list (4th onwards, + top 3 if podium not shown) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(top3.length < 3 ? data : rest).map(entry => (
              <RankRow key={entry._id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PodiumCard({ entry, medal, color, height }: { entry: LeaderEntry; medal: string; color: string; height: number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{medal}</div>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 auto 6px', border: `2px solid ${color}` }}>
        {entry.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{entry.name}{entry.isMe ? ' (You)' : ''}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal)' }}>{entry.gritPoints}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>GRIT</div>
      <div style={{ height, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: '8px 8px 0 0', marginTop: 8 }} />
    </div>
  );
}

function RankRow({ entry }: { entry: LeaderEntry }) {
  return (
    <div style={{ background: entry.isMe ? 'var(--teal-light)' : '#fff', border: `1.5px solid ${entry.isMe ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 28, textAlign: 'center', fontSize: 13, fontWeight: 800, color: entry.isMe ? 'var(--teal)' : 'var(--text-muted)', flexShrink: 0 }}>
        #{entry.rank}
      </div>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #005f60)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
        {entry.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{entry.name}{entry.isMe ? ' (You)' : ''}</span>
          {entry.localHero && <span style={{ fontSize: 11 }}>⭐</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
          {entry.fitnessLevel} · {entry.activities.slice(0, 2).join(', ')}
          {entry.endorsementCount > 0 && ` · ${entry.endorsementCount} endorsements`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>{entry.gritPoints}</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>GRIT</div>
      </div>
    </div>
  );
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '10px', border: 'none', borderRadius: 9,
  background: active ? 'var(--teal)' : 'transparent',
  color: active ? '#fff' : 'var(--text-secondary)',
  fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all 0.2s',
});

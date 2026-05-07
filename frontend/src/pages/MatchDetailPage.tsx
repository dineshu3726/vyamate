import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Award } from 'lucide-react';
import { matchAPI } from '../services/api';
import { ENDORSEMENTS } from '../types';
import toast from 'react-hot-toast';

export default function MatchDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function endorse() {
    if (selected.length === 0) { toast.error('Select at least one endorsement'); return; }
    setLoading(true);
    try {
      const res = await matchAPI.endorse(userId!, selected);
      toast.success(`Endorsed! They earned ${res.data.gritPoints} Grit Points${res.data.localHero ? ' 🌟 Now a Local Hero!' : ''}`);
      setDone(true);
    } catch { toast.error('Failed to endorse'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
        <ChevronLeft size={18} /> Back
      </button>

      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', boxShadow: '0 4px 16px rgba(0,156,157,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #005f60)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 auto 12px' }}>
            ?
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Post-Session Check-in</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>How was your workout partner?</p>
        </div>

        {!done ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Endorse them for:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {ENDORSEMENTS.map(e => (
                <button key={e} onClick={() => setSelected(s => s.includes(e) ? s.filter(x => x !== e) : [...s, e])}
                  style={{ padding: '10px 18px', borderRadius: 20, border: `2px solid ${selected.includes(e) ? 'var(--teal)' : 'var(--border)'}`, background: selected.includes(e) ? 'var(--teal)' : '#fff', color: selected.includes(e) ? '#fff' : 'var(--text)', fontWeight: selected.includes(e) ? 700 : 400, fontSize: 14, cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>
            <button onClick={endorse} disabled={loading} style={{ width: '100%', padding: 13, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Award size={16} /> {loading ? 'Sending...' : 'Give Endorsement'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)', marginBottom: 8 }}>Endorsement Sent!</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>You've helped them earn Grit Points and build their reputation.</p>
            <button onClick={() => navigate('/chat')} style={{ padding: '12px 24px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <MessageCircle size={15} /> Back to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

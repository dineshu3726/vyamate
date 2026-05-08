import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Users, Crown, Camera, X, Loader, Plus } from 'lucide-react';
import { shortsAPI, templateAPI } from '../services/api';
import { Short, ACTIVITIES } from '../types';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function ShortsPage() {
  const { user } = useAuthStore();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [clapAnim, setClapAnim] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await shortsAPI.getAll();
      setShorts(res.data);
    } catch { toast.error('Failed to load shorts'); }
    finally { setLoading(false); }
  }

  async function handleClap(id: string) {
    setClapAnim(id);
    setTimeout(() => setClapAnim(null), 400);
    try {
      const res = await shortsAPI.clap(id);
      setShorts(s => s.map(x => x._id === id ? { ...x, claps: res.data.claps, clappers: res.data.clapped ? [...(x.clappers || []), user!._id] : (x.clappers || []).filter(c => c !== user!._id) } : x));
    } catch { toast.error('Failed'); }
  }

  async function handleSave(id: string) {
    try {
      await shortsAPI.save(id);
      toast.success('Short saved!');
    } catch { toast.error('Failed to save'); }
  }

  async function handleJoinSession(shortId: string) {
    try {
      await templateAPI.saveFromShort(shortId);
      toast.success('Workout template saved to your Templates!');
    } catch { toast.error('Failed to save template'); }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Loader size={28} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>VyaMate Shorts</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Real workouts from your neighborhood</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: 'var(--teal)', color: '#fff', border: 'none',
          borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={14} /> Post
        </button>
      </div>

      {/* Anti-influencer notice */}
      <div style={{ background: '#FFF8E7', border: '1px solid #F59E0B30', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
        <Camera size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#92601A', lineHeight: 1.5 }}>
          <strong>Authentic only:</strong> Film your workout directly in-app. No edited uploads to keep content real.
        </p>
      </div>

      {shorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <Camera size={48} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No shorts yet</p>
          <p style={{ fontSize: 13 }}>Be the first to post a workout in your neighborhood!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {shorts.map(s => (
            <div key={s._id} style={shortCard}>
              {/* Pinned hero badge */}
              {s.pinned && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, background: '#FFF3CD', borderRadius: 8, padding: '5px 10px' }}>
                  <Crown size={12} color="#92601A" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#92601A' }}>Local Hero — Featured for 24h</span>
                </div>
              )}

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={miniAvatar}>{s.author?.name?.charAt(0).toUpperCase() || '?'}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {s.author?.name || 'VyaMate User'}
                    {s.author?.localHero && <span style={{ fontSize: 10 }}>⭐</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {s.activity} · {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>{s.author?.gritPoints || 0}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>GRIT</div>
                </div>
              </div>

              {/* Media */}
              <div style={{ background: 'var(--teal-light)', borderRadius: 12, overflow: 'hidden', marginBottom: 10, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.mediaType === 'video' ? (
                  <video src={s.mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : s.mediaUrl.startsWith('/uploads') ? (
                  <img src={s.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--teal)' }}>
                    <Camera size={36} style={{ opacity: 0.4, marginBottom: 6 }} />
                    <p style={{ fontSize: 12, opacity: 0.6 }}>Workout media</p>
                  </div>
                )}
              </div>

              {s.caption && <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10, lineHeight: 1.5 }}>{s.caption}</p>}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleClap(s._id)} style={{
                  flex: 1, padding: '9px', background: s.clappers?.includes(user?._id || '') ? '#E0F5F5' : '#f5f5f5',
                  border: `1.5px solid ${s.clappers?.includes(user?._id || '') ? 'var(--teal)' : 'var(--border)'}`,
                  borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  animation: clapAnim === s._id ? 'clap 0.4s ease' : 'none',
                }}>
                  <span style={{ fontSize: 16 }}>👏</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.clappers?.includes(user?._id || '') ? 'var(--teal)' : 'var(--text)' }}>{s.claps}</span>
                </button>

                {s.workoutTemplate && (
                  <button onClick={() => handleJoinSession(s._id)} style={{
                    flex: 2, padding: '9px', background: 'var(--teal)', border: 'none',
                    borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    <Users size={13} /> Save Template
                  </button>
                )}

                <button onClick={() => handleSave(s._id)} style={{
                  padding: '9px 12px', background: '#f5f5f5', border: '1.5px solid var(--border)',
                  borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}>
                  <Bookmark size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Short Modal */}
      {showCreate && <CreateShortModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateShortModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [caption, setCaption] = useState('');
  const [activity, setActivity] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  async function submit() {
    if (!file) { toast.error('Please capture/select a media file'); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('caption', caption);
      form.append('activity', activity);
      await shortsAPI.create(form);
      toast.success('Short posted!');
      onCreated();
    } catch { toast.error('Failed to post'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Post a Short</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ background: '#FFF8E7', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
          <Camera size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#92601A' }}>Film directly or use a recent clip. No highly-edited content allowed.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Media (Video or Photo)</label>
            <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed var(--teal)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: file ? 'var(--teal-light)' : '#fff' }}>
              <Camera size={28} color="var(--teal)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
                {file ? file.name : 'Tap to capture or select'}
              </p>
            </div>
            <input ref={fileRef} type="file" accept="video/*,image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }} />
          </div>

          <div>
            <label style={lbl}>Activity</label>
            <select value={activity} onChange={e => setActivity(e.target.value)} style={inp}>
              <option value="">Select activity</option>
              {ACTIVITIES.map((a: string) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="What's the workout?" rows={2} style={{ ...inp, resize: 'vertical' }} />
          </div>

          <button onClick={submit} disabled={loading} style={{ width: '100%', padding: 13, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Posting...' : 'Post Short'}
          </button>
        </div>
      </div>
    </div>
  );
}

const shortCard: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '16px',
  boxShadow: '0 2px 12px rgba(0,156,157,0.06)', border: '1px solid var(--border)',
};
const miniAvatar: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--teal), #005f60)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
};
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' };
const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', background: '#fff', outline: 'none' };

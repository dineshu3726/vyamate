import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Shield, AlertTriangle, MapPin, ChevronLeft, Loader } from 'lucide-react';
import { chatAPI, matchAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Match, Message } from '../types';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { peerId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedSpots, setSuggestedSpots] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSafeWord, setShowSafeWord] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMatches(); }, []);
  useEffect(() => { if (peerId) loadMessages(peerId); }, [peerId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadMatches() {
    try {
      const res = await matchAPI.getMatches();
      setMatches(res.data);
      // Auto-open first match if no peerId
      if (!peerId && res.data.length > 0) {
        const first = res.data[0];
        const pid = first.from === user?._id ? first.to : first.from;
        navigate(`/chat/${pid}`, { replace: true });
      }
    } catch { }
  }

  async function loadMessages(pid: string) {
    setLoading(true);
    try {
      const res = await chatAPI.getMessages(pid);
      setMessages(res.data.messages);
      setSuggestedSpots(res.data.suggestedSpots || []);
    } catch (err: any) {
      if (err.response?.status === 403) toast.error('Chat unlocks after mutual match');
    } finally { setLoading(false); }
  }

  async function sendMsg() {
    if (!text.trim() || !peerId) return;
    try {
      const res = await chatAPI.send(peerId, text.trim());
      setMessages(m => [...m, res.data]);
      setText('');
    } catch { toast.error('Failed to send'); }
  }

  async function triggerSafeWord() {
    if (!peerId) return;
    try {
      await chatAPI.safeWord(peerId);
      toast.success('User blocked and reported. You are safe.');
      navigate('/');
    } catch { toast.error('Failed'); }
    setShowSafeWord(false);
  }

  const activePeer = matches.find(m => m.from === peerId || m.to === peerId)?.peer;

  if (!peerId) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Messages</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Chat unlocks after a mutual match</p>
        {matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Shield size={40} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600 }}>No matches yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Connect with neighbors on the Discover tab first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matches.map(m => {
              const pid = m.from === user?._id ? m.to : m.from;
              const peer = m.peer;
              return (
                <div key={m._id} onClick={() => navigate(`/chat/${pid}`)} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                  <div style={avatarSm}>{peer?.name?.charAt(0).toUpperCase() || '?'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{peer?.name || 'VyaMate User'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{peer?.fitnessLevel} · Tap to chat</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => navigate('/chat')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', display: 'flex' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={avatarSm}>{activePeer?.name?.charAt(0).toUpperCase() || '?'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{activePeer?.name || 'VyaMate User'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mutual match · Chat enabled</div>
        </div>
        <button onClick={() => setShowSafeWord(true)} style={{ background: '#FFF0F0', border: '1px solid #FCA5A5', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Shield size={13} color="var(--error)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)' }}>Safe Word</span>
        </button>
      </div>

      {/* Suggested Spots */}
      {suggestedSpots.length > 0 && (
        <div style={{ background: 'var(--teal-light)', padding: '10px 16px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #c0e9e9' }}>
          <MapPin size={13} color="var(--teal)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal-dark)', flexShrink: 0, marginRight: 4 }}>Meet at:</span>
          {suggestedSpots.slice(0, 3).map(s => (
            <span key={s} style={{ fontSize: 11, background: '#fff', color: 'var(--teal)', padding: '2px 10px', borderRadius: 10, whiteSpace: 'nowrap', border: '1px solid #c0e9e9', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setText(`Let's meet at: ${s}`)}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Loader size={24} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 13 }}>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.from === user?._id;
            return (
              <div key={m._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <div style={{
                  maxWidth: '72%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? 'var(--teal)' : '#fff',
                  color: isMe ? '#fff' : 'var(--text)',
                  fontSize: 14, lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  border: isMe ? 'none' : '1px solid var(--border)',
                }}>
                  {m.text}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMsg())}
          placeholder="Message..." style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, color: 'var(--text)', outline: 'none', background: '#fff' }} />
        <button onClick={sendMsg} disabled={!text.trim()} style={{ width: 40, height: 40, background: text.trim() ? 'var(--teal)' : '#e0e0e0', border: 'none', borderRadius: 12, cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={16} color="#fff" />
        </button>
      </div>

      {/* Safe Word Modal */}
      {showSafeWord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color="var(--error)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Activate Safe Word?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              This will instantly end the session, block this user, and report them to VyaMate Safety Team.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSafeWord(false)} style={{ flex: 1, padding: 12, background: '#f0f0f0', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
                Cancel
              </button>
              <button onClick={triggerSafeWord} style={{ flex: 1, padding: 12, background: 'var(--error)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                Block & Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const avatarSm: React.CSSProperties = {
  width: 38, height: 38, borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--teal), #005f60)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
};

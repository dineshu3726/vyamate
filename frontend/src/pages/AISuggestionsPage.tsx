import React, { useState } from 'react';
import { Sparkles, ChevronLeft, Loader, ChevronDown, ChevronUp, BookmarkPlus, RefreshCw } from 'lucide-react';
import { aiAPI, templateAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Exercise } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AISuggestion {
  name: string;
  activity: string;
  fitnessLevel: string;
  estimatedMinutes: number;
  description: string;
  reasoning: string;
  exercises: Exercise[];
}

export default function AISuggestionsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    setSuggestions([]);
    setExpanded(null);
    try {
      const res = await aiAPI.getSuggestions();
      setSuggestions(res.data.suggestions || []);
      setGenerated(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to generate suggestions';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplate(s: AISuggestion, idx: number) {
    setSaving(idx);
    try {
      await templateAPI.create({
        name: s.name,
        activity: s.activity,
        fitnessLevel: s.fitnessLevel,
        estimatedMinutes: s.estimatedMinutes,
        description: s.description,
        exercises: s.exercises,
        isPublic: false,
      });
      toast.success('Saved to your Templates!');
    } catch { toast.error('Failed to save template'); }
    finally { setSaving(null); }
  }

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', display: 'flex', padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>AI Workout Suggestions</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Personalized by Claude AI</p>
        </div>
      </div>

      {/* Intro card */}
      <div style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)', borderRadius: 18, padding: '20px', marginBottom: 20, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Sparkles size={22} color="#fff" />
          <span style={{ fontSize: 16, fontWeight: 800 }}>Powered by Claude</span>
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, marginBottom: 14 }}>
          Claude analyzes your fitness level, activities, schedule, and recent workout history to suggest personalized workouts built just for you.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[user?.fitnessLevel, ...(user?.activities?.slice(0, 2) || [])].filter(Boolean).map(tag => (
            <span key={tag} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        style={{
          width: '100%', padding: '14px', marginBottom: 20,
          background: loading ? '#e0e0e0' : 'linear-gradient(135deg, #667EEA, #764BA2)',
          color: loading ? 'var(--text-muted)' : '#fff',
          border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: loading ? 'none' : '0 4px 16px rgba(102,126,234,0.4)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? (
          <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Claude is thinking...</>
        ) : generated ? (
          <><RefreshCw size={16} /> Regenerate Suggestions</>
        ) : (
          <><Sparkles size={16} /> Generate My Workouts</>
        )}
      </button>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={i}
              suggestion={s}
              index={i}
              expanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
              onSave={() => saveTemplate(s, i)}
              saving={saving === i}
            />
          ))}
        </div>
      )}

      {/* Empty state before first generate */}
      {!loading && !generated && (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🤖</div>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Ready to train smarter?</p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>Tap "Generate My Workouts" and Claude will create 3 personalized workout plans based on your profile and recent activity.</p>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion: s, index, expanded, onToggle, onSave, saving,
}: {
  suggestion: AISuggestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const GRADIENTS = [
    'linear-gradient(135deg, #009C9D, #005f60)',
    'linear-gradient(135deg, #F59E0B, #D97706)',
    'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  ];
  const EMOJIS = ['💪', '🏃', '🧘'];

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Card header */}
      <div style={{ background: GRADIENTS[index % 3], padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>{EMOJIS[index % 3]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{s.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={tagStyle}>{s.activity}</span>
              <span style={tagStyle}>{s.estimatedMinutes} min</span>
              <span style={tagStyle}>{s.fitnessLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{s.description}</p>

        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 12 }}>💡</span>
          <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>{s.reasoning}</p>
        </div>

        {/* Exercises toggle */}
        <button onClick={onToggle} style={{ width: '100%', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--teal)', fontSize: 13, fontWeight: 600 }}>
          <span>{s.exercises?.length || 0} exercises</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && s.exercises?.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
            {s.exercises.map((ex, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: j < s.exercises.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--teal)', flexShrink: 0 }}>
                  {j + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ex.name}</div>
                  {ex.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ex.notes}</div>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {ex.sets && ex.reps && `${ex.sets}×${ex.reps}`}
                  {ex.sets && ex.durationSeconds && `${ex.sets}×${ex.durationSeconds}s`}
                  {!ex.sets && ex.durationSeconds && `${ex.durationSeconds}s`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        <button onClick={onSave} disabled={saving} style={{ width: '100%', padding: '10px', background: 'var(--teal-light)', border: '1.5px solid var(--teal)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--teal)', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <BookmarkPlus size={14} />}
          {saving ? 'Saving...' : 'Save as Template'}
        </button>
      </div>
    </div>
  );
}

const tagStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600, color: '#fff',
};

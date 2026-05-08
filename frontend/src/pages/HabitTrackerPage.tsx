import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Flame, Trophy, X, Trash2, ChevronDown, ChevronUp, Loader, CheckCircle2, Circle } from 'lucide-react';
import { habitAPI } from '../services/api';
import { Habit } from '../types';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────────

const PRESET_EMOJIS = ['🏃', '🏋️', '🧘', '🚴', '💧', '🥗', '😴', '📚', '💪', '🥊', '🏊', '🎯', '🔥', '⚡', '🌅', '🧠', '🫀', '🥇', '🎽', '🤸'];

const PRESET_COLORS = [
  '#009C9D', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F97316', '#EF4444', '#F59E0B',
  '#14B8A6', '#6366F1',
];

const CATEGORIES = ['Fitness', 'Cardio', 'Strength', 'Recovery', 'Nutrition', 'Mindfulness', 'Sleep', 'Learning', 'General'];

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { value: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { value: 'weekends', label: 'Weekends', days: [0, 6] },
  { value: 'custom', label: 'Custom', days: [] },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildHeatmapGrid(): string[] {
  // 84 days ago → today, oldest first
  const days: string[] = [];
  for (let i = 83; i >= 0; i--) {
    days.push(toDateStr(new Date(Date.now() - i * 86400000)));
  }
  return days;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function HabitTrackerPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayProgress, setTodayProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date();
  const todayStr = toDateStr(today);
  const dayOfWeek = today.getDay();

  const load = useCallback(async () => {
    try {
      const res = await habitAPI.getAll();
      setHabits(res.data.habits);
      setTodayProgress(res.data.todayProgress);
    } catch { toast.error('Failed to load habits'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Only show habits scheduled for today
  const todayHabits = habits.filter(h => h.targetDays.includes(dayOfWeek));
  const otherHabits = habits.filter(h => !h.targetDays.includes(dayOfWeek));

  async function toggleHabit(habit: Habit) {
    const wasChecked = habit.completedToday;
    // Optimistic update
    setHabits(prev => prev.map(h => h._id === habit._id ? {
      ...h,
      completedToday: !wasChecked,
      currentStreak: !wasChecked ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1),
      totalCompletions: !wasChecked ? h.totalCompletions + 1 : h.totalCompletions - 1,
      recentDates: !wasChecked
        ? [todayStr, ...h.recentDates.filter(d => d !== todayStr)]
        : h.recentDates.filter(d => d !== todayStr),
    } : h));
    setTodayProgress(prev => ({ ...prev, done: wasChecked ? prev.done - 1 : prev.done + 1 }));

    try {
      if (wasChecked) {
        await habitAPI.unlog(habit._id, todayStr);
      } else {
        await habitAPI.log(habit._id, todayStr);
      }
    } catch {
      // Revert on failure
      setHabits(prev => prev.map(h => h._id === habit._id ? { ...h, completedToday: wasChecked } : h));
      setTodayProgress(prev => ({ ...prev, done: wasChecked ? prev.done + 1 : prev.done - 1 }));
      toast.error('Failed to update habit');
    }
  }

  async function deleteHabit(id: string) {
    try {
      await habitAPI.delete(id);
      setHabits(prev => prev.filter(h => h._id !== id));
      setTodayProgress(prev => {
        const h = habits.find(x => x._id === id);
        return { done: h?.completedToday ? prev.done - 1 : prev.done, total: prev.total - 1 };
      });
      toast.success('Habit deleted');
    } catch { toast.error('Failed to delete'); }
  }

  function handleCreated(habit: Habit) {
    setHabits(prev => [...prev, habit]);
    setTodayProgress(prev => ({ ...prev, total: prev.total + 1 }));
    setShowCreate(false);
    toast.success('Habit created!');
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Loader size={28} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const progressPct = todayProgress.total > 0 ? Math.round((todayProgress.done / todayProgress.total) * 100) : 0;

  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Habit Tracker</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 14, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> New
        </button>
      </div>

      {/* Progress Ring */}
      {todayProgress.total > 0 && (
        <div style={{ background: 'linear-gradient(135deg, var(--teal), #005f60)', borderRadius: 20, padding: '20px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 20 }}>
          <ProgressRing pct={progressPct} done={todayProgress.done} total={todayProgress.total} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {progressPct === 100 ? 'All done! 🎉' : `${todayProgress.done} of ${todayProgress.total}`}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>
              {progressPct === 100 ? 'You crushed today!' : "habits completed today"}
            </div>
            {progressPct === 100 && (
              <div style={{ fontSize: 11, color: '#B2EFEF', marginTop: 6, fontWeight: 600 }}>+5 Grit Points earned 💪</div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {habits.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎯</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>No habits yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Build consistency with daily fitness habits. Start small and stay consistent.</p>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Add your first habit
          </button>
        </div>
      )}

      {/* Today's habits */}
      {todayHabits.length > 0 && (
        <Section label="Today">
          {todayHabits.map(h => (
            <HabitCard
              key={h._id}
              habit={h}
              isExpanded={expandedId === h._id}
              onToggle={() => toggleHabit(h)}
              onDelete={() => deleteHabit(h._id)}
              onExpand={() => setExpandedId(expandedId === h._id ? null : h._id)}
            />
          ))}
        </Section>
      )}

      {/* Other habits (not scheduled today) */}
      {otherHabits.length > 0 && (
        <Section label="Not scheduled today" muted>
          {otherHabits.map(h => (
            <HabitCard
              key={h._id}
              habit={h}
              isExpanded={expandedId === h._id}
              onToggle={() => toggleHabit(h)}
              onDelete={() => deleteHabit(h._id)}
              onExpand={() => setExpandedId(expandedId === h._id ? null : h._id)}
              dimmed
            />
          ))}
        </Section>
      )}

      {showCreate && (
        <CreateHabitModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}

// ── Progress Ring ──────────────────────────────────────────────────────────────

function ProgressRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={6} />
        <circle
          cx={36} cy={36} r={r} fill="none"
          stroke="#fff" strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ label, children, muted }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted ? 'var(--text-muted)' : 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

// ── Habit Card ─────────────────────────────────────────────────────────────────

function HabitCard({ habit, isExpanded, onToggle, onDelete, onExpand, dimmed }: {
  habit: Habit;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onExpand: () => void;
  dimmed?: boolean;
}) {
  const heatmapDays = buildHeatmapGrid();
  const logSet = new Set(habit.recentDates);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: `1.5px solid ${habit.completedToday ? habit.color + '66' : 'var(--border)'}`,
      overflow: 'hidden',
      opacity: dimmed ? 0.65 : 1,
      boxShadow: habit.completedToday ? `0 2px 12px ${habit.color}22` : undefined,
      transition: 'all 0.2s',
    }}>

      {/* Main row */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Check button */}
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: habit.completedToday ? habit.color : '#CBD5E1', transition: 'color 0.2s' }}
        >
          {habit.completedToday
            ? <CheckCircle2 size={30} fill={habit.color} color={habit.color} />
            : <Circle size={30} color="#CBD5E1" />
          }
        </button>

        {/* Emoji */}
        <div style={{ width: 40, height: 40, borderRadius: 12, background: hexToRgba(habit.color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {habit.emoji}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {habit.name}
            {habit.currentStreak >= 3 && (
              <span style={{ fontSize: 12, background: '#FFF3E0', color: '#E65100', borderRadius: 8, padding: '1px 7px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Flame size={10} /> {habit.currentStreak}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: habit.color, display: 'inline-block', flexShrink: 0 }} />
            {habit.category} · {habit.completionRate}% this month
          </div>
        </div>

        {/* Expand + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 4 }}>
            <Trash2 size={14} />
          </button>
          <button onClick={onExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <MiniStat icon="🔥" value={habit.currentStreak} label="Streak" color={habit.color} />
            <MiniStat icon="🏆" value={habit.longestStreak} label="Best" color={habit.color} />
            <MiniStat icon="✅" value={habit.totalCompletions} label="Total" color={habit.color} />
          </div>

          {/* Heatmap label */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
            12-Week Activity
          </div>

          {/* Heatmap grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
            {/* Group by weeks (7 days each) */}
            {Array.from({ length: 12 }).map((_, weekIdx) => (
              <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cellIdx = weekIdx * 7 + dayIdx;
                  const dateStr = heatmapDays[cellIdx];
                  const done = logSet.has(dateStr);
                  const isToday = dateStr === toDateStr(new Date());
                  return (
                    <div
                      key={dayIdx}
                      title={dateStr}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: 3,
                        background: done ? habit.color : hexToRgba(habit.color, 0.1),
                        outline: isToday ? `2px solid ${habit.color}` : undefined,
                        outlineOffset: isToday ? 1 : undefined,
                        transition: 'background 0.2s',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Heatmap legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Less</span>
            {[0.1, 0.35, 0.6, 0.85, 1].map(a => (
              <div key={a} style={{ width: 10, height: 10, borderRadius: 2, background: hexToRgba(habit.color, a) }} />
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>More</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div style={{ background: hexToRgba(color, 0.08), borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>{label.toUpperCase()}</div>
    </div>
  );
}

// ── Create Habit Modal ─────────────────────────────────────────────────────────

function CreateHabitModal({ onClose, onCreated }: { onClose: () => void; onCreated: (h: Habit) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [color, setColor] = useState('#009C9D');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily');
  const [targetDays, setTargetDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [category, setCategory] = useState('Fitness');
  const [loading, setLoading] = useState(false);

  function handleFreqChange(val: string) {
    const found = FREQ_OPTIONS.find(f => f.value === val);
    setFrequency(val as any);
    if (found && found.value !== 'custom') setTargetDays(found.days);
  }

  function toggleDay(d: number) {
    setTargetDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function submit() {
    if (!name.trim()) { toast.error('Please enter a habit name'); return; }
    if (targetDays.length === 0) { toast.error('Select at least one day'); return; }
    setLoading(true);
    try {
      const res = await habitAPI.create({ name: name.trim(), emoji, color, frequency, targetDays, category });
      onCreated(res.data);
    } catch { toast.error('Failed to create habit'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', padding: 24, maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>New Habit</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Preview card */}
        <div style={{ background: hexToRgba(color, 0.1), borderRadius: 16, border: `2px solid ${color}44`, padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: hexToRgba(color, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {emoji}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{name || 'Habit name'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{category} · {FREQ_OPTIONS.find(f => f.value === frequency)?.label}</div>
          </div>
          <div style={{ marginLeft: 'auto', width: 12, height: 12, borderRadius: '50%', background: color }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Name */}
          <div>
            <label style={lbl}>Habit Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning Run, Drink Water…"
              style={inp} maxLength={40}
              autoFocus
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label style={lbl}>Icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 40, height: 40, borderRadius: 10, fontSize: 20,
                    border: `2px solid ${emoji === e ? color : 'var(--border)'}`,
                    background: emoji === e ? hexToRgba(color, 0.1) : '#fff',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label style={lbl}>Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c, border: `3px solid ${color === c ? '#1A2E2E' : 'transparent'}`,
                    cursor: 'pointer', padding: 0,
                    boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined,
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={lbl}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${category === cat ? color : 'var(--border)'}`,
                    background: category === cat ? hexToRgba(color, 0.1) : '#fff',
                    color: category === cat ? color : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >{cat}</button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label style={lbl}>Frequency</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {FREQ_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => handleFreqChange(f.value)}
                  style={{
                    padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${frequency === f.value ? color : 'var(--border)'}`,
                    background: frequency === f.value ? hexToRgba(color, 0.1) : '#fff',
                    color: frequency === f.value ? color : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >{f.label}</button>
              ))}
            </div>

            {/* Day selector for custom */}
            <div style={{ display: 'flex', gap: 6 }}>
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setFrequency('custom'); toggleDay(i); }}
                  style={{
                    flex: 1, height: 36, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${targetDays.includes(i) ? color : 'var(--border)'}`,
                    background: targetDays.includes(i) ? color : '#fff',
                    color: targetDays.includes(i) ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >{d}</button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: '100%', padding: 14,
              background: loading ? '#ccc' : color,
              color: '#fff', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
            {loading ? 'Creating…' : 'Create Habit'}
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' };
const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, color: 'var(--text)', background: '#fff', outline: 'none', boxSizing: 'border-box' };

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Bookmark, Globe, User, Clock, X, Dumbbell, Loader } from 'lucide-react';
import { templateAPI } from '../services/api';
import { WorkoutTemplate, Exercise, ACTIVITIES, FITNESS_LEVELS } from '../types';
import toast from 'react-hot-toast';

type TabType = 'mine' | 'public';

export default function WorkoutTemplatesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('mine');
  const [created, setCreated] = useState<WorkoutTemplate[]>([]);
  const [saved, setSaved] = useState<WorkoutTemplate[]>([]);
  const [publicList, setPublicList] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    try {
      if (tab === 'mine') {
        const res = await templateAPI.getMine();
        setCreated(res.data.created);
        setSaved(res.data.saved);
      } else {
        const res = await templateAPI.getPublic();
        setPublicList(res.data);
      }
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  }

  async function handleSave(id: string) {
    try {
      const res = await templateAPI.save(id);
      setPublicList(p => p.map(t => t._id === id ? { ...t, hasSaved: res.data.saved } : t));
      toast.success(res.data.saved ? 'Template saved!' : 'Removed from saved');
    } catch { toast.error('Failed'); }
  }

  async function handleDelete(id: string) {
    try {
      await templateAPI.delete(id);
      setCreated(p => p.filter(t => t._id !== id));
      toast.success('Template deleted');
    } catch { toast.error('Failed to delete'); }
  }

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={22} />
        </button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Workout Templates</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Build and save structured workouts</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} /> New
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--teal-light)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button onClick={() => setTab('mine')} style={tabBtn(tab === 'mine')}>
          <User size={13} /> My Templates
        </button>
        <button onClick={() => setTab('public')} style={tabBtn(tab === 'public')}>
          <Globe size={13} /> Community
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader size={28} color="var(--teal)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : tab === 'mine' ? (
        <>
          {created.length === 0 && saved.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <Dumbbell size={48} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No templates yet</p>
              <p style={{ fontSize: 13 }}>Create your first workout template or save one from a Short.</p>
            </div>
          ) : (
            <>
              {created.length > 0 && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Created by you</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {created.map(t => (
                      <TemplateCard key={t._id} template={t} expanded={expanded === t._id}
                        onToggle={() => setExpanded(expanded === t._id ? null : t._id)}
                        onDelete={() => handleDelete(t._id)} />
                    ))}
                  </div>
                </>
              )}
              {saved.length > 0 && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Saved from Shorts</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {saved.map(t => (
                      <TemplateCard key={t._id} template={t} expanded={expanded === t._id}
                        onToggle={() => setExpanded(expanded === t._id ? null : t._id)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {publicList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <Globe size={48} color="var(--teal-light)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No community templates yet</p>
              <p style={{ fontSize: 13 }}>Be the first to share a workout template!</p>
            </div>
          ) : publicList.map(t => (
            <TemplateCard key={t._id} template={t} expanded={expanded === t._id}
              onToggle={() => setExpanded(expanded === t._id ? null : t._id)}
              onSave={t.isOwn ? undefined : () => handleSave(t._id)} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={(t) => { setCreated(p => [t, ...p]); setShowCreate(false); setTab('mine'); }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template: t, expanded, onToggle, onDelete, onSave }: {
  template: WorkoutTemplate;
  expanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onSave?: () => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Dumbbell size={18} color="var(--teal)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {t.activity} · {t.fitnessLevel} · {t.exercises.length} exercises
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> ~{t.estimatedMinutes} min
              </span>
              {!t.isOwn && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {t.creatorName}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {onSave && (
              <button onClick={(e) => { e.stopPropagation(); onSave(); }} style={{ background: t.hasSaved ? 'var(--teal)' : 'var(--teal-light)', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: t.hasSaved ? '#fff' : 'var(--teal)', display: 'flex', alignItems: 'center' }}>
                <Bookmark size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: 'var(--error)', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        {t.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>{t.description}</p>}
      </div>

      {expanded && t.exercises.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: '#FAFAFA' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Exercises</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {t.exercises.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {ex.sets && ex.reps ? `${ex.sets} sets × ${ex.reps} reps` : ''}
                    {ex.durationSeconds ? `${ex.durationSeconds}s` : ''}
                    {ex.notes ? ` · ${ex.notes}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: WorkoutTemplate) => void }) {
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', sets: 3, reps: 10 }]);
  const [loading, setLoading] = useState(false);

  function updateExercise(i: number, field: keyof Exercise, value: any) {
    setExercises(exs => exs.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function addExercise() {
    setExercises(exs => [...exs, { name: '', sets: 3, reps: 10 }]);
  }

  function removeExercise(i: number) {
    setExercises(exs => exs.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!name.trim()) { toast.error('Template name required'); return; }
    const validEx = exercises.filter(e => e.name.trim());
    if (validEx.length === 0) { toast.error('Add at least one exercise'); return; }
    setLoading(true);
    try {
      const res = await templateAPI.create({ name, activity, fitnessLevel, estimatedMinutes, description, exercises: validEx });
      toast.success('Template created!');
      onCreated(res.data);
    } catch { toast.error('Failed to create'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>New Workout Template</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Template Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 5x5 Strength Day" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Activity</label>
              <select value={activity} onChange={e => setActivity(e.target.value)} style={inp}>
                <option value="">Any</option>
                {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Level</label>
              <select value={fitnessLevel} onChange={e => setFitnessLevel(e.target.value)} style={inp}>
                {FITNESS_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Estimated Duration (minutes)</label>
            <input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(+e.target.value)} min={5} max={180} style={inp} />
          </div>
          <div>
            <label style={lbl}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What's this workout about?" style={{ ...inp, resize: 'vertical' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Exercises</label>
              <button onClick={addExercise} style={{ background: 'var(--teal-light)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: 'var(--teal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{ background: 'var(--teal-light)', borderRadius: 12, padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>{i + 1}</div>
                    <input value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} placeholder="Exercise name" style={{ ...inp, flex: 1, marginBottom: 0 }} />
                    {exercises.length > 1 && (
                      <button onClick={() => removeExercise(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" value={ex.sets || ''} onChange={e => updateExercise(i, 'sets', +e.target.value)} placeholder="Sets" min={1} style={{ ...inp, flex: 1 }} />
                    <input type="number" value={ex.reps || ''} onChange={e => updateExercise(i, 'reps', +e.target.value)} placeholder="Reps" min={1} style={{ ...inp, flex: 1 }} />
                    <input type="number" value={ex.durationSeconds || ''} onChange={e => updateExercise(i, 'durationSeconds', +e.target.value)} placeholder="Secs" min={0} style={{ ...inp, flex: 1 }} />
                  </div>
                  <input value={ex.notes || ''} onChange={e => updateExercise(i, 'notes', e.target.value)} placeholder="Notes (optional)" style={{ ...inp, marginTop: 6 }} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={loading} style={{ width: '100%', padding: 13, background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
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
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' };
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', background: '#fff', outline: 'none', boxSizing: 'border-box' };

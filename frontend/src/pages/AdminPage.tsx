import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Flag, Play, BarChart2, Search, Trash2, ShieldOff, Shield,
  ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, CheckCircle,
  XCircle, AlertTriangle, TrendingUp, Activity, MessageSquare,
  Dumbbell, Map, Star, Crown, LogOut,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'users' | 'reports' | 'shorts';

// ─── Admin API helpers ────────────────────────────────────────────────────────
const adminAPI = {
  stats: () => api.get('/admin/stats'),
  users: (search = '', page = 1) => api.get(`/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=20`),
  banUser: (id: string) => api.put(`/admin/users/${id}/ban`),
  toggleAdmin: (id: string) => api.put(`/admin/users/${id}/admin`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  resetPassword: (id: string) => api.post(`/admin/users/${id}/reset-password`),
  adjustGrit: (id: string, gritPoints: number) => api.put(`/admin/users/${id}/grit`, { gritPoints }),
  reports: (resolved = false) => api.get(`/admin/reports?resolved=${resolved}`),
  resolveReport: (id: string, action: string) => api.put(`/admin/reports/${id}/resolve`, { action }),
  shorts: (page = 1) => api.get(`/admin/shorts?page=${page}&limit=20`),
  deleteShort: (id: string) => api.delete(`/admin/shorts/${id}`),
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,156,157,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1A2E2E', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#7A9A9A', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#009C9D', marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.stats().then(r => setStats(r.data)).catch(() => toast.error('Failed to load stats')).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return <Empty text="Could not load stats" />;

  return (
    <div>
      <h2 style={sectionTitle}>Platform Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard label="Total Users" value={stats.users} icon={<Users size={20} />} color="#009C9D" sub={`${stats.banned} banned · ${stats.admins} admins`} />
        <StatCard label="Matches" value={stats.matches} icon={<Activity size={20} />} color="#7C3AED" sub={`${stats.acceptedMatches} accepted · ${stats.pendingMatches} pending`} />
        <StatCard label="Sessions Logged" value={stats.sessions} icon={<Dumbbell size={20} />} color="#10B981" />
        <StatCard label="Safety Reports" value={stats.reports} icon={<Flag size={20} />} color="#EF4444" sub={`${stats.openReports} open`} />
        <StatCard label="Shorts" value={stats.shorts} icon={<Play size={20} />} color="#F59E0B" />
        <StatCard label="Beacons" value={stats.beacons} icon={<Map size={20} />} color="#3B82F6" />
        <StatCard label="Templates" value={stats.templates} icon={<BarChart2 size={20} />} color="#EC4899" />
        <StatCard label="Habits" value={stats.habits} icon={<TrendingUp size={20} />} color="#8B5CF6" />
      </div>

      {stats.openReports > 0 && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#DC2626' }}>
          <AlertTriangle size={18} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{stats.openReports} open safety report{stats.openReports !== 1 ? 's' : ''} need attention</span>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<any>(null);
  const [gritEdit, setGritEdit] = useState<{ id: string; val: number } | null>(null);
  const { user: me } = useAuthStore();

  const load = useCallback((s: string, p: number) => {
    setLoading(true);
    adminAPI.users(s, p)
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(search, page); }, [search, page, load]);

  function doSearch() { setPage(1); setSearch(searchInput); }

  async function handleBan(u: any) {
    try {
      const r = await adminAPI.banUser(u._id);
      toast.success(r.data.message);
      load(search, page);
    } catch { toast.error('Action failed'); }
  }

  async function handleToggleAdmin(u: any) {
    if (!confirm(`${u.isAdmin ? 'Remove admin from' : 'Make'} ${u.name} admin?`)) return;
    try {
      const r = await adminAPI.toggleAdmin(u._id);
      toast.success(r.data.message);
      load(search, page);
    } catch { toast.error('Action failed'); }
  }

  async function handleDelete(u: any) {
    if (!confirm(`Delete ${u.name} and ALL their data? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(u._id);
      toast.success('User deleted');
      load(search, page);
    } catch { toast.error('Delete failed'); }
    setActionUser(null);
  }

  async function handleResetPassword(u: any) {
    if (!confirm(`Reset password for ${u.name}? They'll receive a temporary password by email.`)) return;
    try {
      const r = await adminAPI.resetPassword(u._id);
      if (r.data.tempPassword) {
        toast.success(`Temp password: ${r.data.tempPassword}`, { duration: 10000 });
      } else {
        toast.success(r.data.message);
      }
    } catch { toast.error('Reset failed'); }
  }

  async function handleGritSave() {
    if (!gritEdit) return;
    try {
      await adminAPI.adjustGrit(gritEdit.id, gritEdit.val);
      toast.success('Grit points updated');
      load(search, page);
    } catch { toast.error('Failed'); }
    setGritEdit(null);
  }

  return (
    <div>
      <h2 style={sectionTitle}>User Management <span style={{ color: '#7A9A9A', fontWeight: 400, fontSize: 14 }}>({total} total)</span></h2>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A9A9A' }} />
          <input
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            style={{ ...inputStyle, paddingLeft: 38, width: '100%' }}
          />
        </div>
        <button onClick={doSearch} style={primaryBtn}>Search</button>
        {search && <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} style={ghostBtn}>Clear</button>}
      </div>

      {loading ? <Spinner /> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2EDED' }}>
                  {['User', 'Email', 'Activities', 'Grit', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#4A6B6B', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #F0F7F7', background: u.banned ? '#FFF5F5' : 'transparent' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.name} avatar={u.avatar} size={32} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#1A2E2E' }}>{u.name}{u.isAdmin && <span style={{ marginLeft: 4, fontSize: 10, background: '#009C9D', color: '#fff', borderRadius: 6, padding: '1px 6px' }}>ADMIN</span>}</div>
                          <div style={{ fontSize: 11, color: '#7A9A9A' }}>{u.fitnessLevel} · {u.age}y</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4A6B6B' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(u.activities || []).slice(0, 3).map((a: string) => (
                          <span key={a} style={{ fontSize: 10, background: '#E0F5F5', color: '#007A7B', borderRadius: 6, padding: '2px 6px' }}>{a}</span>
                        ))}
                        {u.activities?.length > 3 && <span style={{ fontSize: 10, color: '#7A9A9A' }}>+{u.activities.length - 3}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {gritEdit?.id === u._id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input type="number" value={gritEdit!.val}
                            onChange={e => setGritEdit(g => g ? { id: g.id, val: parseInt(e.target.value) || 0 } : null)}
                            style={{ width: 70, padding: '4px 8px', border: '1.5px solid #009C9D', borderRadius: 8, fontSize: 13 }} />
                          <button onClick={handleGritSave} style={{ ...primaryBtn, padding: '4px 8px', fontSize: 12 }}>✓</button>
                          <button onClick={() => setGritEdit(null)} style={{ ...ghostBtn, padding: '4px 8px', fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setGritEdit({ id: u._id, val: u.gritPoints })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#F59E0B', fontSize: 13 }}>
                          ⚡ {u.gritPoints}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {u.banned ? (
                        <span style={{ fontSize: 11, background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>BANNED</span>
                      ) : (
                        <span style={{ fontSize: 11, background: '#D1FAE5', color: '#059669', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>ACTIVE</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {u._id !== me?._id && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <ActionBtn title={u.banned ? 'Unban' : 'Ban'} onClick={() => handleBan(u)} color={u.banned ? '#10B981' : '#EF4444'}>
                            {u.banned ? <CheckCircle size={14} /> : <ShieldOff size={14} />}
                          </ActionBtn>
                          <ActionBtn title={u.isAdmin ? 'Remove Admin' : 'Make Admin'} onClick={() => handleToggleAdmin(u)} color="#009C9D">
                            {u.isAdmin ? <Shield size={14} /> : <ShieldCheck size={14} />}
                          </ActionBtn>
                          <ActionBtn title="Reset Password" onClick={() => handleResetPassword(u)} color="#F59E0B">
                            <RefreshCw size={14} />
                          </ActionBtn>
                          <ActionBtn title="Delete User" onClick={() => handleDelete(u)} color="#EF4444">
                            <Trash2 size={14} />
                          </ActionBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={paginBtn}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 13, color: '#4A6B6B' }}>Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)} style={paginBtn}><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback((resolved: boolean) => {
    setLoading(true);
    adminAPI.reports(resolved)
      .then(r => setReports(r.data.reports))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(showResolved); }, [showResolved, load]);

  async function handle(id: string, action: string) {
    try {
      await adminAPI.resolveReport(id, action);
      toast.success(action === 'ban_reported' ? 'Report resolved & user banned' : 'Report dismissed');
      load(showResolved);
    } catch { toast.error('Action failed'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Safety Reports</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4A6B6B', cursor: 'pointer' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {loading ? <Spinner /> : reports.length === 0 ? (
        <Empty text={showResolved ? 'No resolved reports' : 'No open reports — all clear!'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => (
            <div key={r._id} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,156,157,0.06)', border: r.resolved ? '1.5px solid #D1FAE5' : '1.5px solid #FECACA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2E2E', marginBottom: 4 }}>
                    <span style={{ color: '#EF4444' }}>{r.reporter?.name || 'Unknown'}</span>
                    <span style={{ color: '#7A9A9A', fontWeight: 400 }}> reported </span>
                    <span style={{ color: '#1A2E2E' }}>{r.reported?.name || 'Unknown'}</span>
                    {r.reported?.banned && <span style={{ marginLeft: 6, fontSize: 10, background: '#FEE2E2', color: '#DC2626', borderRadius: 6, padding: '2px 6px' }}>BANNED</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#4A6B6B', marginBottom: 6 }}>
                    <strong>Reason:</strong> {r.reason}
                  </div>
                  <div style={{ fontSize: 11, color: '#7A9A9A' }}>
                    {new Date(r.createdAt).toLocaleString()}
                    {r.resolved && <span style={{ marginLeft: 8, color: '#10B981' }}>✓ Resolved — {r.resolvedAction}</span>}
                  </div>
                </div>
                {!r.resolved && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handle(r._id, 'ban_reported')}
                      style={{ ...dangerBtn, fontSize: 12, padding: '7px 12px' }}>
                      Ban Reported
                    </button>
                    <button onClick={() => handle(r._id, 'dismissed')}
                      style={{ ...ghostBtn, fontSize: 12, padding: '7px 12px' }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shorts Tab ───────────────────────────────────────────────────────────────
function ShortsTab() {
  const [shorts, setShorts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    adminAPI.shorts(p)
      .then(r => { setShorts(r.data.shorts); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => toast.error('Failed to load shorts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  async function handleDelete(s: any) {
    if (!confirm(`Delete this short by ${s.author?.name}?`)) return;
    try {
      await adminAPI.deleteShort(s._id);
      toast.success('Short deleted');
      load(page);
    } catch { toast.error('Delete failed'); }
  }

  const BASE = (import.meta as any).env?.VITE_API_URL || '';

  return (
    <div>
      <h2 style={sectionTitle}>Shorts Moderation <span style={{ color: '#7A9A9A', fontWeight: 400, fontSize: 14 }}>({total} total)</span></h2>

      {loading ? <Spinner /> : shorts.length === 0 ? <Empty text="No shorts yet" /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {shorts.map(s => (
              <div key={s._id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,156,157,0.06)' }}>
                <div style={{ position: 'relative', paddingTop: '56.25%', background: '#F0F7F7' }}>
                  {s.mediaType === 'video' ? (
                    <video src={`${BASE}${s.mediaUrl}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={`${BASE}${s.mediaUrl}`} alt={s.caption} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A2E2E', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.caption || '(no caption)'}
                  </div>
                  <div style={{ fontSize: 11, color: '#7A9A9A', marginBottom: 8 }}>
                    by {s.author?.name || 'Unknown'} · {s.claps} claps · {s.activity}
                  </div>
                  <button onClick={() => handleDelete(s)} style={{ ...dangerBtn, fontSize: 12, padding: '6px 12px', width: '100%', justifyContent: 'center' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={paginBtn}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 13, color: '#4A6B6B' }}>Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)} style={paginBtn}><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user?.isAdmin) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Shield size={48} color="#EF4444" />
        <h2 style={{ color: '#1A2E2E' }}>Admin Access Required</h2>
        <button onClick={() => navigate('/')} style={primaryBtn}>Go Home</button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 size={16} /> },
    { key: 'users', label: 'Users', icon: <Users size={16} /> },
    { key: 'reports', label: 'Reports', icon: <Flag size={16} /> },
    { key: 'shorts', label: 'Shorts', icon: <Play size={16} /> },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#F7FAFA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1.5px solid #E2EDED', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Crown size={22} color="#009C9D" />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#1A2E2E' }}>VyaMate Admin</span>
          <span style={{ fontSize: 11, background: '#009C9D', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>PANEL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#4A6B6B' }}>{user.name}</span>
          <button onClick={() => navigate('/')} style={{ ...ghostBtn, fontSize: 13, padding: '6px 14px' }}>
            <MessageSquare size={14} /> App
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ ...ghostBtn, fontSize: 13, padding: '6px 14px', color: '#EF4444', borderColor: '#FECACA' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 40px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#fff', borderRadius: 14, padding: 6, boxShadow: '0 2px 8px rgba(0,156,157,0.06)', width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: tab === t.key ? '#009C9D' : 'transparent',
              color: tab === t.key ? '#fff' : '#4A6B6B',
              transition: 'all 0.15s',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'shorts' && <ShortsTab />}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E2EDED', borderTopColor: '#009C9D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: '#7A9A9A', fontSize: 15 }}>{text}</div>
  );
}

function Avatar({ name, avatar, size = 36 }: { name: string; avatar?: string | null; size?: number }) {
  const BASE = (import.meta as any).env?.VITE_API_URL || '';
  if (avatar) {
    return <img src={`${BASE}${avatar}`} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#009C9D22', color: '#009C9D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function ActionBtn({ title, onClick, color, children }: { title: string; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 30, height: 30, border: `1.5px solid ${color}22`, borderRadius: 8, background: `${color}10`, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: '#1A2E2E', marginBottom: 16 };
const inputStyle: React.CSSProperties = { padding: '10px 14px', border: '1.5px solid #E2EDED', borderRadius: 10, fontSize: 14, color: '#1A2E2E', background: '#fff', outline: 'none' };
const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#009C9D', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'transparent', color: '#4A6B6B', border: '1.5px solid #E2EDED', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const dangerBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#FEF2F2', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const paginBtn: React.CSSProperties = { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #E2EDED', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#4A6B6B' };

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: `${BASE}/api` });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('vm_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 || err.response?.status === 403) {
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      localStorage.clear(); window.location.href = '/login';
    }
  }
  return Promise.reject(err);
});

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  updateProfile: (d: any) => api.put('/auth/profile', d),
};

export const matchAPI = {
  neighbors: (radius = 5) => api.get(`/match/neighbors?radius=${radius}`),
  peers: (activity?: string, fitnessLevel?: string) => api.get('/match/peers', { params: { activity, fitnessLevel } }),
  sendRequest: (targetId: string) => api.post('/match/request', { targetId }),
  respond: (matchId: string, action: 'accept' | 'decline') => api.post('/match/respond', { matchId, action }),
  getMatches: () => api.get('/match/list'),
  getPending: () => api.get('/match/pending'),
  endorse: (userId: string, endorsements: string[]) => api.post('/match/endorse', { userId, endorsements }),
};

export const shortsAPI = {
  getAll: () => api.get('/shorts'),
  create: (form: FormData) => api.post('/shorts', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  clap: (id: string) => api.post(`/shorts/${id}/clap`),
  save: (id: string) => api.post(`/shorts/${id}/save`),
};

export const chatAPI = {
  getMessages: (peerId: string) => api.get(`/chat/${peerId}`),
  send: (peerId: string, text: string) => api.post('/chat/send', { peerId, text }),
  safeWord: (reportedUserId: string) => api.post('/chat/safeword', { reportedUserId }),
};

export const templateAPI = {
  getMine: () => api.get('/templates'),
  getPublic: () => api.get('/templates/public'),
  create: (d: any) => api.post('/templates', d),
  save: (id: string) => api.post(`/templates/${id}/save`),
  saveFromShort: (shortId: string) => api.post(`/templates/from-short/${shortId}`),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

export const leaderboardAPI = {
  get: (type: 'global' | 'neighborhood', radius = 10) =>
    api.get(`/leaderboard?type=${type}&radius=${radius}`),
};

export const beaconAPI = {
  getAll: () => api.get('/beacons'),
  create: (d: any) => api.post('/beacons', d),
  join: (id: string) => api.post(`/beacons/${id}/join`),
  delete: (id: string) => api.delete(`/beacons/${id}`),
};

export default api;

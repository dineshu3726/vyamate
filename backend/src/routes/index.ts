import { Router } from 'express';
import { register, login, getMe, updateProfile, uploadAvatar as uploadAvatarCtrl, forgotPassword, changePassword, updatePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import {
  discoverNeighbors, discoverPeers, sendRequest, respondToRequest,
  getMatches, getPendingRequests, endorseUser
} from '../controllers/matchController';
import { getShorts, createShort, clapShort, saveShort } from '../controllers/shortsController';
import { getMessages, sendMessage, safeWordReport } from '../controllers/chatController';
import { subscribe, unsubscribe, getVapidPublicKey } from '../controllers/pushController';
import { createBeacon, getNearbyBeacons, joinBeacon, deleteBeacon } from '../controllers/beaconController';
import { getLeaderboard } from '../controllers/leaderboardController';
import { createTemplate, getMyTemplates, getPublicTemplates, saveTemplate, saveFromShort, deleteTemplate } from '../controllers/templateController';
import { logSession, getSessionHistory, deleteSession } from '../controllers/sessionController';
import { getAISuggestions } from '../controllers/aiController';
import { getHabits, createHabit, deleteHabit, logHabit, unlogHabit } from '../controllers/habitController';
import {
  getStats, getAdminUsers, getAdminUser, banUser, toggleAdmin, deleteAdminUser,
  resetUserPassword, getAdminReports, resolveReport, getAdminShorts, deleteAdminShort, adjustGritPoints,
} from '../controllers/adminController';
import { requireAdmin } from '../middleware/adminAuth';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
[uploadsDir, avatarsDir].forEach(d => { const fs = require('fs'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, getMe);
router.put('/auth/profile', authenticateToken, updateProfile);
router.post('/auth/avatar', authenticateToken, uploadAvatar.single('avatar'), uploadAvatarCtrl);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/change-password', authenticateToken, changePassword);
router.post('/auth/update-password', authenticateToken, updatePassword);

// Matching
router.get('/match/neighbors', authenticateToken, discoverNeighbors);
router.get('/match/peers', authenticateToken, discoverPeers);
router.post('/match/request', authenticateToken, sendRequest);
router.post('/match/respond', authenticateToken, respondToRequest);
router.get('/match/list', authenticateToken, getMatches);
router.get('/match/pending', authenticateToken, getPendingRequests);
router.post('/match/endorse', authenticateToken, endorseUser);

// Shorts
router.get('/shorts', authenticateToken, getShorts);
router.post('/shorts', authenticateToken, upload.single('media'), createShort);
router.post('/shorts/:id/clap', authenticateToken, clapShort);
router.post('/shorts/:id/save', authenticateToken, saveShort);

// Chat
router.get('/chat/:peerId', authenticateToken, getMessages);
router.post('/chat/send', authenticateToken, sendMessage);
router.post('/chat/safeword', authenticateToken, safeWordReport);

// Push Notifications
router.get('/push/vapid-key', authenticateToken, getVapidPublicKey);
router.post('/push/subscribe', authenticateToken, subscribe);
router.post('/push/unsubscribe', authenticateToken, unsubscribe);

// Leaderboard
router.get('/leaderboard', authenticateToken, getLeaderboard);

// Workout Templates
router.get('/templates', authenticateToken, getMyTemplates);
router.get('/templates/public', authenticateToken, getPublicTemplates);
router.post('/templates', authenticateToken, createTemplate);
router.post('/templates/:id/save', authenticateToken, saveTemplate);
router.post('/templates/from-short/:shortId', authenticateToken, saveFromShort);
router.delete('/templates/:id', authenticateToken, deleteTemplate);

// AI Workout Suggestions
router.get('/ai/suggest', authenticateToken, getAISuggestions);

// Session History
router.get('/sessions', authenticateToken, getSessionHistory);
router.post('/sessions', authenticateToken, logSession);
router.delete('/sessions/:id', authenticateToken, deleteSession);

// Active Beacons
router.get('/beacons', authenticateToken, getNearbyBeacons);
router.post('/beacons', authenticateToken, createBeacon);
router.post('/beacons/:id/join', authenticateToken, joinBeacon);
router.delete('/beacons/:id', authenticateToken, deleteBeacon);

// Habits
router.get('/habits', authenticateToken, getHabits);
router.post('/habits', authenticateToken, createHabit);
router.delete('/habits/:id', authenticateToken, deleteHabit);
router.post('/habits/:id/log', authenticateToken, logHabit);
router.delete('/habits/:id/log', authenticateToken, unlogHabit);

// One-time admin seed (protected by ADMIN_SEED_SECRET env var)
router.post('/admin/seed', async (req, res) => {
  const secret = process.env.ADMIN_SEED_SECRET;
  if (!secret) { res.status(403).json({ error: 'Seed endpoint disabled' }); return; }
  if (req.body.secret !== secret) { res.status(403).json({ error: 'Invalid secret' }); return; }
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email required' }); return; }
  const { usersDb } = require('../models/db');
  // Case-insensitive match
  usersDb.find({ email: new RegExp(`^${email.trim()}$`, 'i') }, (err: any, docs: any[]) => {
    if (err) { res.status(500).json({ error: 'DB error' }); return; }
    if (!docs.length) {
      // Return all emails to help debug
      usersDb.find({}, (e2: any, all: any[]) => {
        res.status(404).json({ error: 'User not found', registeredEmails: all.map((u: any) => u.email) });
      });
      return;
    }
    usersDb.update({ _id: docs[0]._id }, { $set: { isAdmin: true } }, {}, (err2: any) => {
      if (err2) { res.status(500).json({ error: 'DB error' }); return; }
      res.json({ success: true, message: `${docs[0].email} is now admin` });
    });
  });
});

// Admin
router.get('/admin/stats', authenticateToken, requireAdmin, getStats);
router.get('/admin/users', authenticateToken, requireAdmin, getAdminUsers);
router.get('/admin/users/:id', authenticateToken, requireAdmin, getAdminUser);
router.put('/admin/users/:id/ban', authenticateToken, requireAdmin, banUser);
router.put('/admin/users/:id/admin', authenticateToken, requireAdmin, toggleAdmin);
router.delete('/admin/users/:id', authenticateToken, requireAdmin, deleteAdminUser);
router.post('/admin/users/:id/reset-password', authenticateToken, requireAdmin, resetUserPassword);
router.put('/admin/users/:id/grit', authenticateToken, requireAdmin, adjustGritPoints);
router.get('/admin/reports', authenticateToken, requireAdmin, getAdminReports);
router.put('/admin/reports/:id/resolve', authenticateToken, requireAdmin, resolveReport);
router.get('/admin/shorts', authenticateToken, requireAdmin, getAdminShorts);
router.delete('/admin/shorts/:id', authenticateToken, requireAdmin, deleteAdminShort);

export default router;

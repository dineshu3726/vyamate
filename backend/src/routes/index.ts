import { Router } from 'express';
import { register, login, getMe, updateProfile, uploadAvatar as uploadAvatarCtrl } from '../controllers/authController';
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

// Session History
router.get('/sessions', authenticateToken, getSessionHistory);
router.post('/sessions', authenticateToken, logSession);
router.delete('/sessions/:id', authenticateToken, deleteSession);

// Active Beacons
router.get('/beacons', authenticateToken, getNearbyBeacons);
router.post('/beacons', authenticateToken, createBeacon);
router.post('/beacons/:id/join', authenticateToken, joinBeacon);
router.delete('/beacons/:id', authenticateToken, deleteBeacon);

export default router;

import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import {
  discoverNeighbors, discoverPeers, sendRequest, respondToRequest,
  getMatches, getPendingRequests, endorseUser
} from '../controllers/matchController';
import { getShorts, createShort, clapShort, saveShort } from '../controllers/shortsController';
import { getMessages, sendMessage, safeWordReport } from '../controllers/chatController';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, getMe);
router.put('/auth/profile', authenticateToken, updateProfile);

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

export default router;

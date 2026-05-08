import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { usersDb, matchesDb } from '../models/db';
import { v4 as uuid } from 'uuid';
import { sendPushToUser, getUserName } from '../services/pushService';

// Haversine distance in miles
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Blur exact coordinates to 300m neighborhood bubble
function blurLocation(lat: number, lng: number) {
  const offsetDeg = 0.0027; // ~300 meters
  const angle = Math.random() * 2 * Math.PI;
  return {
    lat: lat + Math.cos(angle) * offsetDeg * Math.random(),
    lng: lng + Math.sin(angle) * offsetDeg * Math.random(),
  };
}

export async function discoverNeighbors(req: AuthRequest, res: Response): Promise<void> {
  const { radius = 5 } = req.query;
  try {
    const me = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!me?.lat) { res.json([]); return; }

    const all = await new Promise<any[]>((resolve, reject) => {
      usersDb.find({ _id: { $ne: req.userId } }, (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); });
    });

    const maxMiles = parseFloat(radius as string);
    const results = all
      .filter(u => u.lat && u.lng)
      .map(u => {
        const dist = distanceMiles(me.lat, me.lng, u.lat, u.lng);
        const blurred = blurLocation(u.lat, u.lng);
        const scheduleOverlap = (me.schedule || []).filter((s: string) => (u.schedule || []).includes(s));
        const reason = `Matched because you are both within ${dist.toFixed(1)} miles${scheduleOverlap.length ? ` and share schedule: ${scheduleOverlap.join(', ')}` : ''}`;
        return { ...sanitize(u), dist: dist.toFixed(2), blurredLat: blurred.lat, blurredLng: blurred.lng, matchReason: reason };
      })
      .filter(u => u.dist <= maxMiles)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20);

    res.json(results);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
}

export async function discoverPeers(req: AuthRequest, res: Response): Promise<void> {
  const { activity, fitnessLevel } = req.query;
  try {
    const me = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    const all = await new Promise<any[]>((resolve, reject) => {
      usersDb.find({ _id: { $ne: req.userId } }, (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); });
    });

    const results = all
      .filter(u => {
        const levelMatch = !fitnessLevel || u.fitnessLevel === fitnessLevel;
        const actMatch = !activity || (u.activities || []).includes(activity);
        return levelMatch && actMatch;
      })
      .map(u => {
        const sharedActivities = (me.activities || []).filter((a: string) => (u.activities || []).includes(a));
        const reason = `Matched because you both do ${sharedActivities.join(', ') || (activity as string)} at ${u.fitnessLevel} level`;
        return { ...sanitize(u), matchReason: reason };
      })
      .slice(0, 20);

    res.json(results);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function sendRequest(req: AuthRequest, res: Response): Promise<void> {
  const { targetId } = req.body;
  if (!targetId) { res.status(400).json({ error: 'targetId required' }); return; }

  try {
    // Check if already exists
    const existing = await new Promise<any>((resolve, reject) => {
      matchesDb.findOne({ $or: [{ from: req.userId, to: targetId }, { from: targetId, to: req.userId }] },
        (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (existing) { res.json(existing); return; }

    const match = await new Promise<any>((resolve, reject) => {
      matchesDb.insert({ _id: uuid(), from: req.userId, to: targetId, status: 'pending', createdAt: new Date() },
        (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    // Notify target
    const senderName = await getUserName(req.userId!);
    sendPushToUser(targetId, 'New Match Request', `${senderName} wants to work out with you!`, '/profile');

    res.status(201).json(match);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function respondToRequest(req: AuthRequest, res: Response): Promise<void> {
  const { matchId, action } = req.body;
  try {
    const match = await new Promise<any>((resolve, reject) => {
      matchesDb.findOne({ _id: matchId, to: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    await new Promise<void>((resolve, reject) => {
      matchesDb.update({ _id: matchId, to: req.userId }, { $set: { status: action === 'accept' ? 'matched' : 'declined' } }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    // Notify requester on accept
    if (action === 'accept' && match) {
      const accepterName = await getUserName(req.userId!);
      sendPushToUser(match.from, 'Match Accepted!', `${accepterName} accepted your workout request. Say hi!`, '/chat');
    }

    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getMatches(req: AuthRequest, res: Response): Promise<void> {
  try {
    const matches = await new Promise<any[]>((resolve, reject) => {
      matchesDb.find({ $or: [{ from: req.userId }, { to: req.userId }], status: 'matched' },
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); });
    });

    const enriched = await Promise.all(matches.map(async m => {
      const peerId = m.from === req.userId ? m.to : m.from;
      const peer = await new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: peerId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      return { ...m, peer: peer ? sanitize(peer) : null };
    }));

    res.json(enriched);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getPendingRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pending = await new Promise<any[]>((resolve, reject) => {
      matchesDb.find({ to: req.userId, status: 'pending' },
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); });
    });

    const enriched = await Promise.all(pending.map(async m => {
      const sender = await new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: m.from }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      return { ...m, sender: sender ? sanitize(sender) : null };
    }));

    res.json(enriched);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function endorseUser(req: AuthRequest, res: Response): Promise<void> {
  const { userId, endorsements } = req.body; // endorsements: ['Punctual','Motivating','Knowledgeable']
  try {
    const target = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }

    const points = endorsements.length * 10;
    const newEndorsements = { ...(target.endorsements || {}), };
    endorsements.forEach((e: string) => { newEndorsements[e] = (newEndorsements[e] || 0) + 1; });
    const newPoints = (target.gritPoints || 0) + points;
    const localHero = newPoints >= 100;

    await new Promise<void>((resolve, reject) => {
      usersDb.update({ _id: userId }, { $set: { endorsements: newEndorsements, gritPoints: newPoints, localHero } }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    res.json({ gritPoints: newPoints, localHero });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

function sanitize(u: any) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { beaconsDb, usersDb } from '../models/db';
import { v4 as uuid } from 'uuid';
import { sendPushToUser, getUserName } from '../services/pushService';

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createBeacon(req: AuthRequest, res: Response): Promise<void> {
  const { activity, locationName, message, durationMinutes = 60 } = req.body;
  if (!activity || !locationName) {
    res.status(400).json({ error: 'activity and locationName are required' }); return;
  }

  try {
    const me = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    // Remove any existing active beacon by this user
    await new Promise<void>((resolve, reject) => {
      beaconsDb.remove({ userId: req.userId }, { multi: true }, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const beacon = await new Promise<any>((resolve, reject) => {
      beaconsDb.insert({
        _id: uuid(),
        userId: req.userId,
        activity,
        locationName,
        message: message || '',
        lat: me?.lat || null,
        lng: me?.lng || null,
        expiresAt,
        durationMinutes,
        joiners: [],
        createdAt: new Date(),
      }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    res.status(201).json({ ...beacon, author: { name: me?.name, gritPoints: me?.gritPoints } });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getNearbyBeacons(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date();

    // Remove expired beacons
    await new Promise<void>((resolve, reject) => {
      beaconsDb.remove({ expiresAt: { $lt: now } }, { multi: true }, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    const me = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    const beacons = await new Promise<any[]>((resolve, reject) => {
      beaconsDb.find({}).sort({ createdAt: -1 }).exec((err: Error | null, docs: any[]) => {
        if (err) reject(err); else resolve(docs);
      });
    });

    const enriched = await Promise.all(beacons.map(async (b) => {
      const author = await new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: b.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      const minutesLeft = Math.max(0, Math.round((new Date(b.expiresAt).getTime() - now.getTime()) / 60000));
      const dist = me?.lat && b.lat ? distanceMiles(me.lat, me.lng, b.lat, b.lng).toFixed(1) : null;
      return {
        ...b,
        minutesLeft,
        dist,
        author: { name: author?.name || 'VyaMate User', gritPoints: author?.gritPoints || 0, localHero: author?.localHero || false },
        isOwn: b.userId === req.userId,
        hasJoined: (b.joiners || []).includes(req.userId),
      };
    }));

    // Sort: own beacon first, then by proximity
    enriched.sort((a, b) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      return (parseFloat(a.dist) || 999) - (parseFloat(b.dist) || 999);
    });

    res.json(enriched);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function joinBeacon(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const beacon = await new Promise<any>((resolve, reject) => {
      beaconsDb.findOne({ _id: id }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!beacon) { res.status(404).json({ error: 'Beacon not found' }); return; }
    if (beacon.userId === req.userId) { res.status(400).json({ error: 'Cannot join your own beacon' }); return; }

    const alreadyJoined = (beacon.joiners || []).includes(req.userId);
    if (alreadyJoined) {
      // Leave beacon
      await new Promise<void>((resolve, reject) => {
        beaconsDb.update({ _id: id }, { $pull: { joiners: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      res.json({ joined: false, joiners: beacon.joiners.filter((j: string) => j !== req.userId) });
    } else {
      // Join beacon
      await new Promise<void>((resolve, reject) => {
        beaconsDb.update({ _id: id }, { $push: { joiners: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });

      // Notify beacon creator
      const joinerName = await getUserName(req.userId!);
      sendPushToUser(
        beacon.userId,
        'Someone joined your beacon! 🏃',
        `${joinerName} is joining your ${beacon.activity} session at ${beacon.locationName}`,
        '/',
      );

      res.json({ joined: true, joiners: [...(beacon.joiners || []), req.userId] });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function deleteBeacon(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await new Promise<void>((resolve, reject) => {
      beaconsDb.remove({ _id: id, userId: req.userId }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

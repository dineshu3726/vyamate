import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { usersDb } from '../models/db';

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  const { type = 'global', radius = '10' } = req.query;

  try {
    const me = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    const all = await new Promise<any[]>((resolve, reject) => {
      usersDb.find({}, (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); });
    });

    let filtered = all;

    if (type === 'neighborhood' && me?.lat) {
      const maxMiles = parseFloat(radius as string);
      filtered = all.filter(u => {
        if (!u.lat || !u.lng) return false;
        return distanceMiles(me.lat, me.lng, u.lat, u.lng) <= maxMiles;
      });
    }

    const ranked = filtered
      .sort((a, b) => (b.gritPoints || 0) - (a.gritPoints || 0))
      .slice(0, 50)
      .map((u, i) => ({
        rank: i + 1,
        _id: u._id,
        name: u.name,
        gritPoints: u.gritPoints || 0,
        localHero: u.localHero || false,
        activities: u.activities || [],
        fitnessLevel: u.fitnessLevel || 'Beginner',
        endorsements: u.endorsements || {},
        endorsementCount: Object.values(u.endorsements || {}).reduce((s: number, v) => s + (v as number), 0),
        isMe: u._id === req.userId,
      }));

    // Find the current user's rank even if not in top 50
    const myRank = all
      .sort((a, b) => (b.gritPoints || 0) - (a.gritPoints || 0))
      .findIndex(u => u._id === req.userId) + 1;

    res.json({ leaderboard: ranked, myRank, totalUsers: filtered.length });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

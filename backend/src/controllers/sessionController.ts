import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sessionsDb, usersDb } from '../models/db';
import { v4 as uuid } from 'uuid';

const GRIT_PER_SESSION = 5;

function calcStreak(sessions: any[]): number {
  if (!sessions.length) return 0;

  // Get unique workout days (YYYY-MM-DD) sorted desc
  const days = [...new Set(
    sessions.map(s => new Date(s.completedAt).toISOString().slice(0, 10))
  )].sort((a, b) => b.localeCompare(a));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must include today or yesterday to be active
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export async function logSession(req: AuthRequest, res: Response): Promise<void> {
  const { activity, durationMinutes, notes = '', completedAt, templateId } = req.body;
  if (!activity || !durationMinutes) {
    res.status(400).json({ error: 'activity and durationMinutes are required' }); return;
  }

  try {
    const session = await new Promise<any>((resolve, reject) => {
      sessionsDb.insert({
        _id: uuid(),
        userId: req.userId,
        activity,
        durationMinutes: Number(durationMinutes),
        notes,
        templateId: templateId || null,
        gritPointsEarned: GRIT_PER_SESSION,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        createdAt: new Date(),
      }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    // Award Grit Points
    await new Promise<void>((resolve, reject) => {
      usersDb.update(
        { _id: req.userId },
        { $inc: { gritPoints: GRIT_PER_SESSION } },
        {},
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    res.status(201).json({ ...session, gritPointsEarned: GRIT_PER_SESSION });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getSessionHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sessions = await new Promise<any[]>((resolve, reject) => {
      sessionsDb.find({ userId: req.userId }).sort({ completedAt: -1 }).exec(
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
      );
    });

    const streak = calcStreak(sessions);

    // Stats
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const activityCount: Record<string, number> = {};
    sessions.forEach(s => { activityCount[s.activity] = (activityCount[s.activity] || 0) + 1; });
    const favoriteActivity = Object.entries(activityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({ sessions, streak, totalSessions, totalMinutes, favoriteActivity });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function deleteSession(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const session = await new Promise<any>((resolve, reject) => {
      sessionsDb.findOne({ _id: id, userId: req.userId },
        (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    await new Promise<void>((resolve, reject) => {
      sessionsDb.remove({ _id: id, userId: req.userId }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    // Deduct Grit Points
    await new Promise<void>((resolve, reject) => {
      usersDb.update(
        { _id: req.userId },
        { $inc: { gritPoints: -GRIT_PER_SESSION } },
        {},
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

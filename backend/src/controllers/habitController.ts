import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { habitsDb, habitLogsDb } from '../models/db';
import { v4 as uuid } from 'uuid';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function calcStreak(sortedDates: string[]): { current: number; longest: number } {
  if (!sortedDates.length) return { current: 0, longest: 0 };

  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));

  // Current streak — must include today or yesterday
  let current = 0;
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    current = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.round(diff) === 1) current++;
      else break;
    }
  }

  // Longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

export async function getHabits(req: AuthRequest, res: Response): Promise<void> {
  try {
    const habits = await new Promise<any[]>((resolve, reject) => {
      habitsDb.find({ userId: req.userId }).sort({ createdAt: 1 }).exec(
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
      );
    });

    const today = toDateStr(new Date());
    const cutoff = toDateStr(new Date(Date.now() - 84 * 86400000)); // 12 weeks back

    const allLogs = await new Promise<any[]>((resolve, reject) => {
      habitLogsDb.find({ userId: req.userId, completedDate: { $gte: cutoff } }).exec(
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
      );
    });

    // Group logs by habitId
    const logsByHabit: Record<string, string[]> = {};
    allLogs.forEach(log => {
      if (!logsByHabit[log.habitId]) logsByHabit[log.habitId] = [];
      logsByHabit[log.habitId].push(log.completedDate);
    });

    const enriched = habits.map(h => {
      const dates = (logsByHabit[h._id] || []).sort((a: string, b: string) => b.localeCompare(a));
      const { current, longest } = calcStreak(dates);
      const completedToday = dates.includes(today);
      const totalCompletions = dates.length;
      // Completion rate over the last 30 days
      const last30 = toDateStr(new Date(Date.now() - 30 * 86400000));
      const recent30 = dates.filter((d: string) => d >= last30).length;
      const completionRate = Math.round((recent30 / 30) * 100);

      return {
        ...h,
        currentStreak: current,
        longestStreak: longest,
        totalCompletions,
        completionRate,
        completedToday,
        recentDates: dates, // all dates in last 12 weeks for heatmap
      };
    });

    const todayDone = enriched.filter(h => h.completedToday).length;

    res.json({ habits: enriched, todayProgress: { done: todayDone, total: habits.length } });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function createHabit(req: AuthRequest, res: Response): Promise<void> {
  const { name, emoji, color, frequency, targetDays, category } = req.body;
  if (!name || !emoji || !color) {
    res.status(400).json({ error: 'name, emoji and color are required' }); return;
  }

  try {
    const habit = await new Promise<any>((resolve, reject) => {
      habitsDb.insert({
        _id: uuid(),
        userId: req.userId,
        name: name.trim(),
        emoji,
        color,
        frequency: frequency || 'daily',
        targetDays: targetDays || [0, 1, 2, 3, 4, 5, 6],
        category: category || 'General',
        createdAt: new Date(),
      }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    res.status(201).json({ ...habit, currentStreak: 0, longestStreak: 0, totalCompletions: 0, completionRate: 0, completedToday: false, recentDates: [] });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function deleteHabit(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const habit = await new Promise<any>((resolve, reject) => {
      habitsDb.findOne({ _id: id, userId: req.userId },
        (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!habit) { res.status(404).json({ error: 'Not found' }); return; }

    await new Promise<void>((resolve, reject) => {
      habitsDb.remove({ _id: id }, {}, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    await new Promise<void>((resolve, reject) => {
      habitLogsDb.remove({ habitId: id }, { multi: true }, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function logHabit(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const date = (req.body.date as string) || toDateStr(new Date());

  try {
    const habit = await new Promise<any>((resolve, reject) => {
      habitsDb.findOne({ _id: id, userId: req.userId },
        (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!habit) { res.status(404).json({ error: 'Not found' }); return; }

    // Upsert — avoid duplicate logs for same day
    const existing = await new Promise<any>((resolve, reject) => {
      habitLogsDb.findOne({ habitId: id, userId: req.userId, completedDate: date },
        (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    if (!existing) {
      await new Promise<any>((resolve, reject) => {
        habitLogsDb.insert({
          _id: uuid(),
          habitId: id,
          userId: req.userId,
          completedDate: date,
          createdAt: new Date(),
        }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
    }

    res.json({ success: true, date });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function unlogHabit(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const date = (req.query.date as string) || toDateStr(new Date());

  try {
    await new Promise<void>((resolve, reject) => {
      habitLogsDb.remove({ habitId: id, userId: req.userId, completedDate: date }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    res.json({ success: true, date });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

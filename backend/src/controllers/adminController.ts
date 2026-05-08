import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  usersDb, matchesDb, shortsDb, messagesDb, sessionsDb,
  reportsDb, beaconsDb, templatesDb, habitsDb,
} from '../models/db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { sendTempPasswordEmail } from '../services/emailService';

function dbFind<T>(db: any, query: any, sort?: any): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const cursor = db.find(query);
    if (sort) cursor.sort(sort);
    cursor.exec((err: Error | null, docs: T[]) => { if (err) reject(err); else resolve(docs); });
  });
}

function dbFindOne<T>(db: any, query: any): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.findOne(query, (err: Error | null, doc: T | null) => { if (err) reject(err); else resolve(doc); });
  });
}

function dbCount(db: any, query: any = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    db.count(query, (err: Error | null, n: number) => { if (err) reject(err); else resolve(n); });
  });
}

function dbUpdate(db: any, query: any, update: any, options: any = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    db.update(query, update, options, (err: Error | null, n: number) => { if (err) reject(err); else resolve(n); });
  });
}

function dbRemove(db: any, query: any, options: any = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    db.remove(query, options, (err: Error | null, n: number) => { if (err) reject(err); else resolve(n); });
  });
}

function sanitizeUser(u: any) {
  const { password, tempPasswordExpiry, ...rest } = u;
  return rest;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// GET /admin/stats
export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [users, matches, sessions, reports, shorts, beacons, templates, habits] = await Promise.all([
      dbCount(usersDb),
      dbCount(matchesDb),
      dbCount(sessionsDb),
      dbCount(reportsDb),
      dbCount(shortsDb),
      dbCount(beaconsDb),
      dbCount(templatesDb),
      dbCount(habitsDb),
    ]);
    const [banned, admins, openReports, pendingMatches, acceptedMatches] = await Promise.all([
      dbCount(usersDb, { banned: true }),
      dbCount(usersDb, { isAdmin: true }),
      dbCount(reportsDb, { resolved: { $exists: false } }),
      dbCount(matchesDb, { status: 'pending' }),
      dbCount(matchesDb, { status: 'matched' }),
    ]);
    res.json({
      users, banned, admins,
      matches, pendingMatches, acceptedMatches,
      sessions, reports, openReports,
      shorts, beacons, templates, habits,
    });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// GET /admin/users?search=&page=1&limit=20
export async function getAdminUsers(req: AuthRequest, res: Response): Promise<void> {
  const search = (req.query.search as string || '').trim();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  try {
    let query: any = {};
    if (search) {
      const re = new RegExp(search, 'i');
      query = { $or: [{ name: re }, { email: re }] };
    }

    const all = await dbFind<any>(usersDb, query, { createdAt: -1 });
    const total = all.length;
    const users = all.slice((page - 1) * limit, page * limit).map(sanitizeUser);

    res.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// GET /admin/users/:id
export async function getAdminUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await dbFindOne<any>(usersDb, { _id: req.params.id });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(sanitizeUser(user));
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// PUT /admin/users/:id/ban
export async function banUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === req.userId) { res.status(400).json({ error: 'Cannot ban yourself' }); return; }
  try {
    const user = await dbFindOne<any>(usersDb, { _id: id });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const banned = !user.banned;
    await dbUpdate(usersDb, { _id: id }, { $set: { banned } });
    res.json({ banned, message: banned ? 'User banned' : 'User unbanned' });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// PUT /admin/users/:id/admin
export async function toggleAdmin(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === req.userId) { res.status(400).json({ error: 'Cannot change your own admin status' }); return; }
  try {
    const user = await dbFindOne<any>(usersDb, { _id: id });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const isAdmin = !user.isAdmin;
    await dbUpdate(usersDb, { _id: id }, { $set: { isAdmin } });
    res.json({ isAdmin, message: isAdmin ? 'User promoted to admin' : 'Admin access removed' });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// DELETE /admin/users/:id
export async function deleteAdminUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === req.userId) { res.status(400).json({ error: 'Cannot delete yourself' }); return; }
  try {
    await Promise.all([
      dbRemove(usersDb, { _id: id }),
      dbRemove(matchesDb, { $or: [{ from: id }, { to: id }] }, { multi: true }),
      dbRemove(messagesDb, { $or: [{ from: id }, { to: id }] }, { multi: true }),
      dbRemove(shortsDb, { userId: id }, { multi: true }),
      dbRemove(sessionsDb, { userId: id }, { multi: true }),
      dbRemove(templatesDb, { creatorId: id }, { multi: true }),
      dbRemove(habitsDb, { userId: id }, { multi: true }),
      dbRemove(beaconsDb, { userId: id }, { multi: true }),
    ]);
    res.json({ success: true, message: 'User and all associated data deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// POST /admin/users/:id/reset-password
export async function resetUserPassword(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const user = await dbFindOne<any>(usersDb, { _id: id });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    await dbUpdate(usersDb, { _id: id }, {
      $set: { password: hashed, mustChangePassword: true, tempPasswordExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    });

    try {
      await sendTempPasswordEmail(user.email, user.name, tempPassword);
      res.json({ success: true, message: 'Temporary password sent to user\'s email' });
    } catch {
      // Email failed but password was reset — return temp password to admin
      res.json({ success: true, tempPassword, message: 'Email delivery failed. Share this temp password manually.' });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// GET /admin/reports?resolved=false
export async function getAdminReports(req: AuthRequest, res: Response): Promise<void> {
  const showResolved = req.query.resolved === 'true';
  try {
    const query = showResolved ? {} : { resolved: { $exists: false } };
    const reports = await dbFind<any>(reportsDb, query, { createdAt: -1 });

    // Enrich with user info
    const enriched = await Promise.all(reports.map(async (r) => {
      const [reporter, reported] = await Promise.all([
        dbFindOne<any>(usersDb, { _id: r.reporterId }),
        dbFindOne<any>(usersDb, { _id: r.reportedId }),
      ]);
      return {
        ...r,
        reporter: reporter ? { _id: reporter._id, name: reporter.name, email: reporter.email } : null,
        reported: reported ? { _id: reported._id, name: reported.name, email: reported.email, banned: reported.banned } : null,
      };
    }));

    res.json({ reports: enriched, total: enriched.length });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// PUT /admin/reports/:id/resolve
export async function resolveReport(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { action } = req.body; // 'dismiss' | 'ban_reported'
  try {
    await dbUpdate(reportsDb, { _id: id }, { $set: { resolved: true, resolvedAt: new Date(), resolvedAction: action || 'dismissed' } });

    if (action === 'ban_reported') {
      const report = await dbFindOne<any>(reportsDb, { _id: id });
      if (report?.reportedId) {
        await dbUpdate(usersDb, { _id: report.reportedId }, { $set: { banned: true } });
      }
    }

    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// GET /admin/shorts?page=1
export async function getAdminShorts(req: AuthRequest, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

  try {
    const all = await dbFind<any>(shortsDb, {}, { createdAt: -1 });
    const total = all.length;
    const page_shorts = all.slice((page - 1) * limit, page * limit);

    const enriched = await Promise.all(page_shorts.map(async (s) => {
      const author = await dbFindOne<any>(usersDb, { _id: s.userId });
      return {
        ...s,
        author: author ? { _id: author._id, name: author.name, email: author.email } : null,
      };
    }));

    res.json({ shorts: enriched, total, page, limit, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// DELETE /admin/shorts/:id
export async function deleteAdminShort(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await dbRemove(shortsDb, { _id: id });
    res.json({ success: true, message: 'Short deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

// PUT /admin/users/:id/grit
export async function adjustGritPoints(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { gritPoints } = req.body;
  if (typeof gritPoints !== 'number') { res.status(400).json({ error: 'gritPoints must be a number' }); return; }
  try {
    await dbUpdate(usersDb, { _id: id }, { $set: { gritPoints } });
    res.json({ success: true, gritPoints });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { shortsDb, usersDb } from '../models/db';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { sendPushToUser, getUserName } from '../services/pushService';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export async function getShorts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const shorts = await new Promise<any[]>((resolve, reject) => {
      shortsDb.find({}).sort({ createdAt: -1 }).limit(50).exec((err: Error | null, docs: any[]) => {
        if (err) reject(err); else resolve(docs);
      });
    });

    // Check if any user is a Local Hero and pin their shorts at top for 24h
    const enriched = await Promise.all(shorts.map(async s => {
      const author = await new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: s.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      const isHeroPinned = author?.localHero && (Date.now() - new Date(s.createdAt).getTime()) < 24 * 60 * 60 * 1000;
      return { ...s, author: author ? { name: author.name, avatar: author.avatar, gritPoints: author.gritPoints, localHero: author.localHero } : null, pinned: isHeroPinned };
    }));

    // Pinned first, then by date
    enriched.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    res.json(enriched);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
}

export async function createShort(req: AuthRequest, res: Response): Promise<void> {
  const { caption, workoutTemplate, activity } = req.body;
  const file = (req as any).file;

  if (!file) { res.status(400).json({ error: 'Media file required' }); return; }

  try {
    const short = await new Promise<any>((resolve, reject) => {
      shortsDb.insert({
        _id: uuid(),
        userId: req.userId,
        caption: caption || '',
        activity: activity || '',
        mediaUrl: `/uploads/${file.filename}`,
        mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
        claps: 0,
        clappers: [],
        workoutTemplate: workoutTemplate ? JSON.parse(workoutTemplate) : null,
        savedBy: [],
        createdAt: new Date(),
      }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    res.status(201).json(short);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function clapShort(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const short = await new Promise<any>((resolve, reject) => {
      shortsDb.findOne({ _id: id }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!short) { res.status(404).json({ error: 'Not found' }); return; }

    const alreadyClapped = (short.clappers || []).includes(req.userId);
    if (alreadyClapped) {
      await new Promise<void>((resolve, reject) => {
        shortsDb.update({ _id: id }, { $inc: { claps: -1 }, $pull: { clappers: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      res.json({ claps: short.claps - 1, clapped: false });
    } else {
      await new Promise<void>((resolve, reject) => {
        shortsDb.update({ _id: id }, { $inc: { claps: 1 }, $push: { clappers: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      // Award grit points to creator
      await new Promise<void>((resolve, reject) => {
        usersDb.update({ _id: short.userId }, { $inc: { gritPoints: 2 } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      // Notify creator (not themselves)
      if (short.userId !== req.userId) {
        const clapperName = await getUserName(req.userId!);
        sendPushToUser(short.userId, 'Your Short got a clap! 👏', `${clapperName} clapped your workout short`, '/shorts');
      }
      res.json({ claps: short.claps + 1, clapped: true });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function saveShort(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const short = await new Promise<any>((resolve, reject) => {
      shortsDb.findOne({ _id: id }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!short) { res.status(404).json({ error: 'Not found' }); return; }
    const alreadySaved = (short.savedBy || []).includes(req.userId);
    if (!alreadySaved) {
      await new Promise<void>((resolve, reject) => {
        shortsDb.update({ _id: id }, { $push: { savedBy: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
    }
    res.json({ saved: true, template: short.workoutTemplate });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

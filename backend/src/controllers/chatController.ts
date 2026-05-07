import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { messagesDb, matchesDb, reportsDb } from '../models/db';
import { v4 as uuid } from 'uuid';

// Suggested public meetup locations
const PUBLIC_SPOTS = [
  'Local Park (Main Entrance)',
  'Community Recreation Center',
  'Public Library Parking',
  'Town Square / Plaza',
  'Shopping Mall Common Area',
  'Coffee Shop (Public)',
];

async function areMutualMatches(userId1: string, userId2: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    matchesDb.findOne(
      { status: 'matched', $or: [{ from: userId1, to: userId2 }, { from: userId2, to: userId1 }] },
      (err: Error | null, doc: any) => { if (err) reject(err); else resolve(!!doc); }
    );
  });
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const { peerId } = req.params;
  const mutual = await areMutualMatches(req.userId!, peerId);
  if (!mutual) { res.status(403).json({ error: 'Chat only available after mutual match' }); return; }

  try {
    const msgs = await new Promise<any[]>((resolve, reject) => {
      messagesDb.find({
        $or: [
          { from: req.userId, to: peerId },
          { from: peerId, to: req.userId },
        ]
      }).sort({ createdAt: 1 }).exec((err: Error | null, docs: any[]) => {
        if (err) reject(err); else resolve(docs);
      });
    });
    res.json({ messages: msgs, suggestedSpots: PUBLIC_SPOTS });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const { peerId, text } = req.body;
  const mutual = await areMutualMatches(req.userId!, peerId);
  if (!mutual) { res.status(403).json({ error: 'Chat only available after mutual match' }); return; }

  try {
    const msg = await new Promise<any>((resolve, reject) => {
      messagesDb.insert({
        _id: uuid(),
        from: req.userId,
        to: peerId,
        text,
        createdAt: new Date(),
      }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    res.status(201).json(msg);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function safeWordReport(req: AuthRequest, res: Response): Promise<void> {
  const { reportedUserId, reason } = req.body;
  try {
    // Log report
    await new Promise<void>((resolve, reject) => {
      reportsDb.insert({
        _id: uuid(),
        reporterId: req.userId,
        reportedId: reportedUserId,
        reason: reason || 'Safe-word triggered',
        createdAt: new Date(),
      }, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });

    // Remove match
    await new Promise<void>((resolve, reject) => {
      matchesDb.remove(
        { $or: [{ from: req.userId, to: reportedUserId }, { from: reportedUserId, to: req.userId }] },
        { multi: true },
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    res.json({ success: true, message: 'User blocked and reported. Stay safe.' });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

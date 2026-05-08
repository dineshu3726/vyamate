import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { subscriptionsDb } from '../models/db';
import { v4 as uuid } from 'uuid';

export async function subscribe(req: AuthRequest, res: Response): Promise<void> {
  const { subscription } = req.body;
  if (!subscription?.endpoint) { res.status(400).json({ error: 'Invalid subscription' }); return; }

  try {
    // Upsert by endpoint
    await new Promise<void>((resolve, reject) => {
      subscriptionsDb.update(
        { 'subscription.endpoint': subscription.endpoint },
        { $set: { userId: req.userId, subscription, updatedAt: new Date() } },
        { upsert: true },
        (err: Error | null) => { if (err) reject(err); else resolve(); },
      );
    });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function unsubscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint } = req.body;
  try {
    await new Promise<void>((resolve, reject) => {
      subscriptionsDb.remove({ 'subscription.endpoint': endpoint }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export function getVapidPublicKey(_req: AuthRequest, res: Response): void {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}

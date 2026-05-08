import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { usersDb } from '../models/db';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => {
        if (err) reject(err); else resolve(doc);
      });
    });
    if (!user?.isAdmin) { res.status(403).json({ error: 'Admin access required' }); return; }
    next();
  } catch { res.status(500).json({ error: 'Server error' }); }
}

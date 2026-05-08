import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { templatesDb, shortsDb, usersDb } from '../models/db';
import { v4 as uuid } from 'uuid';

export async function createTemplate(req: AuthRequest, res: Response): Promise<void> {
  const { name, activity, fitnessLevel, estimatedMinutes, description, exercises, isPublic } = req.body;
  if (!name || !exercises?.length) {
    res.status(400).json({ error: 'name and exercises are required' }); return;
  }

  try {
    const template = await new Promise<any>((resolve, reject) => {
      templatesDb.insert({
        _id: uuid(),
        creatorId: req.userId,
        name,
        activity: activity || '',
        fitnessLevel: fitnessLevel || 'Beginner',
        estimatedMinutes: estimatedMinutes || 30,
        description: description || '',
        exercises,
        isPublic: isPublic !== false,
        savedBy: [],
        createdAt: new Date(),
      }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    res.status(201).json(template);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getMyTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Created by me
    const created = await new Promise<any[]>((resolve, reject) => {
      templatesDb.find({ creatorId: req.userId }).sort({ createdAt: -1 }).exec(
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
      );
    });

    // Saved by me (from other creators)
    const saved = await new Promise<any[]>((resolve, reject) => {
      templatesDb.find({ savedBy: req.userId, creatorId: { $ne: req.userId } }).sort({ createdAt: -1 }).exec(
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
      );
    });

    // Enrich with creator info
    const enrich = async (t: any) => {
      const creator = await new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: t.creatorId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      return { ...t, creatorName: creator?.name || 'VyaMate User', isOwn: t.creatorId === req.userId };
    };

    const [enrichedCreated, enrichedSaved] = await Promise.all([
      Promise.all(created.map(enrich)),
      Promise.all(saved.map(enrich)),
    ]);

    res.json({ created: enrichedCreated, saved: enrichedSaved });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getPublicTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const templates = await new Promise<any[]>((resolve, reject) => {
      templatesDb.find({ isPublic: true }).sort({ createdAt: -1 }).limit(30).exec(
        (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
      );
    });

    const enriched = await Promise.all(templates.map(async (t) => {
      const creator = await new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: t.creatorId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      return {
        ...t,
        creatorName: creator?.name || 'VyaMate User',
        isOwn: t.creatorId === req.userId,
        hasSaved: (t.savedBy || []).includes(req.userId),
      };
    }));

    res.json(enriched);
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function saveTemplate(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const template = await new Promise<any>((resolve, reject) => {
      templatesDb.findOne({ _id: id }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
    if (template.creatorId === req.userId) { res.status(400).json({ error: 'Already your template' }); return; }

    const alreadySaved = (template.savedBy || []).includes(req.userId);
    if (alreadySaved) {
      await new Promise<void>((resolve, reject) => {
        templatesDb.update({ _id: id }, { $pull: { savedBy: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      res.json({ saved: false });
    } else {
      await new Promise<void>((resolve, reject) => {
        templatesDb.update({ _id: id }, { $push: { savedBy: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      res.json({ saved: true });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function saveFromShort(req: AuthRequest, res: Response): Promise<void> {
  const { shortId } = req.params;
  try {
    const short = await new Promise<any>((resolve, reject) => {
      shortsDb.findOne({ _id: shortId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!short?.workoutTemplate) { res.status(400).json({ error: 'This short has no workout template' }); return; }

    // Check not already saved
    const exists = await new Promise<any>((resolve, reject) => {
      templatesDb.findOne({ fromShortId: shortId, savedBy: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    if (exists) {
      res.json({ saved: false, message: 'Already saved' }); return;
    }

    // Create or update template from short
    const existing = await new Promise<any>((resolve, reject) => {
      templatesDb.findOne({ fromShortId: shortId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    if (existing) {
      await new Promise<void>((resolve, reject) => {
        templatesDb.update({ _id: existing._id }, { $push: { savedBy: req.userId } as any }, {},
          (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
      res.json({ saved: true, templateId: existing._id });
    } else {
      const wt = short.workoutTemplate;
      const template = await new Promise<any>((resolve, reject) => {
        templatesDb.insert({
          _id: uuid(),
          creatorId: short.userId,
          fromShortId: shortId,
          name: wt.name || `${short.activity} Session`,
          activity: short.activity,
          fitnessLevel: wt.fitnessLevel || 'Beginner',
          estimatedMinutes: wt.estimatedMinutes || 30,
          description: short.caption || '',
          exercises: wt.exercises || [],
          isPublic: true,
          savedBy: [req.userId],
          createdAt: new Date(),
        }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
      });
      res.json({ saved: true, templateId: template._id });
    }
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function deleteTemplate(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await new Promise<void>((resolve, reject) => {
      templatesDb.remove({ _id: id, creatorId: req.userId }, {},
        (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

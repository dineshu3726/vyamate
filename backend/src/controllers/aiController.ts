import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { usersDb, sessionsDb } from '../models/db';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function getAISuggestions(req: AuthRequest, res: Response): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'AI suggestions not configured' }); return;
  }

  try {
    const [user, recentSessions] = await Promise.all([
      new Promise<any>((resolve, reject) => {
        usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => {
          if (err) reject(err); else resolve(doc);
        });
      }),
      new Promise<any[]>((resolve, reject) => {
        sessionsDb.find({ userId: req.userId }).sort({ completedAt: -1 }).limit(10).exec(
          (err: Error | null, docs: any[]) => { if (err) reject(err); else resolve(docs); }
        );
      }),
    ]);

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const sessionSummary = recentSessions.length
      ? recentSessions.slice(0, 5).map(s =>
          `${s.activity} for ${s.durationMinutes} min on ${new Date(s.completedAt).toLocaleDateString()}`
        ).join('; ')
      : 'No recent sessions logged yet';

    const prompt = `You are a fitness coach for VyaMate, a community workout app. Generate 3 personalized workout suggestions for this user.

User Profile:
- Name: ${user.name}
- Fitness Level: ${user.fitnessLevel}
- Activities: ${user.activities?.join(', ') || 'Not specified'}
- Schedule: ${user.schedule?.join(', ') || 'Flexible'}
- Grit Points: ${user.gritPoints || 0}
- Recent Sessions: ${sessionSummary}

Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "suggestions": [
    {
      "name": "workout name",
      "activity": "one of the user's activities",
      "fitnessLevel": "${user.fitnessLevel}",
      "estimatedMinutes": 30,
      "description": "2-3 sentence description of what makes this workout good for them",
      "reasoning": "1 sentence on why this is personalized to them",
      "exercises": [
        { "name": "exercise name", "sets": 3, "reps": 10 },
        { "name": "exercise name", "sets": 3, "durationSeconds": 30 }
      ]
    }
  ]
}

Rules:
- Tailor each suggestion to their fitness level and listed activities
- Vary the 3 suggestions (e.g. strength, cardio, flexibility)
- Keep exercises realistic and appropriate for ${user.fitnessLevel} level
- estimatedMinutes should match their usual session length if available
- exercises array should have 4-6 items per workout`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text as string;

    let parsed: any;
    try {
      // Strip any accidental markdown fences
      const clean = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      res.status(500).json({ error: 'AI returned invalid response. Please try again.' }); return;
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('AI suggestions error:', err?.message);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}

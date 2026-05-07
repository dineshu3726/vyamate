import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersDb } from '../models/db';
import { v4 as uuid } from 'uuid';

function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, dob, lat, lng } = req.body;
  if (!name || !email || !password || !dob) {
    res.status(400).json({ error: 'All fields required' }); return;
  }

  // Age gate: must be 16+
  const birthDate = new Date(dob);
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 16) {
    res.status(403).json({ error: 'You must be 16 or older to use VyaMate' }); return;
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.insert({
        _id: uuid(),
        name, email,
        password: hashed,
        dob, age,
        lat: lat || null,
        lng: lng || null,
        bio: '',
        activities: [],
        fitnessLevel: 'Beginner',
        schedule: [],
        gritPoints: 0,
        localHero: false,
        vibeCheckDone: false,
        ageVerified: false,
        avatar: null,
        createdAt: new Date(),
      }, (err, doc) => { if (err) reject(err); else resolve(doc); });
    });

    res.status(201).json({ token: signToken(user._id), user: sanitize(user) });
  } catch (err: any) {
    if (err.errorType === 'uniqueViolated') res.status(409).json({ error: 'Email already registered' });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }

  try {
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ email }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    res.json({ token: signToken(user._id), user: sanitize(user) });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function getMe(req: any, res: Response): Promise<void> {
  try {
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(sanitize(user));
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function updateProfile(req: any, res: Response): Promise<void> {
  const { bio, activities, fitnessLevel, schedule, lat, lng, vibeCheckDone, ageVerified } = req.body;
  const update: any = {};
  if (bio !== undefined) update.bio = bio;
  if (activities !== undefined) update.activities = activities;
  if (fitnessLevel !== undefined) update.fitnessLevel = fitnessLevel;
  if (schedule !== undefined) update.schedule = schedule;
  if (lat !== undefined) update.lat = lat;
  if (lng !== undefined) update.lng = lng;
  if (vibeCheckDone !== undefined) update.vibeCheckDone = vibeCheckDone;
  if (ageVerified !== undefined) update.ageVerified = ageVerified;

  try {
    await new Promise<void>((resolve, reject) => {
      usersDb.update({ _id: req.userId }, { $set: update }, {}, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    res.json(sanitize(user));
  } catch { res.status(500).json({ error: 'Server error' }); }
}

function sanitize(u: any) {
  const { password, ...rest } = u;
  return rest;
}

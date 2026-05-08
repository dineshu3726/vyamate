import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersDb } from '../models/db';
import { v4 as uuid } from 'uuid';
import { sendTempPasswordEmail } from '../services/emailService';

function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  // Guarantee at least one of each category
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  // Fill remaining to reach 12 chars
  while (pwd.length < 12) pwd.push(all[Math.floor(Math.random() * all.length)]);

  // Shuffle
  return pwd.sort(() => Math.random() - 0.5).join('');
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, dob, lat, lng } = req.body;
  if (!name || !email || !password || !dob) {
    res.status(400).json({ error: 'All fields required' }); return;
  }

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
        mustChangePassword: false,
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

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

  try {
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ email: email.toLowerCase().trim() }, (err: Error | null, doc: any) => {
        if (err) reject(err); else resolve(doc);
      });
    });

    // Always respond success to prevent email enumeration
    if (!user) {
      res.json({ message: 'If that email is registered, a temporary password has been sent.' });
      return;
    }

    const tempPassword = generateStrongPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await new Promise<void>((resolve, reject) => {
      usersDb.update(
        { _id: user._id },
        { $set: { password: hashed, mustChangePassword: true, tempPasswordExpiry: expiry } },
        {},
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    await sendTempPasswordEmail(user.email, user.name, tempPassword);

    res.json({ message: 'If that email is registered, a temporary password has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
}

export async function changePassword(req: any, res: Response): Promise<void> {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' }); return;
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await new Promise<void>((resolve, reject) => {
      usersDb.update(
        { _id: req.userId },
        { $set: { password: hashed, mustChangePassword: false }, $unset: { tempPasswordExpiry: true } },
        {},
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });

    res.json({ user: sanitize(user) });
  } catch { res.status(500).json({ error: 'Server error' }); }
}

export async function updatePassword(req: any, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' }); return;
  }

  try {
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'New password must be different from current password' }); return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await new Promise<void>((resolve, reject) => {
      usersDb.update(
        { _id: req.userId },
        { $set: { password: hashed } },
        {},
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    res.json({ success: true });
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

export async function uploadAvatar(req: any, res: Response): Promise<void> {
  const file = req.file;
  if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  try {
    const avatar = `/uploads/avatars/${file.filename}`;
    await new Promise<void>((resolve, reject) => {
      usersDb.update({ _id: req.userId }, { $set: { avatar } }, {}, (err: Error | null) => { if (err) reject(err); else resolve(); });
    });
    const user = await new Promise<any>((resolve, reject) => {
      usersDb.findOne({ _id: req.userId }, (err: Error | null, doc: any) => { if (err) reject(err); else resolve(doc); });
    });
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
  const { password, tempPasswordExpiry, ...rest } = u;
  return rest;
}

import { Router, Request, Response } from 'express';
import { getDb } from '../models/database.js';
import { signToken } from '../middleware/auth.js';
import type { User } from '../types/index.js';

const router = Router();

// POST /auth/login - Login with invite ID
router.post('/login', (req: Request, res: Response) => {
  const { invite_id } = req.body;
  if (!invite_id || typeof invite_id !== 'string') {
    res.status(400).json({ error: 'invite_id is required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE invite_id = ?').get(invite_id) as User | undefined;

  if (!user) {
    res.status(404).json({ error: 'Invalid invite ID. Please contact the administrator.' });
    return;
  }

  const token = signToken({ user_id: user.user_id, role: user.role });
  res.json({ token, user });
});

// GET /auth/me - Get current user info
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id) as User | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

export default router;

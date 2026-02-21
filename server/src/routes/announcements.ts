import { Router, Request, Response } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /announcements - List announcements for the current user
router.get('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.user_id;

  // Get all announcements where target is 'all' or user is in target_ids
  const rows = db.prepare(`
    SELECT * FROM announcements
    WHERE target_type = 'all'
      OR (target_type = 'users' AND target_ids LIKE ?)
    ORDER BY created_at DESC
    LIMIT 50
  `).all(`%${userId}%`) as Record<string, unknown>[];

  // Also get match-targeted announcements for user's matches
  const matchRows = db.prepare(`
    SELECT a.* FROM announcements a
    WHERE a.target_type = 'match'
      AND EXISTS (
        SELECT 1 FROM matches m
        WHERE a.target_ids LIKE '%' || m.match_id || '%'
          AND (m.player_a_user_id = ? OR m.player_b_user_id = ?)
      )
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all(userId, userId) as Record<string, unknown>[];

  const allAnnouncements = [...rows, ...matchRows]
    .sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string))
    .slice(0, 50);

  res.json({ announcements: allAnnouncements });
});

export default router;

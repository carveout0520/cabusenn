import { Router, Request, Response } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /results/leaderboard - Aggregated win/loss stats per player
router.get('/leaderboard', authenticate, (_req: Request, res: Response) => {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      u.user_id,
      u.nickname,
      u.avatar_url,
      u.tiktok_username,
      COALESCE(wins.count, 0) as wins,
      COALESCE(losses.count, 0) as losses,
      COALESCE(total.count, 0) as total_matches
    FROM users u
    LEFT JOIN (
      SELECT r.winner_user_id as user_id, COUNT(*) as count
      FROM results r
      WHERE r.is_public = 1 AND r.winner_user_id IS NOT NULL
      GROUP BY r.winner_user_id
    ) wins ON u.user_id = wins.user_id
    LEFT JOIN (
      SELECT
        CASE
          WHEN r.winner_user_id = m.player_a_user_id THEN m.player_b_user_id
          ELSE m.player_a_user_id
        END as user_id,
        COUNT(*) as count
      FROM results r
      JOIN matches m ON r.match_id = m.match_id
      WHERE r.is_public = 1 AND r.winner_user_id IS NOT NULL
      GROUP BY user_id
    ) losses ON u.user_id = losses.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as count FROM (
        SELECT player_a_user_id as user_id FROM matches WHERE status = 'finished'
        UNION ALL
        SELECT player_b_user_id as user_id FROM matches WHERE status = 'finished'
      ) GROUP BY user_id
    ) total ON u.user_id = total.user_id
    WHERE u.role = 'liver' AND COALESCE(total.count, 0) > 0
    ORDER BY wins DESC, losses ASC, u.nickname ASC
  `).all();

  res.json({ leaderboard: stats });
});

// GET /results/history - Recent finished matches with public results
router.get('/history', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { limit: limitStr, offset: offsetStr } = req.query;
  const limit = Math.min(parseInt(limitStr as string) || 30, 100);
  const offset = parseInt(offsetStr as string) || 0;

  const rows = db.prepare(`
    SELECT m.match_id, m.event_date, m.event_round,
      m.player_a_user_id, m.player_b_user_id,
      m.confirmed_time_start, m.confirmed_time_end,
      ua.nickname as pa_nickname, ua.avatar_url as pa_avatar_url, ua.tiktok_username as pa_tiktok_username,
      ub.nickname as pb_nickname, ub.avatar_url as pb_avatar_url, ub.tiktok_username as pb_tiktok_username,
      r.winner_user_id
    FROM matches m
    JOIN users ua ON m.player_a_user_id = ua.user_id
    JOIN users ub ON m.player_b_user_id = ub.user_id
    JOIN results r ON m.match_id = r.match_id
    WHERE m.status = 'finished' AND r.is_public = 1
    ORDER BY m.event_date DESC, m.confirmed_time_start DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Record<string, unknown>[];

  const total = (db.prepare(`
    SELECT COUNT(*) as count
    FROM matches m
    JOIN results r ON m.match_id = r.match_id
    WHERE m.status = 'finished' AND r.is_public = 1
  `).get() as { count: number }).count;

  const history = rows.map(row => ({
    match_id: row.match_id,
    event_date: row.event_date,
    event_round: row.event_round,
    player_a: {
      user_id: row.player_a_user_id,
      nickname: row.pa_nickname,
      avatar_url: row.pa_avatar_url,
      tiktok_username: row.pa_tiktok_username,
    },
    player_b: {
      user_id: row.player_b_user_id,
      nickname: row.pb_nickname,
      avatar_url: row.pb_avatar_url,
      tiktok_username: row.pb_tiktok_username,
    },
    winner_user_id: row.winner_user_id,
    confirmed_time_start: row.confirmed_time_start,
    confirmed_time_end: row.confirmed_time_end,
  }));

  res.json({ history, total, limit, offset });
});

export default router;

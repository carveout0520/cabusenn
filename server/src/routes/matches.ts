import { Router, Request, Response } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import type { MatchWithPlayers } from '../types/index.js';

const router = Router();

// GET /matches - List matches with optional filters
router.get('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { scope, date_from, date_to, q } = req.query;
  const userId = req.user!.user_id;

  let sql = `
    SELECT m.*,
      ua.user_id as pa_user_id, ua.nickname as pa_nickname, ua.avatar_url as pa_avatar_url, ua.tiktok_username as pa_tiktok_username,
      ub.user_id as pb_user_id, ub.nickname as pb_nickname, ub.avatar_url as pb_avatar_url, ub.tiktok_username as pb_tiktok_username,
      r.winner_user_id as r_winner_user_id, r.is_public as r_is_public
    FROM matches m
    JOIN users ua ON m.player_a_user_id = ua.user_id
    JOIN users ub ON m.player_b_user_id = ub.user_id
    LEFT JOIN results r ON m.match_id = r.match_id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (scope === 'mine') {
    conditions.push('(m.player_a_user_id = ? OR m.player_b_user_id = ?)');
    params.push(userId, userId);
  }
  if (date_from) {
    conditions.push('m.event_date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('m.event_date <= ?');
    params.push(date_to);
  }
  if (q && typeof q === 'string' && q.trim()) {
    conditions.push('(ua.nickname LIKE ? OR ub.nickname LIKE ? OR ua.invite_id LIKE ? OR ub.invite_id LIKE ?)');
    const pattern = `%${q.trim()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY m.event_date DESC, m.confirmed_time_start ASC';

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  const matches: MatchWithPlayers[] = rows.map(row => ({
    match_id: row.match_id as string,
    event_date: row.event_date as string,
    event_round: row.event_round as number,
    player_a_user_id: row.player_a_user_id as string,
    player_b_user_id: row.player_b_user_id as string,
    status: row.status as MatchWithPlayers['status'],
    confirmed_time_start: row.confirmed_time_start as string | null,
    confirmed_time_end: row.confirmed_time_end as string | null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    player_a: {
      user_id: row.pa_user_id as string,
      nickname: row.pa_nickname as string,
      avatar_url: row.pa_avatar_url as string | null,
      tiktok_username: row.pa_tiktok_username as string | null,
    },
    player_b: {
      user_id: row.pb_user_id as string,
      nickname: row.pb_nickname as string,
      avatar_url: row.pb_avatar_url as string | null,
      tiktok_username: row.pb_tiktok_username as string | null,
    },
    result: row.r_winner_user_id !== undefined ? {
      winner_user_id: row.r_winner_user_id as string | null,
      is_public: Boolean(row.r_is_public),
    } : null,
  }));

  res.json({ matches });
});

// GET /matches/:match_id - Get single match detail
router.get('/:match_id', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;

  const row = db.prepare(`
    SELECT m.*,
      ua.user_id as pa_user_id, ua.nickname as pa_nickname, ua.avatar_url as pa_avatar_url, ua.tiktok_username as pa_tiktok_username,
      ub.user_id as pb_user_id, ub.nickname as pb_nickname, ub.avatar_url as pb_avatar_url, ub.tiktok_username as pb_tiktok_username,
      r.winner_user_id as r_winner_user_id, r.is_public as r_is_public
    FROM matches m
    JOIN users ua ON m.player_a_user_id = ua.user_id
    JOIN users ub ON m.player_b_user_id = ub.user_id
    LEFT JOIN results r ON m.match_id = r.match_id
    WHERE m.match_id = ?
  `).get(match_id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const match: MatchWithPlayers = {
    match_id: row.match_id as string,
    event_date: row.event_date as string,
    event_round: row.event_round as number,
    player_a_user_id: row.player_a_user_id as string,
    player_b_user_id: row.player_b_user_id as string,
    status: row.status as MatchWithPlayers['status'],
    confirmed_time_start: row.confirmed_time_start as string | null,
    confirmed_time_end: row.confirmed_time_end as string | null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    player_a: {
      user_id: row.pa_user_id as string,
      nickname: row.pa_nickname as string,
      avatar_url: row.pa_avatar_url as string | null,
      tiktok_username: row.pa_tiktok_username as string | null,
    },
    player_b: {
      user_id: row.pb_user_id as string,
      nickname: row.pb_nickname as string,
      avatar_url: row.pb_avatar_url as string | null,
      tiktok_username: row.pb_tiktok_username as string | null,
    },
    result: row.r_winner_user_id !== undefined ? {
      winner_user_id: row.r_winner_user_id as string | null,
      is_public: Boolean(row.r_is_public),
    } : null,
  };

  res.json({ match });
});

export default router;

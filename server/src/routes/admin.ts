import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import multer from 'multer';
import { getDb } from '../models/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { broadcastToMatch } from '../services/websocket.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// ============================================================
// Match Management
// ============================================================

// POST /admin/matches/import_csv
router.post('/matches/import_csv', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'CSV file is required' });
    return;
  }

  const db = getDb();
  const adminId = req.user!.user_id;
  const csvContent = req.file.buffer.toString('utf-8');

  let records: Record<string, string>[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse CSV', detail: String(err) });
    return;
  }

  const results: { success: number; errors: string[] } = { success: 0, errors: [] };

  const insertMatch = db.prepare(`
    INSERT INTO matches (match_id, event_date, event_round, player_a_user_id, player_b_user_id, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const findUser = db.prepare('SELECT user_id FROM users WHERE invite_id = ? OR nickname = ?');

  const insertTransaction = db.transaction(() => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-indexed + header

      const eventDate = row.event_date;
      const eventRound = parseInt(row.event_round) || 0;
      const playerAId = row.player_a_identifier;
      const playerBId = row.player_b_identifier;

      if (!eventDate || !playerAId || !playerBId) {
        results.errors.push(`Row ${rowNum}: Missing required fields`);
        continue;
      }

      const playerA = findUser.get(playerAId, playerAId) as { user_id: string } | undefined;
      const playerB = findUser.get(playerBId, playerBId) as { user_id: string } | undefined;

      if (!playerA) {
        results.errors.push(`Row ${rowNum}: Player A '${playerAId}' not found`);
        continue;
      }
      if (!playerB) {
        results.errors.push(`Row ${rowNum}: Player B '${playerBId}' not found`);
        continue;
      }

      const matchId = uuidv4();
      insertMatch.run(matchId, eventDate, eventRound, playerA.user_id, playerB.user_id, row.status || 'pending', adminId);
      results.success++;
    }
  });

  insertTransaction();

  logAudit(adminId, 'import_csv', 'matches', 'bulk', JSON.stringify({ success: results.success, errors: results.errors.length }));

  res.json({
    message: `Imported ${results.success} matches`,
    ...results,
  });
});

// GET /admin/matches/template_csv
router.get('/matches/template_csv', (_req: Request, res: Response) => {
  const template = stringify([
    { event_date: '2026-02-23', event_round: '12', player_a_identifier: 'user_invite_id_or_nickname', player_b_identifier: 'user_invite_id_or_nickname', status: 'pending', memo: '' },
  ], {
    header: true,
    columns: ['event_date', 'event_round', 'player_a_identifier', 'player_b_identifier', 'status', 'memo'],
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=match_template_v1.csv');
  res.send(template);
});

// PATCH /admin/matches/:match_id
router.patch('/matches/:match_id', (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;
  const adminId = req.user!.user_id;
  const { status, confirmed_time_start, confirmed_time_end, event_date, event_round } = req.body;

  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id);
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (confirmed_time_start !== undefined) {
    updates.push('confirmed_time_start = ?');
    params.push(confirmed_time_start);
  }
  if (confirmed_time_end !== undefined) {
    updates.push('confirmed_time_end = ?');
    params.push(confirmed_time_end);
  }
  if (event_date) {
    updates.push('event_date = ?');
    params.push(event_date);
  }
  if (event_round !== undefined) {
    updates.push('event_round = ?');
    params.push(event_round);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push("updated_at = datetime('now')");
  params.push(match_id);

  db.prepare(`UPDATE matches SET ${updates.join(', ')} WHERE match_id = ?`).run(...params);

  logAudit(adminId, 'update_match', 'match', match_id, JSON.stringify(req.body));

  // Broadcast update to players
  broadcastToMatch(match_id, {
    type: 'match_updated',
    data: { match_id, ...req.body },
  });

  res.json({ message: 'Match updated' });
});

// DELETE /admin/matches/:match_id
router.delete('/matches/:match_id', (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;
  const adminId = req.user!.user_id;

  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id);
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  db.prepare('DELETE FROM messages WHERE match_id = ?').run(match_id);
  db.prepare('DELETE FROM availability WHERE match_id = ?').run(match_id);
  db.prepare('DELETE FROM schedule_decisions WHERE match_id = ?').run(match_id);
  db.prepare('DELETE FROM results WHERE match_id = ?').run(match_id);
  db.prepare('DELETE FROM matches WHERE match_id = ?').run(match_id);

  logAudit(adminId, 'delete_match', 'match', match_id, '');

  res.json({ message: 'Match deleted' });
});

// ============================================================
// User Management
// ============================================================

// GET /admin/users
router.get('/users', (_req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// POST /admin/users
router.post('/users', (req: Request, res: Response) => {
  const db = getDb();
  const adminId = req.user!.user_id;
  const { invite_id, nickname, avatar_url, tiktok_username, role } = req.body;

  if (!invite_id || !nickname) {
    res.status(400).json({ error: 'invite_id and nickname are required' });
    return;
  }

  const existing = db.prepare('SELECT user_id FROM users WHERE invite_id = ?').get(invite_id);
  if (existing) {
    res.status(409).json({ error: 'invite_id already exists' });
    return;
  }

  const userId = uuidv4();
  db.prepare(`
    INSERT INTO users (user_id, invite_id, nickname, avatar_url, tiktok_username, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, invite_id, nickname, avatar_url || null, tiktok_username || null, role || 'liver');

  logAudit(adminId, 'create_user', 'user', userId, JSON.stringify({ invite_id, nickname }));

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  res.status(201).json({ user });
});

// ============================================================
// Results
// ============================================================

// POST /admin/results
router.post('/results', (req: Request, res: Response) => {
  const db = getDb();
  const adminId = req.user!.user_id;
  const { match_id, winner_user_id, is_public, memo_private } = req.body;

  if (!match_id) {
    res.status(400).json({ error: 'match_id is required' });
    return;
  }

  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id);
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  // Upsert result
  const existing = db.prepare('SELECT * FROM results WHERE match_id = ?').get(match_id);
  const resultId = existing ? (existing as Record<string, unknown>).result_id as string : uuidv4();

  if (existing) {
    db.prepare(`
      UPDATE results SET winner_user_id = ?, is_public = ?, memo_private = ?, updated_by = ?, updated_at = datetime('now')
      WHERE match_id = ?
    `).run(winner_user_id || null, is_public ? 1 : 0, memo_private || null, adminId, match_id);
  } else {
    db.prepare(`
      INSERT INTO results (result_id, match_id, winner_user_id, is_public, memo_private, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(resultId, match_id, winner_user_id || null, is_public ? 1 : 0, memo_private || null, adminId);
  }

  // Update match status to finished
  db.prepare("UPDATE matches SET status = 'finished', updated_at = datetime('now') WHERE match_id = ?").run(match_id);

  logAudit(adminId, 'record_result', 'result', resultId, JSON.stringify({ match_id, winner_user_id }));

  res.json({ message: 'Result recorded', result_id: resultId });
});

// ============================================================
// Announcements
// ============================================================

// GET /admin/announcements
router.get('/announcements', (_req: Request, res: Response) => {
  const db = getDb();
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100').all();
  res.json({ announcements });
});

// POST /admin/announcements
router.post('/announcements', (req: Request, res: Response) => {
  const db = getDb();
  const adminId = req.user!.user_id;
  const { title, body, target_type, target_ids } = req.body;

  if (!title || !body) {
    res.status(400).json({ error: 'title and body are required' });
    return;
  }

  const announcementId = uuidv4();
  db.prepare(`
    INSERT INTO announcements (announcement_id, title, body, target_type, target_ids, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(announcementId, title, body, target_type || 'all', target_ids ? JSON.stringify(target_ids) : null, adminId);

  logAudit(adminId, 'create_announcement', 'announcement', announcementId, title);

  res.status(201).json({ message: 'Announcement created', announcement_id: announcementId });
});

// ============================================================
// Audit Logs
// ============================================================

// GET /admin/audit_logs
router.get('/audit_logs', (req: Request, res: Response) => {
  const db = getDb();
  const { limit: limitStr, offset: offsetStr } = req.query;
  const limit = Math.min(parseInt(limitStr as string) || 50, 200);
  const offset = parseInt(offsetStr as string) || 0;

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number }).count;

  res.json({ logs, total, limit, offset });
});

export default router;

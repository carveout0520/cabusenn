import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { broadcastToMatch } from '../services/websocket.js';

const router = Router({ mergeParams: true });

// GET /matches/:match_id/messages
router.get('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;
  const { before, limit: limitStr } = req.query;
  const limit = Math.min(parseInt(limitStr as string) || 50, 100);

  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id) as Record<string, unknown> | undefined;
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  let sql = `
    SELECT msg.*, u.nickname as sender_nickname, u.avatar_url as sender_avatar_url
    FROM messages msg
    JOIN users u ON msg.sender_user_id = u.user_id
    WHERE msg.match_id = ?
  `;
  const params: unknown[] = [match_id];

  if (before) {
    sql += ' AND msg.created_at < ?';
    params.push(before);
  }
  sql += ' ORDER BY msg.created_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  const messages = rows.reverse().map(row => ({
    ...row,
    payload: row.payload ? JSON.parse(row.payload as string) : null,
  }));

  res.json({ messages });
});

// POST /matches/:match_id/messages
router.post('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;
  const userId = req.user!.user_id;
  const { type, body, payload } = req.body;

  if (!body && type === 'text') {
    res.status(400).json({ error: 'Message body is required' });
    return;
  }

  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id) as Record<string, unknown> | undefined;
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  if (match.player_a_user_id !== userId && match.player_b_user_id !== userId) {
    res.status(403).json({ error: 'You are not a participant of this match' });
    return;
  }

  const messageId = uuidv4();
  const payloadJson = payload ? JSON.stringify(payload) : null;

  db.prepare(`
    INSERT INTO messages (message_id, match_id, sender_user_id, type, body, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(messageId, match_id, userId, type || 'text', body || '', payloadJson);

  const sender = db.prepare('SELECT nickname, avatar_url FROM users WHERE user_id = ?').get(userId) as Record<string, unknown>;

  const message = {
    message_id: messageId,
    match_id,
    sender_user_id: userId,
    sender_nickname: sender.nickname,
    sender_avatar_url: sender.avatar_url,
    type: type || 'text',
    body: body || '',
    payload: payload || null,
    created_at: new Date().toISOString(),
  };

  // Broadcast via WebSocket
  broadcastToMatch(match_id, { type: 'new_message', data: message });

  res.status(201).json({ message });
});

// POST /matches/:match_id/schedule/approve
router.post('/schedule/approve', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;
  const userId = req.user!.user_id;
  const { decided_time } = req.body;

  if (!decided_time) {
    res.status(400).json({ error: 'decided_time is required' });
    return;
  }

  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id) as Record<string, unknown> | undefined;
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  if (match.player_a_user_id !== userId && match.player_b_user_id !== userId) {
    res.status(403).json({ error: 'You are not a participant of this match' });
    return;
  }
  if (match.status === 'confirmed') {
    res.status(400).json({ error: 'Match time is already confirmed' });
    return;
  }

  // Determine the proposer (the other player)
  const proposerUserId = match.player_a_user_id === userId
    ? match.player_b_user_id as string
    : match.player_a_user_id as string;

  const decisionId = uuidv4();

  // Create decision record
  db.prepare(`
    INSERT INTO schedule_decisions (decision_id, match_id, proposer_user_id, approver_user_id, decided_time)
    VALUES (?, ?, ?, ?, ?)
  `).run(decisionId, match_id, proposerUserId, userId, decided_time);

  // Update match status and confirmed time
  db.prepare(`
    UPDATE matches SET status = 'confirmed', confirmed_time_start = ?, updated_at = datetime('now')
    WHERE match_id = ?
  `).run(decided_time, match_id);

  // Add system message
  const systemMsgId = uuidv4();
  const approver = db.prepare('SELECT nickname FROM users WHERE user_id = ?').get(userId) as Record<string, unknown>;
  db.prepare(`
    INSERT INTO messages (message_id, match_id, sender_user_id, type, body, payload)
    VALUES (?, ?, ?, 'system', ?, ?)
  `).run(
    systemMsgId, match_id, userId,
    `対戦時間が ${decided_time} に確定しました`,
    JSON.stringify({ action: 'schedule_confirmed', decided_time, approver: approver.nickname })
  );

  logAudit(userId, 'approve_schedule', 'match', match_id, JSON.stringify({ decided_time }));

  // Broadcast via WebSocket
  broadcastToMatch(match_id, {
    type: 'schedule_confirmed',
    data: { match_id, decided_time, approver_user_id: userId },
  });

  res.json({
    message: 'Schedule confirmed',
    decision: { decision_id: decisionId, match_id, decided_time },
  });
});

export default router;

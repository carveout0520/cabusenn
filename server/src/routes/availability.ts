import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { broadcastToMatch } from '../services/websocket.js';

const router = Router({ mergeParams: true });

// GET /matches/:match_id/availability
router.get('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;

  // Verify match exists and user is a participant
  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id) as Record<string, unknown> | undefined;
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const rows = db.prepare('SELECT * FROM availability WHERE match_id = ?').all(match_id) as Record<string, unknown>[];
  const availability = rows.map(row => ({
    ...row,
    candidate_slots: JSON.parse(row.candidate_slots as string),
  }));

  // Check for overlapping slots
  if (availability.length === 2) {
    const slotsA = new Set(availability[0].candidate_slots as string[]);
    const slotsB = availability[1].candidate_slots as string[];
    const overlapping = slotsB.filter((s: string) => slotsA.has(s));
    res.json({ availability, overlapping_slots: overlapping });
    return;
  }

  res.json({ availability, overlapping_slots: [] });
});

// POST /matches/:match_id/availability
router.post('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { match_id } = req.params;
  const userId = req.user!.user_id;
  const { candidate_slots } = req.body;

  if (!Array.isArray(candidate_slots) || candidate_slots.length === 0) {
    res.status(400).json({ error: 'candidate_slots must be a non-empty array of time strings' });
    return;
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  for (const slot of candidate_slots) {
    if (!timeRegex.test(slot)) {
      res.status(400).json({ error: `Invalid time format: ${slot}. Expected HH:MM` });
      return;
    }
    const hour = parseInt(slot.split(':')[0]);
    if (hour < 19 || hour >= 24) {
      res.status(400).json({ error: `Time must be between 19:00 and 24:00. Got: ${slot}` });
      return;
    }
  }

  // Verify match exists and user is a participant
  const match = db.prepare('SELECT * FROM matches WHERE match_id = ?').get(match_id) as Record<string, unknown> | undefined;
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  if (match.player_a_user_id !== userId && match.player_b_user_id !== userId) {
    res.status(403).json({ error: 'You are not a participant of this match' });
    return;
  }

  // Upsert availability
  const existingAvail = db.prepare('SELECT * FROM availability WHERE match_id = ? AND user_id = ?').get(match_id, userId);
  const slotsJson = JSON.stringify(candidate_slots);

  if (existingAvail) {
    db.prepare(`
      UPDATE availability SET candidate_slots = ?, submitted_at = datetime('now')
      WHERE match_id = ? AND user_id = ?
    `).run(slotsJson, match_id, userId);
  } else {
    db.prepare(`
      INSERT INTO availability (availability_id, match_id, user_id, candidate_slots)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), match_id, userId, slotsJson);
  }

  // Update match status to scheduling if still pending
  if (match.status === 'pending') {
    db.prepare("UPDATE matches SET status = 'scheduling', updated_at = datetime('now') WHERE match_id = ?").run(match_id);
  }

  logAudit(userId, 'submit_availability', 'match', match_id, slotsJson);

  // Check if both have submitted and find overlapping slots
  const allAvail = db.prepare('SELECT * FROM availability WHERE match_id = ?').all(match_id) as Record<string, unknown>[];
  let overlapping: string[] = [];
  if (allAvail.length === 2) {
    const slotsA = new Set(JSON.parse(allAvail[0].candidate_slots as string) as string[]);
    const slotsB = JSON.parse(allAvail[1].candidate_slots as string) as string[];
    overlapping = slotsB.filter((s: string) => slotsA.has(s));
  }

  // Broadcast availability update to the other player
  broadcastToMatch(match_id, {
    type: 'availability_updated',
    data: {
      match_id,
      user_id: userId,
      both_submitted: allAvail.length === 2,
      overlapping_slots: overlapping,
    },
  });

  res.json({
    message: 'Availability submitted',
    candidate_slots,
    both_submitted: allAvail.length === 2,
    overlapping_slots: overlapping,
  });
});

export default router;

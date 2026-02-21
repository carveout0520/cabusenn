import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';

export function logAudit(
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (log_id, actor_user_id, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), actorUserId, action, targetType, targetId, details || null);
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/cabusenn.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const d = getDb();

  // Base schema (v0)
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      invite_id TEXT UNIQUE NOT NULL,
      nickname TEXT NOT NULL,
      avatar_url TEXT,
      tiktok_username TEXT,
      tiktok_open_id TEXT UNIQUE,
      tiktok_union_id TEXT,
      tiktok_access_token TEXT,
      tiktok_refresh_token TEXT,
      tiktok_token_expires_at TEXT,
      role TEXT NOT NULL DEFAULT 'liver' CHECK(role IN ('liver', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      match_id TEXT PRIMARY KEY,
      event_date TEXT NOT NULL,
      event_round INTEGER NOT NULL DEFAULT 0,
      player_a_user_id TEXT NOT NULL REFERENCES users(user_id),
      player_b_user_id TEXT NOT NULL REFERENCES users(user_id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','scheduling','confirmed','finished','canceled')),
      confirmed_time_start TEXT,
      confirmed_time_end TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS availability (
      availability_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id),
      user_id TEXT NOT NULL REFERENCES users(user_id),
      candidate_slots TEXT NOT NULL DEFAULT '[]',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(match_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id),
      sender_user_id TEXT NOT NULL REFERENCES users(user_id),
      type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','schedule_proposal','schedule_approve','system')),
      body TEXT NOT NULL DEFAULT '',
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_decisions (
      decision_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id),
      proposer_user_id TEXT NOT NULL REFERENCES users(user_id),
      approver_user_id TEXT NOT NULL REFERENCES users(user_id),
      decided_time TEXT NOT NULL,
      decided_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      announcement_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all','match','users')),
      target_ids TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS results (
      result_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL UNIQUE REFERENCES matches(match_id),
      winner_user_id TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      memo_private TEXT,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      log_id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_matches_event_date ON matches(event_date);
    CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches(player_a_user_id);
    CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches(player_b_user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(match_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_availability_match ON availability(match_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
  `);

  // Run migrations
  runMigrations(d);
}

// ============================================================
// Migration System
// ============================================================
// Uses SQLite user_version pragma to track schema version.
// Each migration is run exactly once, in order.

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Add TikTok OAuth columns to users (idempotent)',
    up: (d) => {
      // These columns are now in the base schema, but for existing DBs
      // that were created before TikTok integration, add them if missing.
      const cols = d.prepare("PRAGMA table_info(users)").all() as { name: string }[];
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('tiktok_open_id')) {
        d.exec('ALTER TABLE users ADD COLUMN tiktok_open_id TEXT UNIQUE');
      }
      if (!colNames.has('tiktok_union_id')) {
        d.exec('ALTER TABLE users ADD COLUMN tiktok_union_id TEXT');
      }
      if (!colNames.has('tiktok_access_token')) {
        d.exec('ALTER TABLE users ADD COLUMN tiktok_access_token TEXT');
      }
      if (!colNames.has('tiktok_refresh_token')) {
        d.exec('ALTER TABLE users ADD COLUMN tiktok_refresh_token TEXT');
      }
      if (!colNames.has('tiktok_token_expires_at')) {
        d.exec('ALTER TABLE users ADD COLUMN tiktok_token_expires_at TEXT');
      }
    },
  },
  // Add future migrations here with incrementing version numbers
];

function runMigrations(d: Database.Database): void {
  const currentVersion = (d.pragma('user_version', { simple: true }) as number) || 0;

  const pending = migrations.filter(m => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    console.log(`Running migration v${migration.version}: ${migration.description}`);
    d.transaction(() => {
      migration.up(d);
      d.pragma(`user_version = ${migration.version}`);
    })();
  }

  console.log(`Migrations complete. Schema version: ${pending[pending.length - 1].version}`);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}

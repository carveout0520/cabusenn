/**
 * Seed script: Creates sample data for development and testing.
 * Run with: npm run db:seed (from server/)
 */
import { v4 as uuidv4 } from 'uuid';
import { initDb, getDb, closeDb } from './models/database.js';

initDb();
const db = getDb();

console.log('Seeding database...');

// Create users
const users = [
  { user_id: uuidv4(), invite_id: 'admin001', nickname: '運営太郎', role: 'admin' },
  { user_id: uuidv4(), invite_id: 'liver001', nickname: 'とうふ', tiktok_username: 'toufu_live' },
  { user_id: uuidv4(), invite_id: 'liver002', nickname: 'つぼみ', tiktok_username: 'tsubomi_live' },
  { user_id: uuidv4(), invite_id: 'liver003', nickname: 'さくら', tiktok_username: 'sakura_live' },
  { user_id: uuidv4(), invite_id: 'liver004', nickname: 'ひまわり', tiktok_username: 'himawari_live' },
  { user_id: uuidv4(), invite_id: 'liver005', nickname: 'すみれ', tiktok_username: 'sumire_live' },
  { user_id: uuidv4(), invite_id: 'liver006', nickname: 'あさがお', tiktok_username: 'asagao_live' },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (user_id, invite_id, nickname, avatar_url, tiktok_username, role)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const u of users) {
  insertUser.run(
    u.user_id,
    u.invite_id,
    u.nickname,
    null,
    u.tiktok_username || null,
    u.role || 'liver'
  );
}
console.log(`Created ${users.length} users`);

// Create matches
const adminUser = users[0];
const matchData = [
  { event_date: '2026-02-23', event_round: 12, a: 1, b: 2, status: 'scheduling' },
  { event_date: '2026-02-23', event_round: 12, a: 3, b: 4, status: 'pending' },
  { event_date: '2026-02-23', event_round: 12, a: 5, b: 6, status: 'pending' },
  { event_date: '2026-02-25', event_round: 13, a: 1, b: 4, status: 'pending' },
  { event_date: '2026-02-25', event_round: 13, a: 2, b: 5, status: 'pending' },
  { event_date: '2026-02-25', event_round: 13, a: 3, b: 6, status: 'pending' },
  { event_date: '2026-02-27', event_round: 14, a: 1, b: 6, status: 'pending' },
  { event_date: '2026-02-27', event_round: 14, a: 2, b: 3, status: 'confirmed', time: '20:00' },
  { event_date: '2026-02-20', event_round: 11, a: 1, b: 3, status: 'finished', time: '21:00' },
  { event_date: '2026-02-20', event_round: 11, a: 2, b: 4, status: 'finished', time: '19:30' },
];

const insertMatch = db.prepare(`
  INSERT OR IGNORE INTO matches (match_id, event_date, event_round, player_a_user_id, player_b_user_id, status, confirmed_time_start, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const matchIds: string[] = [];
for (const m of matchData) {
  const matchId = uuidv4();
  matchIds.push(matchId);
  insertMatch.run(
    matchId,
    m.event_date,
    m.event_round,
    users[m.a].user_id,
    users[m.b].user_id,
    m.status,
    m.time || null,
    adminUser.user_id
  );
}
console.log(`Created ${matchData.length} matches`);

// Create some results for finished matches
const insertResult = db.prepare(`
  INSERT OR IGNORE INTO results (result_id, match_id, winner_user_id, is_public, memo_private, updated_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertResult.run(uuidv4(), matchIds[8], users[1].user_id, 1, 'とうふ勝利', adminUser.user_id);
insertResult.run(uuidv4(), matchIds[9], users[4].user_id, 1, 'ひまわり勝利', adminUser.user_id);
console.log('Created 2 results');

// Create some availability for the scheduling match
const insertAvail = db.prepare(`
  INSERT OR IGNORE INTO availability (availability_id, match_id, user_id, candidate_slots)
  VALUES (?, ?, ?, ?)
`);

insertAvail.run(uuidv4(), matchIds[0], users[1].user_id, JSON.stringify(['19:00', '19:30', '20:00', '20:30']));
insertAvail.run(uuidv4(), matchIds[0], users[2].user_id, JSON.stringify(['20:00', '20:30', '21:00', '21:30']));
console.log('Created availability entries');

// Create some chat messages for the scheduling match
const insertMsg = db.prepare(`
  INSERT INTO messages (message_id, match_id, sender_user_id, type, body, payload)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertMsg.run(uuidv4(), matchIds[0], users[1].user_id, 'schedule_proposal', '候補時間を送りました', JSON.stringify({ slots: ['19:00', '19:30', '20:00', '20:30'] }));
insertMsg.run(uuidv4(), matchIds[0], users[2].user_id, 'schedule_proposal', '候補時間を送りました', JSON.stringify({ slots: ['20:00', '20:30', '21:00', '21:30'] }));
insertMsg.run(uuidv4(), matchIds[0], users[1].user_id, 'text', 'こんにちは！20:00か20:30でどうですか？', null);
insertMsg.run(uuidv4(), matchIds[0], users[2].user_id, 'text', '20:00でお願いします！', null);

console.log('Created sample messages');

// Create an announcement
db.prepare(`
  INSERT INTO announcements (announcement_id, title, body, target_type, created_by)
  VALUES (?, ?, ?, ?, ?)
`).run(uuidv4(), '第12回カブ戦のお知らせ', '2/23（月）の対戦カードが確定しました。チャットで時間調整をお願いします。', 'all', adminUser.user_id);

console.log('Created announcement');
console.log('\n=== Seed complete ===');
console.log('\nLogin credentials:');
for (const u of users) {
  console.log(`  ${u.nickname} (${u.role || 'liver'}): invite_id = ${u.invite_id}`);
}

closeDb();

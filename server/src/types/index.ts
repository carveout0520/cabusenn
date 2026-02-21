// ============================================================
// Domain Types
// ============================================================

export type UserRole = 'liver' | 'admin';

export interface User {
  user_id: string;
  invite_id: string;
  nickname: string;
  avatar_url: string | null;
  tiktok_username: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type MatchStatus = 'pending' | 'scheduling' | 'confirmed' | 'finished' | 'canceled';

export interface Match {
  match_id: string;
  event_date: string;       // YYYY-MM-DD
  event_round: number;
  player_a_user_id: string;
  player_b_user_id: string;
  status: MatchStatus;
  confirmed_time_start: string | null;  // HH:MM
  confirmed_time_end: string | null;    // HH:MM
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  availability_id: string;
  match_id: string;
  user_id: string;
  candidate_slots: string[];  // JSON array of HH:MM strings
  submitted_at: string;
}

export type MessageType = 'text' | 'schedule_proposal' | 'schedule_approve' | 'system';

export interface Message {
  message_id: string;
  match_id: string;
  sender_user_id: string;
  type: MessageType;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ScheduleDecision {
  decision_id: string;
  match_id: string;
  proposer_user_id: string;
  approver_user_id: string;
  decided_time: string;  // HH:MM
  decided_at: string;
}

export interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  target_type: 'all' | 'match' | 'users';
  target_ids: string | null;  // JSON array of match_ids or user_ids
  created_by: string;
  created_at: string;
}

export interface Result {
  result_id: string;
  match_id: string;
  winner_user_id: string | null;
  is_public: boolean;
  memo_private: string | null;
  updated_by: string;
  updated_at: string;
}

export interface AuditLog {
  log_id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string | null;
  created_at: string;
}

// ============================================================
// API Types
// ============================================================

export interface AuthLoginRequest {
  invite_id: string;
}

export interface AuthLoginResponse {
  token: string;
  user: User;
}

export interface MatchWithPlayers extends Match {
  player_a: Pick<User, 'user_id' | 'nickname' | 'avatar_url' | 'tiktok_username'>;
  player_b: Pick<User, 'user_id' | 'nickname' | 'avatar_url' | 'tiktok_username'>;
  result?: { winner_user_id: string | null; is_public: boolean } | null;
}

export interface AvailabilitySubmitRequest {
  candidate_slots: string[];
}

export interface SendMessageRequest {
  type: MessageType;
  body: string;
  payload?: Record<string, unknown>;
}

export interface ScheduleApproveRequest {
  decided_time: string;
}

export interface AnnouncementCreateRequest {
  title: string;
  body: string;
  target_type: 'all' | 'match' | 'users';
  target_ids?: string[];
}

export interface ResultCreateRequest {
  match_id: string;
  winner_user_id: string | null;
  is_public: boolean;
  memo_private?: string;
}

export interface JwtPayload {
  user_id: string;
  role: UserRole;
}

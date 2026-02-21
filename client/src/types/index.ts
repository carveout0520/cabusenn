export type UserRole = 'liver' | 'admin';
export type MatchStatus = 'pending' | 'scheduling' | 'confirmed' | 'finished' | 'canceled';
export type MessageType = 'text' | 'schedule_proposal' | 'schedule_approve' | 'system';

export interface User {
  user_id: string;
  invite_id: string;
  nickname: string;
  avatar_url: string | null;
  tiktok_username: string | null;
  role: UserRole;
}

export interface PlayerInfo {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  tiktok_username: string | null;
}

export interface MatchResult {
  winner_user_id: string | null;
  is_public: boolean;
}

export interface Match {
  match_id: string;
  event_date: string;
  event_round: number;
  player_a_user_id: string;
  player_b_user_id: string;
  status: MatchStatus;
  confirmed_time_start: string | null;
  confirmed_time_end: string | null;
  player_a: PlayerInfo;
  player_b: PlayerInfo;
  result?: MatchResult | null;
}

export interface Message {
  message_id: string;
  match_id: string;
  sender_user_id: string;
  sender_nickname?: string;
  sender_avatar_url?: string | null;
  type: MessageType;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface Availability {
  availability_id: string;
  match_id: string;
  user_id: string;
  candidate_slots: string[];
  submitted_at: string;
}

export interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  target_type: string;
  created_at: string;
}

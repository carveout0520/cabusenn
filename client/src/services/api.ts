const API_BASE = '/api';

let authToken: string | null = null;

export function setToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('cabusenn_token', token);
  } else {
    localStorage.removeItem('cabusenn_token');
  }
}

export function getToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('cabusenn_token');
  }
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export function login(inviteId: string) {
  return request<{ token: string; user: import('../types').User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ invite_id: inviteId }),
  });
}

export function getMe() {
  return request<{ user: import('../types').User }>('/auth/me');
}

export function getAuthConfig() {
  return request<import('../types').AuthConfig>('/auth/config');
}

// TikTok OAuth
export function tiktokStart() {
  return request<{ authorization_url: string; state: string }>('/auth/tiktok/start', {
    method: 'POST',
  });
}

export function tiktokCallback(code: string, state: string) {
  return request<{ token: string; user: import('../types').User }>('/auth/tiktok/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export function tiktokDisconnect() {
  return request<{ message: string }>('/auth/tiktok/disconnect', {
    method: 'POST',
  });
}

// Matches
export function getMatches(params?: { scope?: string; q?: string; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.q) qs.set('q', params.q);
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  return request<{ matches: import('../types').Match[] }>(`/matches?${qs.toString()}`);
}

export function getMatch(matchId: string) {
  return request<{ match: import('../types').Match }>(`/matches/${matchId}`);
}

// Availability
export function getAvailability(matchId: string) {
  return request<{ availability: import('../types').Availability[]; overlapping_slots: string[] }>(
    `/matches/${matchId}/availability`
  );
}

export function submitAvailability(matchId: string, candidateSlots: string[]) {
  return request(`/matches/${matchId}/availability`, {
    method: 'POST',
    body: JSON.stringify({ candidate_slots: candidateSlots }),
  });
}

// Chat
export function getMessages(matchId: string, before?: string) {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  return request<{ messages: import('../types').Message[] }>(`/matches/${matchId}/messages${qs}`);
}

export function sendMessage(matchId: string, data: { type?: string; body: string; payload?: Record<string, unknown> }) {
  return request<{ message: import('../types').Message }>(`/matches/${matchId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function approveSchedule(matchId: string, decidedTime: string) {
  return request(`/matches/${matchId}/schedule/approve`, {
    method: 'POST',
    body: JSON.stringify({ decided_time: decidedTime }),
  });
}

// Announcements
export function getAnnouncements() {
  return request<{ announcements: import('../types').Announcement[] }>('/announcements');
}

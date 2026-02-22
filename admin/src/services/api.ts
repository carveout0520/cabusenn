const API_BASE = '/api';

let authToken: string | null = null;

export function setAdminToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('cabusenn_admin_token', token);
  } else {
    localStorage.removeItem('cabusenn_admin_token');
  }
}

export function getAdminToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('cabusenn_admin_token');
  }
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export function adminLogin(inviteId: string) {
  return request<{ token: string; user: { user_id: string; nickname: string; role: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ invite_id: inviteId }),
  });
}

// Users
export function getUsers() {
  return request<{ users: unknown[] }>('/admin/users');
}

export function createUser(data: { invite_id: string; nickname: string; tiktok_username?: string; role?: string }) {
  return request<{ user: unknown }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUser(userId: string, data: { nickname?: string; tiktok_username?: string; role?: string; avatar_url?: string }) {
  return request<{ user: unknown }>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUser(userId: string) {
  return request(`/admin/users/${userId}`, { method: 'DELETE' });
}

// Dashboard
export interface DashboardStats {
  users: { total: number; tiktok_linked: number };
  matches: { total: number; upcoming: number; by_status: Record<string, number> };
  recent_activity: { action: string; count: number }[];
}

export function getDashboard() {
  return request<DashboardStats>('/admin/dashboard');
}

// Matches
export function getMatches(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<{ matches: unknown[] }>(`/matches${qs}`);
}

export function updateMatch(matchId: string, data: Record<string, unknown>) {
  return request(`/admin/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteMatch(matchId: string) {
  return request(`/admin/matches/${matchId}`, { method: 'DELETE' });
}

export function importMatchesCsv(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<{ message: string; success: number; errors: string[] }>('/admin/matches/import_csv', {
    method: 'POST',
    body: formData,
  });
}

export function downloadCsvTemplate() {
  const token = getAdminToken();
  return fetch(`${API_BASE}/admin/matches/template_csv`, {
    headers: { 'Authorization': `Bearer ${token}` },
  }).then(res => res.blob());
}

// Results
export function recordResult(data: { match_id: string; winner_user_id: string | null; is_public: boolean; memo_private?: string }) {
  return request('/admin/results', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Announcements
export function getAnnouncements() {
  return request<{ announcements: unknown[] }>('/admin/announcements');
}

export function createAnnouncement(data: { title: string; body: string; target_type?: string; target_ids?: string[] }) {
  return request('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Audit Logs
export function getAuditLogs(params?: { limit?: number; offset?: number; action?: string; target_type?: string; actor?: string; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return request<{ logs: unknown[]; total: number; action_types: string[] }>(`/admin/audit_logs${query ? '?' + query : ''}`);
}

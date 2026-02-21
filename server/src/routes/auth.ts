import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { signToken } from '../middleware/auth.js';
import { isTikTokConfigured } from '../services/tiktok-config.js';
import { generateAuthUrl, exchangeCodeForToken, fetchUserInfo, refreshAccessToken, revokeToken } from '../services/tiktok-oauth.js';
import { logAudit } from '../services/audit.js';
import type { User } from '../types/index.js';

const router = Router();

// In-memory store for OAuth state tokens (CSRF protection)
// In production, use Redis or DB with TTL
const pendingOAuthStates = new Map<string, { createdAt: number }>();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingOAuthStates) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      pendingOAuthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

// ============================================================
// Invite ID Login (existing)
// ============================================================

// POST /auth/login - Login with invite ID
router.post('/login', (req: Request, res: Response) => {
  const { invite_id } = req.body;
  if (!invite_id || typeof invite_id !== 'string') {
    res.status(400).json({ error: 'invite_id is required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE invite_id = ?').get(invite_id) as User | undefined;

  if (!user) {
    res.status(404).json({ error: 'Invalid invite ID. Please contact the administrator.' });
    return;
  }

  const token = signToken({ user_id: user.user_id, role: user.role });
  res.json({ token, user: sanitizeUser(user) });
});

// GET /auth/me - Get current user info
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id) as User | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

// GET /auth/config - Return auth configuration to client
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    tiktok_enabled: isTikTokConfigured(),
    invite_enabled: true,
  });
});

// ============================================================
// TikTok OAuth v2 Flow
// ============================================================

// POST /auth/tiktok/start - Generate authorization URL
router.post('/tiktok/start', (_req: Request, res: Response) => {
  if (!isTikTokConfigured()) {
    res.status(503).json({ error: 'TikTok Login is not configured. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.' });
    return;
  }

  const { url, state } = generateAuthUrl();

  // Store state for CSRF verification
  pendingOAuthStates.set(state, { createdAt: Date.now() });

  res.json({ authorization_url: url, state });
});

// POST /auth/tiktok/callback - Exchange authorization code for token + login/register
router.post('/tiktok/callback', async (req: Request, res: Response) => {
  try {
    if (!isTikTokConfigured()) {
      res.status(503).json({ error: 'TikTok Login is not configured.' });
      return;
    }

    const { code, state } = req.body;

    if (!code || !state) {
      res.status(400).json({ error: 'code and state are required' });
      return;
    }

    // Verify CSRF state
    if (!pendingOAuthStates.has(state)) {
      res.status(400).json({ error: 'Invalid or expired OAuth state. Please try logging in again.' });
      return;
    }
    pendingOAuthStates.delete(state);

    // 1. Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code);

    // 2. Fetch user info from TikTok
    const tiktokUser = await fetchUserInfo(tokenResponse.access_token);

    // 3. Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    // 4. Find or create user
    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE tiktok_open_id = ?')
      .get(tiktokUser.open_id) as User | undefined;

    if (user) {
      // Update existing user's TikTok data
      db.prepare(`
        UPDATE users SET
          nickname = ?,
          avatar_url = ?,
          tiktok_union_id = ?,
          tiktok_access_token = ?,
          tiktok_refresh_token = ?,
          tiktok_token_expires_at = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        tiktokUser.display_name,
        tiktokUser.avatar_url || user.avatar_url,
        tiktokUser.union_id || null,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        expiresAt,
        user.user_id
      );

      // Reload updated user
      user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user.user_id) as User;

      logAudit(user.user_id, 'tiktok_login', 'user', user.user_id, 'Existing user logged in via TikTok');
    } else {
      // Create new user
      const userId = uuidv4();
      const inviteId = `tiktok_${tiktokUser.open_id.slice(0, 12)}`;

      // Extract username from profile_deep_link if available
      // profile_deep_link format: https://www.tiktok.com/@username
      let tiktokUsername: string | null = null;
      if (tiktokUser.profile_deep_link) {
        const match = tiktokUser.profile_deep_link.match(/@([^/?]+)/);
        if (match) tiktokUsername = match[1];
      }

      db.prepare(`
        INSERT INTO users (
          user_id, invite_id, nickname, avatar_url, tiktok_username,
          tiktok_open_id, tiktok_union_id,
          tiktok_access_token, tiktok_refresh_token, tiktok_token_expires_at,
          role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'liver')
      `).run(
        userId,
        inviteId,
        tiktokUser.display_name,
        tiktokUser.avatar_url || null,
        tiktokUsername,
        tiktokUser.open_id,
        tiktokUser.union_id || null,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        expiresAt
      );

      user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as User;

      logAudit(userId, 'tiktok_register', 'user', userId, `New user registered via TikTok: ${tiktokUser.display_name}`);
    }

    // 5. Issue our JWT
    const jwtToken = signToken({ user_id: user.user_id, role: user.role });

    res.json({ token: jwtToken, user: sanitizeUser(user) });
  } catch (err) {
    console.error('TikTok OAuth callback error:', err);
    res.status(500).json({
      error: 'TikTok authentication failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// POST /auth/tiktok/refresh - Refresh TikTok access token
router.post('/tiktok/refresh', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id) as User | undefined;

    if (!user || !user.tiktok_refresh_token) {
      res.status(400).json({ error: 'No TikTok account linked' });
      return;
    }

    const tokenResponse = await refreshAccessToken(user.tiktok_refresh_token);
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    db.prepare(`
      UPDATE users SET
        tiktok_access_token = ?,
        tiktok_refresh_token = ?,
        tiktok_token_expires_at = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(tokenResponse.access_token, tokenResponse.refresh_token, expiresAt, user.user_id);

    logAudit(user.user_id, 'tiktok_token_refresh', 'user', user.user_id, '');

    res.json({ message: 'TikTok token refreshed', expires_at: expiresAt });
  } catch (err) {
    console.error('TikTok token refresh error:', err);
    res.status(500).json({
      error: 'Failed to refresh TikTok token',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

// POST /auth/tiktok/disconnect - Revoke TikTok token and unlink account
router.post('/tiktok/disconnect', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id) as User | undefined;

    if (!user || !user.tiktok_access_token) {
      res.status(400).json({ error: 'No TikTok account linked' });
      return;
    }

    // Revoke token at TikTok
    try {
      await revokeToken(user.tiktok_access_token);
    } catch {
      // Token may already be expired; continue with unlinking
    }

    // Clear TikTok data from user record
    db.prepare(`
      UPDATE users SET
        tiktok_open_id = NULL,
        tiktok_union_id = NULL,
        tiktok_access_token = NULL,
        tiktok_refresh_token = NULL,
        tiktok_token_expires_at = NULL,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(user.user_id);

    logAudit(user.user_id, 'tiktok_disconnect', 'user', user.user_id, '');

    res.json({ message: 'TikTok account disconnected' });
  } catch (err) {
    console.error('TikTok disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect TikTok account' });
  }
});

// ============================================================
// Helpers
// ============================================================

/** Remove sensitive fields before sending user data to client */
function sanitizeUser(user: User): Omit<User, 'tiktok_access_token' | 'tiktok_refresh_token' | 'tiktok_token_expires_at'> {
  const { tiktok_access_token, tiktok_refresh_token, tiktok_token_expires_at, ...safe } = user;
  return safe;
}

export default router;

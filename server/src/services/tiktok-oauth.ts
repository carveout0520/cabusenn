/**
 * TikTok Login Kit v2 OAuth Service
 *
 * Handles:
 * - Authorization URL generation
 * - Authorization code → access token exchange
 * - Access token refresh
 * - User info fetching
 * - Token revocation
 */

import crypto from 'crypto';
import { tiktokConfig } from './tiktok-config.js';

// ============================================================
// Types
// ============================================================

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;        // 86400 (24 hours)
  open_id: string;
  refresh_expires_in: number; // 31536000 (1 year)
  refresh_token: string;
  scope: string;
  token_type: string;        // "Bearer"
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  display_name: string;
  avatar_url: string;
  avatar_url_100?: string;
  profile_deep_link?: string;
}

export interface TikTokErrorResponse {
  error: string;
  error_description: string;
  log_id?: string;
}

// ============================================================
// Authorization URL
// ============================================================

/**
 * Generate TikTok authorization URL.
 * Returns the URL and the state parameter (for CSRF verification).
 */
export function generateAuthUrl(): { url: string; state: string } {
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    scope: tiktokConfig.scopes,
    response_type: 'code',
    redirect_uri: tiktokConfig.redirectUri,
    state,
  });

  const url = `${tiktokConfig.authorizationUrl}?${params.toString()}`;
  return { url, state };
}

// ============================================================
// Token Exchange
// ============================================================

/**
 * Exchange authorization code for access token.
 * TikTok requires application/x-www-form-urlencoded content type.
 */
export async function exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    client_secret: tiktokConfig.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: tiktokConfig.redirectUri,
  });

  const response = await fetch(tiktokConfig.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (data.error) {
    const errData = data as TikTokErrorResponse;
    throw new Error(`TikTok token exchange failed: ${errData.error} - ${errData.error_description}`);
  }

  return data as TikTokTokenResponse;
}

// ============================================================
// Token Refresh
// ============================================================

/**
 * Refresh an expired access token using the refresh token.
 * Refresh tokens are valid for 1 year.
 */
export async function refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    client_secret: tiktokConfig.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(tiktokConfig.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (data.error) {
    const errData = data as TikTokErrorResponse;
    throw new Error(`TikTok token refresh failed: ${errData.error} - ${errData.error_description}`);
  }

  return data as TikTokTokenResponse;
}

// ============================================================
// User Info
// ============================================================

/**
 * Fetch user info from TikTok using the access token.
 * Requires scope user.info.basic (and optionally user.info.profile).
 */
export async function fetchUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const params = new URLSearchParams({
    fields: tiktokConfig.userInfoFields,
  });

  const response = await fetch(`${tiktokConfig.userInfoUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (data.error && data.error.code !== 'ok') {
    throw new Error(`TikTok user info failed: ${data.error.code} - ${data.error.message}`);
  }

  return data.data.user as TikTokUserInfo;
}

// ============================================================
// Token Revocation
// ============================================================

/**
 * Revoke a TikTok access token (e.g., on user logout/disconnect).
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const body = new URLSearchParams({
    client_key: tiktokConfig.clientKey,
    client_secret: tiktokConfig.clientSecret,
    token: accessToken,
  });

  await fetch(tiktokConfig.revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
}

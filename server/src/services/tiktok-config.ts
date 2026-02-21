/**
 * TikTok Login Kit v2 OAuth Configuration
 *
 * Required environment variables:
 *   TIKTOK_CLIENT_KEY    - App client key from TikTok Developer Portal
 *   TIKTOK_CLIENT_SECRET - App client secret (NEVER expose to client)
 *   TIKTOK_REDIRECT_URI  - Registered redirect URI (must match Developer Portal config)
 *
 * Setup:
 *   1. Register at https://developers.tiktok.com/
 *   2. Create app → Add Login Kit product
 *   3. Configure redirect URI (e.g., https://yourdomain.com/auth/tiktok/callback)
 *   4. Set scopes: user.info.basic (auto), user.info.profile (optional)
 *   5. Submit for review
 */

export const tiktokConfig = {
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:5173/auth/tiktok/callback',

  // TikTok API v2 endpoints
  authorizationUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
  revokeUrl: 'https://open.tiktokapis.com/v2/oauth/revoke/',

  // Scopes: user.info.basic is always included
  // user.info.profile adds: bio_description, profile_deep_link, is_verified
  scopes: 'user.info.basic,user.info.profile',

  // Fields to request from user info endpoint
  userInfoFields: 'open_id,union_id,display_name,avatar_url,avatar_url_100,profile_deep_link',
};

export function isTikTokConfigured(): boolean {
  return !!(tiktokConfig.clientKey && tiktokConfig.clientSecret);
}

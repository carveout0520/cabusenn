import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, AuthConfig } from '../types';
import { login as apiLogin, getMe, setToken, getToken, getAuthConfig, tiktokStart, tiktokCallback } from '../services/api';
import { connectWs, disconnectWs } from '../services/websocket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  authConfig: AuthConfig | null;
  login: (inviteId: string) => Promise<void>;
  loginWithTikTok: () => Promise<void>;
  handleTikTokCallback: (code: string, state: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  // Load auth config and check existing token on mount
  useEffect(() => {
    // Fetch auth config (whether TikTok is enabled)
    getAuthConfig()
      .then(config => setAuthConfig(config))
      .catch(() => setAuthConfig({ tiktok_enabled: false, invite_enabled: true }));

    const token = getToken();
    if (token) {
      getMe()
        .then(({ user }) => {
          setUser(user);
          connectWs();
        })
        .catch(() => {
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Invite ID login
  const login = useCallback(async (inviteId: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(inviteId);
      setToken(res.token);
      setUser(res.user);
      connectWs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // TikTok OAuth: initiate login (redirect to TikTok)
  const loginWithTikTok = useCallback(async () => {
    setError(null);
    try {
      const res = await tiktokStart();
      // Store state for CSRF verification on callback
      sessionStorage.setItem('tiktok_oauth_state', res.state);
      // Redirect to TikTok authorization page
      window.location.href = res.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TikTok login failed');
      throw err;
    }
  }, []);

  // TikTok OAuth: handle callback (called from TikTokCallbackPage)
  const handleTikTokCallback = useCallback(async (code: string, state: string) => {
    setError(null);
    setLoading(true);
    try {
      // Verify CSRF state
      const savedState = sessionStorage.getItem('tiktok_oauth_state');
      if (savedState && savedState !== state) {
        throw new Error('OAuth state mismatch. Please try logging in again.');
      }
      sessionStorage.removeItem('tiktok_oauth_state');

      const res = await tiktokCallback(code, state);
      setToken(res.token);
      setUser(res.user);
      connectWs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TikTok authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.user);
    } catch {
      // Silently fail
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    disconnectWs();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, authConfig, login, loginWithTikTok, handleTikTokCallback, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

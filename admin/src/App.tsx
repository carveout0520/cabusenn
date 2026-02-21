import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { adminLogin, setAdminToken, getAdminToken } from './services/api';
import DashboardPage from './pages/DashboardPage';
import MatchesPage from './pages/MatchesPage';
import UsersPage from './pages/UsersPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AuditLogsPage from './pages/AuditLogsPage';

interface AdminUser {
  user_id: string;
  nickname: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      // Validate token by trying to fetch users
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.ok) {
            // Token is valid; reconstruct user from token payload
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ user_id: payload.user_id, nickname: 'Admin', role: payload.role });
          } else {
            setAdminToken(null);
          }
        })
        .catch(() => setAdminToken(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await adminLogin(loginId.trim());
      if (res.user.role !== 'admin') {
        setLoginError('管理者権限がありません');
        return;
      }
      setAdminToken(res.token);
      setUser({ user_id: res.user.user_id, nickname: res.user.nickname, role: res.user.role });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'ログインに失敗しました');
    }
  }, [loginId]);

  const handleLogout = () => {
    setAdminToken(null);
    setUser(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>読み込み中...</div>;
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--admin-sidebar)',
      }}>
        <div style={{
          background: 'white', borderRadius: 12, padding: 32,
          width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>カブ戦 管理画面</h1>
          <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 24 }}>
            管理者IDでログインしてください
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder="管理者ID"
              style={{ width: '100%' }}
              autoFocus
            />
            {loginError && (
              <p style={{ fontSize: 12, color: 'var(--admin-danger)' }}>{loginError}</p>
            )}
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: '📊' },
    { path: '/matches', label: '対戦管理', icon: '⚔️' },
    { path: '/users', label: 'ユーザー', icon: '👤' },
    { path: '/announcements', label: 'お知らせ', icon: '📢' },
    { path: '/audit', label: '監査ログ', icon: '📋' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--admin-sidebar)', color: 'white',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h1 style={{ fontSize: 16, fontWeight: 700 }}>カブ戦</h1>
          <p style={{ fontSize: 11, opacity: 0.6 }}>管理画面</p>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px',
                  borderRadius: 6, marginBottom: 4,
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: 'white', fontSize: 13, fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.15s',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>{user.nickname}</div>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 12, color: 'rgba(255,255,255,0.6)',
              padding: '6px 0',
            }}
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/audit" element={<AuditLogsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname.startsWith('/chat/')) return 'チャット';
    if (location.pathname === '/chat') return 'チャット';
    if (location.pathname === '/announcements') return 'お知らせ';
    return 'カブ戦';
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>{getTitle()}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/announcements')}
          title="お知らせ"
          style={{ fontSize: 20, padding: 4, position: 'relative' }}
        >
          🔔
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <span>{user?.nickname}</span>
          <button
            onClick={logout}
            style={{
              fontSize: 12, color: 'var(--text-secondary)',
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}

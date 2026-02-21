import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname.startsWith('/chat/')) return 'チャット';
    if (location.pathname === '/chat') return 'チャット';
    if (location.pathname === '/announcements') return 'お知らせ';
    if (location.pathname === '/settings') return '設定';
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
        <button
          onClick={() => navigate('/settings')}
          title="設定"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--text-secondary)',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: user?.avatar_url
              ? `url(${user.avatar_url}) center/cover`
              : 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'white', overflow: 'hidden',
          }}>
            {!user?.avatar_url && user?.nickname?.charAt(0)}
          </span>
          {user?.nickname}
        </button>
      </div>
    </header>
  );
}

import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/matches', label: '対戦表', icon: '⚔️' },
  { path: '/chat', label: 'チャット', icon: '💬' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--tab-height)',
      display: 'flex',
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border)',
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

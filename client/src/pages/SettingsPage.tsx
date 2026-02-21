import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { tiktokDisconnect } from '../services/api';

export default function SettingsPage() {
  const { user, authConfig, loginWithTikTok, refreshUser, logout } = useAuth();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const hasTikTok = !!user.tiktok_open_id;

  const handleDisconnectTikTok = async () => {
    if (!window.confirm('TikTokアカウントの連携を解除しますか？')) return;
    setDisconnecting(true);
    setError('');
    try {
      await tiktokDisconnect();
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携解除に失敗しました');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnectTikTok = async () => {
    try {
      await loginWithTikTok();
    } catch {
      // Error handled by auth context
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>設定</h2>

      {/* Profile Section */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: 20,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
          プロフィール
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: user.avatar_url
              ? `url(${user.avatar_url}) center/cover`
              : 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0,
            overflow: 'hidden',
          }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.nickname.charAt(0)
            )}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user.nickname}</div>
            {user.tiktok_username && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>@{user.tiktok_username}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {user.role === 'admin' ? '管理者' : 'ライバー'}
            </div>
          </div>
        </div>
      </div>

      {/* TikTok Connection Section */}
      {authConfig?.tiktok_enabled && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          padding: 20,
          marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            TikTok連携
          </h3>
          {hasTikTok ? (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: '#f0fdf4',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 12,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#10b981',
                }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#065f46' }}>
                  連携済み
                  {user.tiktok_username && ` (@${user.tiktok_username})`}
                </span>
              </div>
              <button
                onClick={handleDisconnectTikTok}
                disabled={disconnecting}
                style={{
                  fontSize: 13, color: 'var(--status-canceled)',
                  padding: '8px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: disconnecting ? 0.5 : 1,
                }}
              >
                {disconnecting ? '解除中...' : '連携を解除する'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                TikTokアカウントと連携すると、プロフィール情報が自動で更新されます。
              </p>
              <button
                onClick={handleConnectTikTok}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                  background: '#000',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <TikTokIcon />
                TikTokと連携する
              </button>
            </div>
          )}
          {error && (
            <p style={{ fontSize: 12, color: 'var(--status-canceled)', marginTop: 8 }}>{error}</p>
          )}
        </div>
      )}

      {/* Account Section */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
          アカウント
        </h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          招待ID: <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{user.invite_id}</code>
        </div>
        <button
          onClick={logout}
          style={{
            fontSize: 13,
            color: 'var(--status-canceled)',
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.71a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.14z" fill="white"/>
    </svg>
  );
}

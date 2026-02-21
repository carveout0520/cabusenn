import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, loginWithTikTok, error, loading, authConfig } = useAuth();
  const [inviteId, setInviteId] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId.trim()) return;
    try {
      await login(inviteId.trim());
    } catch {
      // Error is handled by context
    }
  };

  const handleTikTokLogin = async () => {
    try {
      await loginWithTikTok();
    } catch {
      // Error is handled by context
    }
  };

  const tiktokEnabled = authConfig?.tiktok_enabled ?? false;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 24,
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      }}>
        {/* Logo Area */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 48, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>
            カブ戦
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            ライブバトル対戦管理アプリ
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <p style={{
            color: 'var(--status-canceled)', fontSize: 13, textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            width: '100%',
          }}>
            {error}
          </p>
        )}

        {/* TikTok Login Button (Primary) */}
        {tiktokEnabled && (
          <button
            onClick={handleTikTokLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              background: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'opacity 0.2s',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <TikTokIcon />
            {loading ? 'ログイン中...' : 'TikTokでログイン'}
          </button>
        )}

        {/* Divider */}
        {tiktokEnabled && (
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>または</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* Invite ID Login (Collapsed/Expanded) */}
        {tiktokEnabled && !showInviteForm ? (
          <button
            onClick={() => setShowInviteForm(true)}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}
          >
            招待IDでログイン
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                marginBottom: 6, color: 'var(--text-secondary)',
              }}>
                招待ID
              </label>
              <input
                type="text"
                value={inviteId}
                onChange={e => setInviteId(e.target.value)}
                placeholder="招待IDを入力"
                autoFocus={!tiktokEnabled}
                style={{ width: '100%', fontSize: 16, padding: '12px 16px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inviteId.trim()}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px 20px', fontSize: 16 }}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {tiktokEnabled
            ? 'TikTokアカウントでログインするか、運営から配布された招待IDをご利用ください。'
            : <>招待IDは運営から配布されます。<br />お持ちでない方は運営にお問い合わせください。</>
          }
        </p>
      </div>
    </div>
  );
}

/** TikTok logo icon (simplified) */
function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.71a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.14z" fill="white"/>
    </svg>
  );
}

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, error, loading } = useAuth();
  const [inviteId, setInviteId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId.trim()) return;
    try {
      await login(inviteId.trim());
    } catch {
      // Error is handled by context
    }
  };

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

        {/* Login Form */}
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
              autoFocus
              style={{ width: '100%', fontSize: 16, padding: '12px 16px' }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--status-canceled)', fontSize: 13, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !inviteId.trim()}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 20px', fontSize: 16 }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          招待IDは運営から配布されます。<br />
          お持ちでない方は運営にお問い合わせください。
        </p>
      </div>
    </div>
  );
}

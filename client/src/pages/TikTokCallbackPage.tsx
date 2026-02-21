import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * TikTok OAuth callback page.
 * TikTok redirects here after user authorizes the app.
 * URL: /auth/tiktok/callback?code=...&state=...&scopes=...
 */
export default function TikTokCallbackPage() {
  const [searchParams] = useSearchParams();
  const { handleTikTokCallback, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle TikTok error (user denied access)
    if (error) {
      setStatus('error');
      setErrorMsg(error === 'access_denied'
        ? 'TikTokへのアクセスが拒否されました。'
        : `TikTok認証エラー: ${error}`
      );
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('認証パラメータが不足しています。もう一度お試しください。');
      return;
    }

    // Exchange code for token
    handleTikTokCallback(code, state)
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'TikTok認証に失敗しました。');
      });
  }, [searchParams, handleTikTokCallback]);

  // Redirect to home once authenticated
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (status === 'error') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', padding: 24,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 48, marginBottom: 16,
        }}>
          :(
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          認証エラー
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 320 }}>
          {errorMsg}
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="btn btn-primary"
        >
          ログイン画面に戻る
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
        TikTokアカウントを認証中...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

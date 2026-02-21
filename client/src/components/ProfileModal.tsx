import type { PlayerInfo } from '../types';

interface ProfileModalProps {
  player: PlayerInfo;
  onClose: () => void;
}

export default function ProfileModal({ player, onClose }: ProfileModalProps) {
  const tiktokUrl = player.tiktok_username
    ? `https://www.tiktok.com/@${player.tiktok_username}`
    : `https://www.tiktok.com/@${encodeURIComponent(player.nickname)}`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '85%', maxWidth: 320,
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        textAlign: 'center',
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: 'white',
        }}>
          {player.nickname.charAt(0)}
        </div>

        {/* Info */}
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          {player.nickname}
        </div>
        {player.tiktok_username && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            @{player.tiktok_username}
          </div>
        )}

        {/* TikTok Link */}
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, width: '100%', marginBottom: 12, textDecoration: 'none',
          }}
        >
          TikTokプロフィールを見る
        </a>

        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

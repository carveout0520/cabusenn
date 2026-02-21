import type { Match } from '../types';

const statusLabels: Record<string, string> = {
  pending: '未調整',
  scheduling: '調整中',
  confirmed: '確定',
  finished: '終了',
  canceled: 'キャンセル',
};

interface MatchCardProps {
  match: Match;
  currentUserId: string;
  onClick: () => void;
}

export default function MatchCard({ match, currentUserId, onClick }: MatchCardProps) {
  const isParticipant = match.player_a_user_id === currentUserId || match.player_b_user_id === currentUserId;

  const getResultText = () => {
    if (!match.result?.is_public || !match.result?.winner_user_id) return null;
    if (match.result.winner_user_id === match.player_a_user_id) {
      return { winner: match.player_a.nickname, loser: match.player_b.nickname };
    }
    return { winner: match.player_b.nickname, loser: match.player_a.nickname };
  };

  const result = getResultText();

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        border: isParticipant ? '1px solid var(--primary)' : '1px solid var(--border)',
        boxShadow: `0 1px 3px var(--shadow)`,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* VS Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <PlayerAvatar player={match.player_a} isCurrentUser={match.player_a_user_id === currentUserId} />
          <span style={{
            fontSize: 16, fontWeight: 800,
            color: 'var(--primary)',
            flexShrink: 0,
          }}>VS</span>
          <PlayerAvatar player={match.player_b} isCurrentUser={match.player_b_user_id === currentUserId} />
        </div>
      </div>

      {/* Info Row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13,
      }}>
        <div style={{ color: 'var(--text-secondary)' }}>
          {match.confirmed_time_start
            ? <span style={{ fontWeight: 600, color: 'var(--status-confirmed)' }}>{match.confirmed_time_start}〜</span>
            : <span style={{ color: 'var(--text-secondary)' }}>時間未定</span>
          }
        </div>
        <span className={`badge badge-${match.status}`}>
          {statusLabels[match.status] || match.status}
        </span>
      </div>

      {/* Result (if public) */}
      {result && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-secondary)',
        }}>
          🏆 {result.winner} 勝利
        </div>
      )}
    </div>
  );
}

function PlayerAvatar({ player, isCurrentUser }: {
  player: { nickname: string; avatar_url: string | null; tiktok_username: string | null };
  isCurrentUser: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: isCurrentUser
          ? 'linear-gradient(135deg, var(--primary), var(--accent))'
          : 'var(--bg-input)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0,
        color: isCurrentUser ? 'var(--text-inverse)' : 'var(--text-secondary)',
      }}>
        {player.nickname.charAt(0)}
      </div>
      <span style={{
        fontSize: 14, fontWeight: isCurrentUser ? 700 : 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {player.nickname}
      </span>
    </div>
  );
}

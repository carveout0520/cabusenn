import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMatches } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Match } from '../types';

const statusLabels: Record<string, string> = {
  pending: '未調整',
  scheduling: '調整中',
  confirmed: '確定',
  finished: '終了',
  canceled: 'キャンセル',
};

export default function ChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatches({ scope: 'mine' })
      .then(res => setMatches(res.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getOpponent = (match: Match) => {
    if (match.player_a_user_id === user!.user_id) return match.player_b;
    return match.player_a;
  };

  const getStatusMessage = (match: Match) => {
    switch (match.status) {
      case 'pending': return '時間調整を開始しましょう';
      case 'scheduling': return '候補時間を調整中...';
      case 'confirmed': return `${match.confirmed_time_start}〜 で確定`;
      case 'finished': return '対戦終了';
      case 'canceled': return 'キャンセル';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        読み込み中...
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        対戦チャットはありません
      </div>
    );
  }

  return (
    <div>
      {matches.map(match => {
        const opponent = getOpponent(match);
        return (
          <div
            key={match.match_id}
            onClick={() => navigate(`/chat/${match.match_id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>
              {opponent.nickname.charAt(0)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{opponent.nickname}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {match.event_date}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {getStatusMessage(match)}
                </span>
                <span className={`badge badge-${match.status}`} style={{ marginLeft: 8, flexShrink: 0 }}>
                  {statusLabels[match.status]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

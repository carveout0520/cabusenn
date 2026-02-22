import { useState, useEffect } from 'react';
import { getLeaderboard, getResultsHistory } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { LeaderboardEntry, ResultHistory } from '../types';

type Tab = 'leaderboard' | 'history';

export default function ResultsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<ResultHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'leaderboard') {
      getLeaderboard()
        .then(res => setLeaderboard(res.leaderboard))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      getResultsHistory({ limit: 30, offset: historyOffset })
        .then(res => {
          setHistory(res.history);
          setHistoryTotal(res.total);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [tab, historyOffset]);

  return (
    <div>
      {/* Tab selector */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {([['leaderboard', 'ランキング'], ['history', '対戦履歴']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setHistoryOffset(0); }}
            style={{
              flex: 1, padding: '12px 0',
              fontWeight: tab === key ? 700 : 400,
              fontSize: 14,
              color: tab === key ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            読み込み中...
          </div>
        ) : tab === 'leaderboard' ? (
          <LeaderboardView entries={leaderboard} currentUserId={user?.user_id ?? ''} />
        ) : (
          <HistoryView
            history={history}
            currentUserId={user?.user_id ?? ''}
            total={historyTotal}
            offset={historyOffset}
            onPageChange={setHistoryOffset}
          />
        )}
      </div>
    </div>
  );
}

function LeaderboardView({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        まだ公開された戦績がありません
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map((entry, index) => {
        const isMe = entry.user_id === currentUserId;
        const winRate = entry.total_matches > 0
          ? Math.round((entry.wins / entry.total_matches) * 100)
          : 0;

        return (
          <div
            key={entry.user_id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: isMe ? '1px solid var(--primary)' : '1px solid var(--border)',
              boxShadow: `0 1px 3px var(--shadow)`,
            }}
          >
            {/* Rank */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: index < 3 ? 18 : 14,
              fontWeight: 700,
              background: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : index === 2 ? '#d97706' : 'var(--bg-input)',
              color: index < 3 ? 'white' : 'var(--text-secondary)',
              flexShrink: 0,
            }}>
              {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
            </div>

            {/* Player info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: isMe ? 700 : 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.nickname}
                {isMe && <span style={{ fontSize: 11, color: 'var(--primary)', marginLeft: 6 }}>あなた</span>}
              </div>
              {entry.tiktok_username && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  @{entry.tiktok_username}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                <span style={{ color: 'var(--status-confirmed)' }}>{entry.wins}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 2px' }}>-</span>
                <span style={{ color: '#ef4444' }}>{entry.losses}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                勝率 {winRate}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryView({ history, currentUserId, total, offset, onPageChange }: {
  history: ResultHistory[];
  currentUserId: string;
  total: number;
  offset: number;
  onPageChange: (offset: number) => void;
}) {
  const limit = 30;

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        まだ公開された対戦結果がありません
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map(match => {
          const isWinnerA = match.winner_user_id === match.player_a.user_id;
          const winner = isWinnerA ? match.player_a : match.player_b;
          const loser = isWinnerA ? match.player_b : match.player_a;
          const isMyMatch = match.player_a.user_id === currentUserId || match.player_b.user_id === currentUserId;
          const didIWin = match.winner_user_id === currentUserId;

          return (
            <div
              key={match.match_id}
              style={{
                padding: '12px 16px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: isMyMatch
                  ? `1px solid ${didIWin ? 'var(--status-confirmed)' : '#ef4444'}`
                  : '1px solid var(--border)',
                boxShadow: `0 1px 3px var(--shadow)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {formatDate(match.event_date)}
                  {match.event_round > 0 && ` 第${match.event_round}回`}
                </span>
                {isMyMatch && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    background: didIWin ? '#dcfce7' : '#fee2e2',
                    color: didIWin ? '#16a34a' : '#dc2626',
                  }}>
                    {didIWin ? '勝ち' : '負け'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 700, color: 'var(--status-confirmed)' }}>{winner.nickname}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>def.</span>
                <span style={{ color: 'var(--text-secondary)' }}>{loser.nickname}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: 13,
              opacity: offset === 0 ? 0.5 : 1,
            }}
          >
            前へ
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '36px' }}>
            {offset + 1}〜{Math.min(offset + limit, total)} / {total}
          </span>
          <button
            onClick={() => onPageChange(offset + limit)}
            disabled={offset + limit >= total}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: 13,
              opacity: offset + limit >= total ? 0.5 : 1,
            }}
          >
            次へ
          </button>
        </div>
      )}
    </>
  );
}

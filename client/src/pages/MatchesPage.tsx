import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMatches } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Match } from '../types';
import MatchCard from '../components/MatchCard';

export default function MatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMatches({ scope, q: searchQuery || undefined })
      .then(res => setMatches(res.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [scope, searchQuery]);

  // Group matches by date
  const groupedMatches = matches.reduce<Record<string, Match[]>>((acc, match) => {
    if (!acc[match.event_date]) acc[match.event_date] = [];
    acc[match.event_date].push(match);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${days[d.getDay()]}）`;
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {(['all', 'mine'] as const).map(s => (
          <button
            key={s}
            onClick={() => setScope(s)}
            style={{
              flex: 1, padding: '12px 0',
              fontWeight: scope === s ? 700 : 400,
              fontSize: 14,
              color: scope === s ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: scope === s ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {s === 'all' ? '全体' : '自分のみ'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ padding: '12px 16px' }}>
        <input
          type="search"
          placeholder="ユーザーID / ニックネームで検索"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            fontSize: 14,
          }}
        />
      </div>

      {/* Match List */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            読み込み中...
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            対戦データがありません
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 8, paddingLeft: 4,
              }}>
                {formatDate(date)}
                {groupedMatches[date][0]?.event_round > 0 &&
                  ` 第${groupedMatches[date][0].event_round}回`
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupedMatches[date].map(match => (
                  <MatchCard
                    key={match.match_id}
                    match={match}
                    currentUserId={user!.user_id}
                    onClick={() => navigate(`/chat/${match.match_id}`)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

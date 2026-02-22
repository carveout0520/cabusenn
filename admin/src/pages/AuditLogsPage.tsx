import { useState, useEffect } from 'react';
import { getAuditLogs } from '../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const limit = 50;

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    getAuditLogs({
      limit,
      offset,
      action: filterAction || undefined,
      actor: filterActor || undefined,
      date_from: filterDateFrom || undefined,
      date_to: filterDateTo || undefined,
    })
      .then(res => {
        setLogs(res.logs as Record<string, unknown>[]);
        setTotal(res.total);
        if (res.action_types) setActionTypes(res.action_types);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [offset, filterAction, filterActor, filterDateFrom, filterDateTo]);

  const handleReset = () => {
    setFilterAction('');
    setFilterActor('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setOffset(0);
  };

  const hasFilters = filterAction || filterActor || filterDateFrom || filterDateTo;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>監査ログ</h2>
        <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>
          全{total}件
        </span>
      </div>

      {/* Filter Controls */}
      <div className="admin-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
              アクション
            </label>
            <select
              value={filterAction}
              onChange={e => { setFilterAction(e.target.value); setOffset(0); }}
              style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="">すべて</option>
              {actionTypes.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
              操作者ID
            </label>
            <input
              type="text"
              value={filterActor}
              onChange={e => { setFilterActor(e.target.value); setOffset(0); }}
              placeholder="IDの一部を入力"
              style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div style={{ minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
              開始日
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); setOffset(0); }}
              style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div style={{ minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
              終了日
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); setOffset(0); }}
              style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          {hasFilters && (
            <button
              onClick={handleReset}
              className="admin-btn admin-btn-outline"
              style={{ fontSize: 12 }}
            >
              リセット
            </button>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>読み込み中...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>
            {hasFilters ? '条件に一致するログはありません' : 'ログはありません'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>日時</th>
                <th>操作者ID</th>
                <th>アクション</th>
                <th>対象</th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id as string}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at as string).toLocaleString('ja-JP')}
                  </td>
                  <td style={{ fontSize: 12 }}>{(log.actor_user_id as string).slice(0, 8)}...</td>
                  <td>
                    <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                      {log.action as string}
                    </code>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {log.target_type as string}: {(log.target_id as string).slice(0, 8)}...
                  </td>
                  <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details as string || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="admin-btn admin-btn-outline"
          >
            前へ
          </button>
          <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: '36px' }}>
            {offset + 1}〜{Math.min(offset + limit, total)} / {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="admin-btn admin-btn-outline"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}

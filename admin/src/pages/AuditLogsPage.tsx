import { useState, useEffect } from 'react';
import { getAuditLogs } from '../services/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    getAuditLogs({ limit, offset })
      .then(res => {
        setLogs(res.logs as Record<string, unknown>[]);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>監査ログ</h2>
        <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>
          全{total}件
        </span>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>読み込み中...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>ログはありません</div>
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

import { useState, useEffect } from 'react';
import { getDashboard, type DashboardStats } from '../services/api';

const STATUS_LABELS: Record<string, string> = {
  pending: '未定',
  scheduling: '調整中',
  confirmed: '確定',
  finished: '終了',
  canceled: 'キャンセル',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  scheduling: '#f59e0b',
  confirmed: '#10b981',
  finished: '#3b82f6',
  canceled: '#ef4444',
};

const ACTION_LABELS: Record<string, string> = {
  create_user: 'ユーザー作成',
  update_user: 'ユーザー更新',
  delete_user: 'ユーザー削除',
  import_csv: 'CSV取込',
  update_match: '対戦更新',
  delete_match: '対戦削除',
  record_result: '結果記録',
  create_announcement: 'お知らせ作成',
  tiktok_login: 'TikTokログイン',
  tiktok_register: 'TikTok新規登録',
  tiktok_disconnect: 'TikTok連携解除',
  tiktok_token_refresh: 'TikTokトークン更新',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>読み込み中...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>ダッシュボード</h2>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="総ユーザー数" value={stats.users.total} color="#3b82f6" />
        <StatCard label="TikTok連携済" value={stats.users.tiktok_linked} color="#000000" />
        <StatCard label="総対戦数" value={stats.matches.total} color="#8b5cf6" />
        <StatCard label="今後の対戦" value={stats.matches.upcoming} color="#10b981" />
      </div>

      {/* Match Status Breakdown */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>対戦ステータス内訳</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(stats.matches.by_status).map(([status, count]) => (
            <div key={status} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 8,
              background: `${STATUS_COLORS[status] || '#94a3b8'}15`,
              border: `1px solid ${STATUS_COLORS[status] || '#94a3b8'}40`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STATUS_COLORS[status] || '#94a3b8',
              }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{STATUS_LABELS[status] || status}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>直近7日間のアクティビティ</h3>
        {stats.recent_activity.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>アクティビティなし</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recent_activity.map(({ action, count }) => (
              <div key={action} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: '#f8fafc', borderRadius: 6,
              }}>
                <span style={{ fontSize: 13 }}>{ACTION_LABELS[action] || action}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-primary)' }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="admin-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 8 }}>{label}</div>
    </div>
  );
}

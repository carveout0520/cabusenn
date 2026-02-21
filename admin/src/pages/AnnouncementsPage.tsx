import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, getUsers } from '../services/api';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'users'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const loadAnnouncements = () => {
    setLoading(true);
    getAnnouncements()
      .then(res => setAnnouncements(res.announcements as Record<string, unknown>[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
    getUsers().then(res => setUsers(res.users as Record<string, unknown>[])).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      target_type: targetType,
      target_ids: targetType === 'users' ? selectedUserIds : undefined,
    });
    setTitle('');
    setBody('');
    setTargetType('all');
    setSelectedUserIds([]);
    setShowForm(false);
    loadAnnouncements();
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>お知らせ管理</h2>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn admin-btn-primary">
          {showForm ? 'フォームを閉じる' : '+ 新規お知らせ'}
        </button>
      </div>

      {showForm && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>タイトル</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="お知らせのタイトル"
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>本文</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="お知らせの本文"
                rows={4}
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>配信対象</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="target"
                    checked={targetType === 'all'}
                    onChange={() => { setTargetType('all'); setSelectedUserIds([]); }}
                  />
                  全員
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="target"
                    checked={targetType === 'users'}
                    onChange={() => setTargetType('users')}
                  />
                  特定ユーザー
                </label>
              </div>
            </div>
            {targetType === 'users' && (
              <div style={{
                maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: 8,
              }}>
                {users.map(u => (
                  <label
                    key={u.user_id as string}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      background: selectedUserIds.includes(u.user_id as string) ? '#eff6ff' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.user_id as string)}
                      onChange={() => toggleUser(u.user_id as string)}
                    />
                    <span style={{ fontSize: 13 }}>{u.nickname as string}</span>
                    {(u.tiktok_username as string | null) && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>@{u.tiktok_username as string}</span>
                    )}
                  </label>
                ))}
                {selectedUserIds.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--admin-primary)', marginTop: 6, padding: '0 8px' }}>
                    {selectedUserIds.length}人選択中
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={targetType === 'users' && selectedUserIds.length === 0}
              >
                配信
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>読み込み中...</div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>お知らせはありません</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>タイトル</th>
                <th>本文</th>
                <th>対象</th>
                <th>配信日</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.announcement_id as string}>
                  <td style={{ fontWeight: 600 }}>{a.title as string}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.body as string}
                  </td>
                  <td>
                    <span className="admin-badge" style={{
                      background: a.target_type === 'all' ? '#f0fdf4' : '#eff6ff',
                      color: a.target_type === 'all' ? '#16a34a' : '#2563eb',
                    }}>
                      {a.target_type === 'all' ? '全体' : a.target_type === 'users' ? '指定ユーザー' : a.target_type as string}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    {new Date(a.created_at as string).toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

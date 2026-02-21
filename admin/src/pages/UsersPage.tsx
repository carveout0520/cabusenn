import { useState, useEffect } from 'react';
import { getUsers, createUser } from '../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ invite_id: '', nickname: '', tiktok_username: '', role: 'liver' });
  const [formError, setFormError] = useState('');

  const loadUsers = () => {
    setLoading(true);
    getUsers()
      .then(res => setUsers(res.users as Record<string, unknown>[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await createUser({
        invite_id: formData.invite_id,
        nickname: formData.nickname,
        tiktok_username: formData.tiktok_username || undefined,
        role: formData.role,
      });
      setFormData({ invite_id: '', nickname: '', tiktok_username: '', role: 'liver' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>ユーザー管理</h2>
        <button onClick={() => setShowForm(!showForm)} className="admin-btn admin-btn-primary">
          {showForm ? 'フォームを閉じる' : '+ ユーザー追加'}
        </button>
      </div>

      {showForm && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>新規ユーザー</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>招待ID *</label>
              <input
                value={formData.invite_id}
                onChange={e => setFormData(p => ({ ...p, invite_id: e.target.value }))}
                placeholder="liver007"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>ニックネーム *</label>
              <input
                value={formData.nickname}
                onChange={e => setFormData(p => ({ ...p, nickname: e.target.value }))}
                placeholder="ニックネーム"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>TikTokユーザー名</label>
              <input
                value={formData.tiktok_username}
                onChange={e => setFormData(p => ({ ...p, tiktok_username: e.target.value }))}
                placeholder="@なし"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>ロール</label>
              <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))} style={{ padding: '8px 12px' }}>
                <option value="liver">ライバー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <button type="submit" className="admin-btn admin-btn-primary">登録</button>
          </form>
          {formError && <p style={{ fontSize: 12, color: 'var(--admin-danger)', marginTop: 8 }}>{formError}</p>}
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>読み込み中...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>招待ID</th>
                <th>ニックネーム</th>
                <th>TikTok</th>
                <th>ロール</th>
                <th>登録日</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id as string}>
                  <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{u.invite_id as string}</code></td>
                  <td>{u.nickname as string}</td>
                  <td>{u.tiktok_username ? `@${u.tiktok_username}` : '-'}</td>
                  <td>
                    <span className="admin-badge" style={{
                      background: u.role === 'admin' ? '#dbeafe' : '#f0fdf4',
                      color: u.role === 'admin' ? '#1d4ed8' : '#16a34a',
                    }}>
                      {u.role === 'admin' ? '管理者' : 'ライバー'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    {new Date(u.created_at as string).toLocaleDateString('ja-JP')}
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

import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ invite_id: '', nickname: '', tiktok_username: '', role: 'liver' });
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ nickname: string; tiktok_username: string; role: string }>({ nickname: '', tiktok_username: '', role: 'liver' });
  const [editError, setEditError] = useState('');

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

  const startEdit = (u: Record<string, unknown>) => {
    setEditingId(u.user_id as string);
    setEditData({
      nickname: u.nickname as string,
      tiktok_username: (u.tiktok_username as string) || '',
      role: u.role as string,
    });
    setEditError('');
  };

  const handleUpdate = async (userId: string) => {
    setEditError('');
    try {
      await updateUser(userId, {
        nickname: editData.nickname,
        tiktok_username: editData.tiktok_username || undefined,
        role: editData.role,
      });
      setEditingId(null);
      loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleDelete = async (userId: string, nickname: string) => {
    if (!window.confirm(`「${nickname}」を削除しますか？この操作は元に戻せません。`)) return;
    try {
      await deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
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
                <th style={{ width: 120 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEditing = editingId === u.user_id;
                return (
                  <tr key={u.user_id as string}>
                    <td>
                      <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        {u.invite_id as string}
                      </code>
                      {(u.tiktok_open_id as string | null) && (
                        <span style={{ fontSize: 10, marginLeft: 6, color: '#000', fontWeight: 600 }}>TT</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editData.nickname}
                          onChange={e => setEditData(p => ({ ...p, nickname: e.target.value }))}
                          style={{ width: 120, fontSize: 13, padding: '4px 8px' }}
                        />
                      ) : (
                        u.nickname as string
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editData.tiktok_username}
                          onChange={e => setEditData(p => ({ ...p, tiktok_username: e.target.value }))}
                          style={{ width: 100, fontSize: 13, padding: '4px 8px' }}
                          placeholder="@なし"
                        />
                      ) : (
                        u.tiktok_username ? `@${u.tiktok_username}` : '-'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editData.role}
                          onChange={e => setEditData(p => ({ ...p, role: e.target.value }))}
                          style={{ fontSize: 13, padding: '4px 8px' }}
                        >
                          <option value="liver">ライバー</option>
                          <option value="admin">管理者</option>
                        </select>
                      ) : (
                        <span className="admin-badge" style={{
                          background: u.role === 'admin' ? '#dbeafe' : '#f0fdf4',
                          color: u.role === 'admin' ? '#1d4ed8' : '#16a34a',
                        }}>
                          {u.role === 'admin' ? '管理者' : 'ライバー'}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                      {new Date(u.created_at as string).toLocaleDateString('ja-JP')}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleUpdate(u.user_id as string)}
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="admin-btn"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => startEdit(u)}
                            className="admin-btn"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(u.user_id as string, u.nickname as string)}
                            className="admin-btn"
                            style={{ fontSize: 11, padding: '4px 10px', color: 'var(--admin-danger)' }}
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {editError && <p style={{ fontSize: 12, color: 'var(--admin-danger)', padding: '8px 16px' }}>{editError}</p>}
      </div>
    </div>
  );
}

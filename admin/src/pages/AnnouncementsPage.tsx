import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement } from '../services/api';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const loadAnnouncements = () => {
    setLoading(true);
    getAnnouncements()
      .then(res => setAnnouncements(res.announcements as Record<string, unknown>[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createAnnouncement({ title: title.trim(), body: body.trim(), target_type: 'all' });
    setTitle('');
    setBody('');
    setShowForm(false);
    loadAnnouncements();
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="admin-btn admin-btn-primary">配信</button>
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
                    <span className="admin-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      {a.target_type === 'all' ? '全体' : a.target_type as string}
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

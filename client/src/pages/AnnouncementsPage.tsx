import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnnouncements } from '../services/api';
import type { Announcement } from '../types';

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncements()
      .then(res => setAnnouncements(res.announcements))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Back button */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, color: 'var(--text-secondary)',
        }}>
          ← 戻る
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          読み込み中...
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          お知らせはありません
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {announcements.map(a => (
            <div
              key={a.announcement_id}
              style={{
                padding: '16px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{a.title}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {new Date(a.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <p style={{
                fontSize: 13, color: 'var(--text-secondary)',
                lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {a.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

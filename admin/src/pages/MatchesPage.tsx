import { useState, useEffect, useRef } from 'react';
import { getMatches, updateMatch, deleteMatch, importMatchesCsv, downloadCsvTemplate, recordResult } from '../services/api';

const statusOptions = ['pending', 'scheduling', 'confirmed', 'finished', 'canceled'];
const statusLabels: Record<string, string> = {
  pending: '未調整', scheduling: '調整中', confirmed: '確定', finished: '終了', canceled: 'キャンセル',
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState<{ message: string; errors: string[] } | null>(null);
  const [editingMatch, setEditingMatch] = useState<Record<string, unknown> | null>(null);
  const [resultModal, setResultModal] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMatches = () => {
    setLoading(true);
    getMatches()
      .then(res => setMatches(res.matches as Record<string, unknown>[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMatches(); }, []);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importMatchesCsv(file);
      setImportResult(result);
      loadMatches();
    } catch (err) {
      setImportResult({ message: 'インポートに失敗しました', errors: [String(err)] });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTemplateDl = async () => {
    const blob = await downloadCsvTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'match_template_v1.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (matchId: string, status: string) => {
    await updateMatch(matchId, { status });
    loadMatches();
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm('この対戦カードを削除しますか？')) return;
    await deleteMatch(matchId);
    loadMatches();
  };

  const handleRecordResult = async (matchId: string, winnerId: string | null, isPublic: boolean, memo: string) => {
    await recordResult({ match_id: matchId, winner_user_id: winnerId, is_public: isPublic, memo_private: memo });
    setResultModal(null);
    loadMatches();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>対戦管理</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleTemplateDl} className="admin-btn admin-btn-outline">
            テンプレDL
          </button>
          <label className="admin-btn admin-btn-primary" style={{ cursor: 'pointer' }}>
            CSVインポート
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {importResult && (
        <div className="admin-card" style={{
          marginBottom: 16,
          background: importResult.errors.length > 0 ? '#fef2f2' : '#f0fdf4',
        }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{importResult.message}</p>
          {importResult.errors.length > 0 && (
            <ul style={{ fontSize: 12, color: 'var(--admin-danger)', paddingLeft: 16 }}>
              {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <button onClick={() => setImportResult(null)} style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>
            閉じる
          </button>
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>読み込み中...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>開催日</th>
                <th>回</th>
                <th>対戦カード</th>
                <th>時間</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m: Record<string, unknown>) => (
                <tr key={m.match_id as string}>
                  <td>{m.event_date as string}</td>
                  <td>第{m.event_round as number}回</td>
                  <td>
                    {(m.player_a as Record<string, unknown>).nickname as string}
                    {' vs '}
                    {(m.player_b as Record<string, unknown>).nickname as string}
                  </td>
                  <td>{(m.confirmed_time_start as string) || '未定'}</td>
                  <td>
                    <select
                      value={m.status as string}
                      onChange={e => handleStatusChange(m.match_id as string, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    >
                      {statusOptions.map(s => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setResultModal(m)}
                        className="admin-btn admin-btn-outline"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                      >
                        勝敗
                      </button>
                      <button
                        onClick={() => handleDelete(m.match_id as string)}
                        className="admin-btn admin-btn-danger"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Result Modal */}
      {resultModal && (
        <ResultModal
          match={resultModal}
          onSubmit={handleRecordResult}
          onClose={() => setResultModal(null)}
        />
      )}
    </div>
  );
}

function ResultModal({ match, onSubmit, onClose }: {
  match: Record<string, unknown>;
  onSubmit: (matchId: string, winnerId: string | null, isPublic: boolean, memo: string) => void;
  onClose: () => void;
}) {
  const [winnerId, setWinnerId] = useState<string>('');
  const [isPublic, setIsPublic] = useState(true);
  const [memo, setMemo] = useState('');

  const playerA = match.player_a as Record<string, unknown>;
  const playerB = match.player_b as Record<string, unknown>;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 400 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          勝敗入力: {playerA.nickname as string} vs {playerB.nickname as string}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>勝者</label>
            <select value={winnerId} onChange={e => setWinnerId(e.target.value)} style={{ width: '100%' }}>
              <option value="">--選択してください--</option>
              <option value={playerA.user_id as string}>{playerA.nickname as string}</option>
              <option value={playerB.user_id as string}>{playerB.nickname as string}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              結果を公開する
            </label>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>運営メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="admin-btn admin-btn-outline">キャンセル</button>
            <button
              onClick={() => onSubmit(match.match_id as string, winnerId || null, isPublic, memo)}
              className="admin-btn admin-btn-primary"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

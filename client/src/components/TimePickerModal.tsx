import { useState } from 'react';

// Generate time slots from 19:00 to 23:30 in 30-minute intervals
const TIME_SLOTS: string[] = [];
for (let hour = 19; hour < 24; hour++) {
  TIME_SLOTS.push(`${String(hour).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(hour).padStart(2, '0')}:30`);
}

interface TimePickerModalProps {
  eventDate: string;
  onSubmit: (slots: string[]) => void;
  onClose: () => void;
}

export default function TimePickerModal({ eventDate, onSubmit, onClose }: TimePickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSlot = (slot: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else {
        next.add(slot);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    onSubmit(Array.from(selected).sort());
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 420, maxHeight: '70vh',
        background: 'var(--bg-primary)',
        borderRadius: '16px 16px 0 0',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>候補時間を選択</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {formatDate(eventDate)} | 複数選択可
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {/* Time Grid */}
        <div style={{
          flex: 1, overflow: 'auto', padding: '16px 20px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          alignContent: 'start',
        }}>
          {TIME_SLOTS.map(slot => {
            const isSelected = selected.has(slot);
            return (
              <button
                key={slot}
                onClick={() => toggleSlot(slot)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14, fontWeight: 600,
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(254, 44, 85, 0.1)' : 'var(--bg-card)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                  transition: 'all 0.15s',
                }}
              >
                {slot}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            候補を送信（{selected.size}件）
          </button>
        </div>
      </div>
    </div>
  );
}

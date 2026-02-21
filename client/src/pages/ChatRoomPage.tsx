import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMatch, getMessages, sendMessage, getAvailability, submitAvailability, approveSchedule } from '../services/api';
import { subscribeWs } from '../services/websocket';
import type { Match, Message } from '../types';
import TimePickerModal from '../components/TimePickerModal';
import ProfileModal from '../components/ProfileModal';

export default function ChatRoomPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [overlappingSlots, setOverlappingSlots] = useState<string[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const opponent = match
    ? (match.player_a_user_id === user!.user_id ? match.player_b : match.player_a)
    : null;

  // Load match and messages
  useEffect(() => {
    if (!matchId) return;
    getMatch(matchId).then(res => setMatch(res.match)).catch(console.error);
    getMessages(matchId).then(res => {
      setMessages(res.messages);
      setHasOlderMessages(res.messages.length >= 50);
    }).catch(console.error);
    getAvailability(matchId).then(res => {
      setOverlappingSlots(res.overlapping_slots);
    }).catch(console.error);
  }, [matchId]);

  // WebSocket subscription for real-time messages
  useEffect(() => {
    const unsub1 = subscribeWs('new_message', (data) => {
      const msg = data as Message;
      if (msg.match_id === matchId) {
        setMessages(prev => [...prev, msg]);
      }
    });
    const unsub2 = subscribeWs('schedule_confirmed', (data) => {
      const d = data as { match_id: string; decided_time: string };
      if (d.match_id === matchId) {
        setMatch(prev => prev ? { ...prev, status: 'confirmed', confirmed_time_start: d.decided_time } : prev);
      }
    });
    const unsub3 = subscribeWs('availability_updated', (data) => {
      const d = data as { match_id: string; overlapping_slots: string[] };
      if (d.match_id === matchId) {
        setOverlappingSlots(d.overlapping_slots);
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [matchId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOlderMessages = useCallback(async () => {
    if (!matchId || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldestMsg = messages[0];
      const res = await getMessages(matchId, oldestMsg.created_at);
      if (res.messages.length === 0) {
        setHasOlderMessages(false);
      } else {
        setMessages(prev => [...res.messages, ...prev]);
        setHasOlderMessages(res.messages.length >= 50);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [matchId, messages, loadingOlder]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !matchId) return;
    try {
      await sendMessage(matchId, { body: inputText.trim() });
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [inputText, matchId]);

  const handleTimeSubmit = useCallback(async (slots: string[]) => {
    if (!matchId) return;
    try {
      await submitAvailability(matchId, slots);
      await sendMessage(matchId, {
        type: 'schedule_proposal',
        body: `候補時間: ${slots.join(', ')}`,
        payload: { slots },
      });
      setShowTimePicker(false);
      // Refresh availability
      const avRes = await getAvailability(matchId);
      setOverlappingSlots(avRes.overlapping_slots);
    } catch (err) {
      console.error('Failed to submit availability:', err);
    }
  }, [matchId]);

  const handleApproveTime = useCallback(async (time: string) => {
    if (!matchId) return;
    try {
      await approveSchedule(matchId, time);
    } catch (err) {
      console.error('Failed to approve schedule:', err);
    }
  }, [matchId]);

  if (!match || !opponent) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - var(--tab-height))' }}>
      {/* Chat Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 18, padding: 4 }}>←</button>
        <div
          onClick={() => setShowProfile(true)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'white', cursor: 'pointer',
          }}
        >
          {opponent.nickname.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowProfile(true)}>
            {opponent.nickname}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {match.event_date} {match.confirmed_time_start ? `${match.confirmed_time_start}〜` : '時間未定'}
          </div>
        </div>
        <span className={`badge badge-${match.status}`} style={{ fontSize: 10 }}>
          {match.status === 'confirmed' ? '確定' : match.status === 'scheduling' ? '調整中' : match.status}
        </span>
      </div>

      {/* Overlapping Slots Banner */}
      {overlappingSlots.length > 0 && match.status !== 'confirmed' && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-confirmed)', marginBottom: 6 }}>
            一致する候補時間があります
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {overlappingSlots.map(slot => (
              <button
                key={slot}
                onClick={() => handleApproveTime(slot)}
                className="btn btn-sm btn-primary"
              >
                {slot} で確定
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {hasOlderMessages && messages.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              style={{
                fontSize: 12, color: 'var(--primary)',
                padding: '6px 16px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-card)',
              }}
            >
              {loadingOlder ? '読み込み中...' : '過去のメッセージを読み込む'}
            </button>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.message_id} message={msg} isOwn={msg.sender_user_id === user!.user_id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Menu (overlay) */}
      {showActions && (
        <div style={{
          position: 'absolute', bottom: 60, left: 16, right: 16,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px var(--shadow)',
          padding: 8, zIndex: 50,
        }}>
          <button
            onClick={() => { setShowTimePicker(true); setShowActions(false); }}
            style={{
              display: 'block', width: '100%', padding: '12px 16px',
              textAlign: 'left', fontSize: 14, borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            🕐 候補時間を送る
          </button>
          <button
            onClick={() => { setShowTimePicker(true); setShowActions(false); }}
            style={{
              display: 'block', width: '100%', padding: '12px 16px',
              textAlign: 'left', fontSize: 14, borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            🔄 再調整を送る
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}>
        <button
          onClick={() => setShowActions(!showActions)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: showActions ? 'var(--primary)' : 'var(--bg-input)',
            color: showActions ? 'white' : 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 300, transition: 'all 0.2s',
          }}
        >
          +
        </button>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, borderRadius: 'var(--radius-full)',
            padding: '10px 16px', fontSize: 14, border: '1px solid var(--border)',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: inputText.trim() ? 'var(--primary)' : 'var(--bg-input)',
            color: inputText.trim() ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'all 0.2s',
          }}
        >
          ↑
        </button>
      </div>

      {/* Modals */}
      {showTimePicker && (
        <TimePickerModal
          eventDate={match.event_date}
          onSubmit={handleTimeSubmit}
          onClose={() => setShowTimePicker(false)}
        />
      )}
      {showProfile && opponent && (
        <ProfileModal player={opponent} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div style={{
        textAlign: 'center', margin: '12px 0',
        fontSize: 12, color: 'var(--text-secondary)',
        padding: '6px 12px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-full)',
        display: 'inline-block',
        width: '100%',
      }}>
        {message.body}
      </div>
    );
  }

  const isSchedule = message.type === 'schedule_proposal';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isOwn
          ? '16px 16px 4px 16px'
          : '16px 16px 16px 4px',
        background: isOwn
          ? 'var(--primary)'
          : isSchedule ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
        color: isOwn ? 'white' : 'var(--text-primary)',
      }}>
        {!isOwn && message.sender_nickname && (
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
            {message.sender_nickname}
          </div>
        )}
        {isSchedule && (
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--status-scheduling)' }}>
            🕐 候補時間
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.body}
        </div>
        <div style={{
          fontSize: 10, marginTop: 4, textAlign: 'right',
          opacity: 0.6,
        }}>
          {new Date(message.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

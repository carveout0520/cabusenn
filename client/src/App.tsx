import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import ChatListPage from './pages/ChatListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TabBar from './components/TabBar';
import Header from './components/Header';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-secondary)'
      }}>
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header />
      <main style={{ flex: 1, overflow: 'auto', paddingBottom: 'var(--tab-height)' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/chat" element={<ChatListPage />} />
          <Route path="/chat/:matchId" element={<ChatRoomPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="*" element={<Navigate to="/matches" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}

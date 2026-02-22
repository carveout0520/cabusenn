import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import TikTokCallbackPage from './pages/TikTokCallbackPage';
import MatchesPage from './pages/MatchesPage';
import ResultsPage from './pages/ResultsPage';
import ChatListPage from './pages/ChatListPage';
import ChatRoomPage from './pages/ChatRoomPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import SettingsPage from './pages/SettingsPage';
import TabBar from './components/TabBar';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

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

  // TikTok OAuth callback route must be accessible without auth
  // (user is redirected here from TikTok before being authenticated)
  if (!user) {
    return (
      <Routes>
        <Route path="/auth/tiktok/callback" element={<TikTokCallbackPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto', paddingBottom: 'var(--tab-height)' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/matches" replace />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/chat" element={<ChatListPage />} />
            <Route path="/chat/:matchId" element={<ChatRoomPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth/tiktok/callback" element={<Navigate to="/matches" replace />} />
            <Route path="*" element={<Navigate to="/matches" replace />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </ErrorBoundary>
  );
}

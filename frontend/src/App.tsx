import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AgeGatePage from './pages/AgeGatePage';
import VibeCheckPage from './pages/VibeCheckPage';
import OnboardingPage from './pages/OnboardingPage';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import ShortsPage from './pages/ShortsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import MatchDetailPage from './pages/MatchDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.ageVerified) return <Navigate to="/age-gate" replace />;
  if (!user?.vibeCheckDone) return <Navigate to="/vibe-check" replace />;
  if (!user?.activities?.length) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Inter', fontSize: 14, borderRadius: 12 } }} />
      <Routes>
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/age-gate" element={<AgeGatePage />} />
        <Route path="/vibe-check" element={<VibeCheckPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shorts" element={<ShortsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:peerId" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/match/:userId" element={<MatchDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

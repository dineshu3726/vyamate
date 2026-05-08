import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AgeGatePage from './pages/AgeGatePage';
import VibeCheckPage from './pages/VibeCheckPage';
import OnboardingPage from './pages/OnboardingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import ShortsPage from './pages/ShortsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import MatchDetailPage from './pages/MatchDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import WorkoutTemplatesPage from './pages/WorkoutTemplatesPage';
import MapPage from './pages/MapPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import AISuggestionsPage from './pages/AISuggestionsPage';
import HabitTrackerPage from './pages/HabitTrackerPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  // If logged in with temp password, must change it before anything else
  if (user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!user?.ageVerified) return <Navigate to="/age-gate" replace />;
  if (!user?.vibeCheckDone) return <Navigate to="/vibe-check" replace />;
  if (!user?.activities?.length) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <Navigate to="/" replace /> : <>{children}</>;
}

// Requires a logged-in session but doesn't enforce full onboarding
function RequireToken({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Inter', fontSize: 14, borderRadius: 12 } }} />
      <Routes>
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
        <Route path="/change-password" element={<RequireToken><ChangePasswordPage /></RequireToken>} />
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
          <Route path="/templates" element={<WorkoutTemplatesPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/sessions" element={<SessionHistoryPage />} />
          <Route path="/ai-suggestions" element={<AISuggestionsPage />} />
          <Route path="/match/:userId" element={<MatchDetailPage />} />
          <Route path="/habits" element={<HabitTrackerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingScreen } from "./pages/LoadingScreen";
import { HomeScreen } from "./pages/HomeScreen";
import { CreateGameScreen } from "./pages/CreateGameScreen";
import { JoinGameScreen } from "./pages/JoinGameScreen";
import { GameScreen } from "./pages/GameScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { HistoryScreen } from "./pages/HistoryScreen";
import { ReplayScreen } from "./pages/ReplayScreen";
import { LeaderboardScreen } from "./pages/LeaderboardScreen";
import { PausedScreen } from "./pages/PausedScreen";
import { useAuthStore } from "./store/auth";
import { AppleDefinitions } from "./components/AppleDefinitions";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/loading" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <AppleDefinitions />
      <Routes>
        <Route path="/loading" element={<LoadingScreen />} />
        <Route path="/" element={<Protected><HomeScreen /></Protected>} />
        <Route path="/create" element={<Protected><CreateGameScreen /></Protected>} />
        <Route path="/join/:gameId" element={<Protected><JoinGameScreen /></Protected>} />
        <Route path="/game/:gameId" element={<Protected><GameScreen /></Protected>} />
        <Route path="/profile" element={<Protected><ProfileScreen /></Protected>} />
        <Route path="/history" element={<Protected><HistoryScreen /></Protected>} />
        <Route path="/replay/:gameId" element={<Protected><ReplayScreen /></Protected>} />
        <Route path="/leaderboard" element={<Protected><LeaderboardScreen /></Protected>} />
        <Route path="/paused" element={<Protected><PausedScreen /></Protected>} />
        <Route path="*" element={<Navigate to="/loading" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

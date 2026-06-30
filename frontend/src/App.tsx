import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingScreen } from "./pages/LoadingScreen";
import { GamePickerScreen } from "./pages/GamePickerScreen";
import { ChessHubScreen } from "./pages/ChessHubScreen";
import { CreateGameScreen } from "./pages/CreateGameScreen";
import { JoinGameScreen } from "./pages/JoinGameScreen";
import { GameScreen } from "./pages/GameScreen";
import { LocalGameScreen } from "./pages/LocalGameScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { WhatsNewScreen } from "./pages/WhatsNewScreen";
import { HistoryScreen } from "./pages/HistoryScreen";
import { ReplayScreen } from "./pages/ReplayScreen";
import { LeaderboardScreen } from "./pages/LeaderboardScreen";
import { PausedScreen } from "./pages/PausedScreen";
import { SudokuScreen } from "./features/sudoku/SudokuScreen";
import { ForceDeflectorScreen } from "./features/forceDeflector/ForceDeflectorScreen";
import { CatanScreen } from "./features/catan/CatanScreen";
import { CatanBetaScreen } from "./features/catanBeta/CatanBetaScreen";
import { CatanV2Screen } from "./features/catanV2/CatanV2Screen";
import { ReaderScreen } from "./features/reader/ReaderScreen";
import { CheckersScreen } from "./features/checkers/CheckersScreen";
import { CardOfDayScreen } from "./features/cardOfDay/CardOfDayScreen";
import { useAuthStore } from "./store/auth";
import { usePieceStyleStore } from "./store/pieceStyle";
import { useThemeStore } from "./store/theme";
import { useVisualModeStore } from "./store/visualMode";
import { AppleDefinitions } from "./components/AppleDefinitions";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/loading" replace />;
  return <>{children}</>;
}

export function App() {
  useThemeStore(); // trigger hydration/initialization
  useVisualModeStore(); // trigger hydration/initialization
  usePieceStyleStore(); // trigger hydration/initialization
  return (
    <BrowserRouter>
      <div className="background-blobs" />
      <AppleDefinitions />
      <Routes>
        <Route path="/loading" element={<LoadingScreen />} />
        <Route path="/" element={<Protected><GamePickerScreen /></Protected>} />
        <Route path="/chess" element={<Protected><ChessHubScreen /></Protected>} />
        <Route path="/create" element={<Protected><CreateGameScreen /></Protected>} />
        <Route path="/join/:gameId" element={<Protected><JoinGameScreen /></Protected>} />
        <Route path="/game/:gameId" element={<Protected><GameScreen /></Protected>} />
        <Route path="/local" element={<Protected><LocalGameScreen /></Protected>} />
        <Route path="/profile" element={<Protected><ProfileScreen /></Protected>} />
        <Route path="/whats-new" element={<Protected><WhatsNewScreen /></Protected>} />
        <Route path="/history" element={<Protected><HistoryScreen /></Protected>} />
        <Route path="/replay/:gameId" element={<Protected><ReplayScreen /></Protected>} />
        <Route path="/leaderboard" element={<Protected><LeaderboardScreen /></Protected>} />
        <Route path="/paused" element={<Protected><PausedScreen /></Protected>} />
        <Route path="/sudoku" element={<Protected><SudokuScreen /></Protected>} />
        <Route path="/force-deflector" element={<Protected><ForceDeflectorScreen /></Protected>} />
        <Route path="/catan" element={<Protected><CatanScreen /></Protected>} />
        <Route path="/catan-beta" element={<Protected><CatanBetaScreen /></Protected>} />
        <Route path="/catan-v2" element={<Protected><CatanV2Screen /></Protected>} />
        <Route path="/reader" element={<Protected><ReaderScreen /></Protected>} />
        <Route path="/checkers" element={<Protected><CheckersScreen /></Protected>} />
        <Route path="/card-of-day" element={<Protected><CardOfDayScreen /></Protected>} />
        <Route path="*" element={<Navigate to="/loading" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

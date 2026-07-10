import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { beat, endSession, markResumed, setActiveAccount } from "./data/playStats";
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
import { NeurogridScreen } from "./features/neurogrid/NeurogridScreen";
import { WebgridScreen } from "./features/webgrid/WebgridScreen";
import { CatanScreen } from "./features/catan/CatanScreen";
import { CatanFableScreen } from "./features/catanFable/CatanFableScreen";
import { FableFactoryScreen } from "./features/fableFactory/FableFactoryScreen";
import { TicketToSonnetScreen } from "./features/ticketToSonnet/TicketToSonnetScreen";
import { CarcassonneScreen } from "./features/carcassonne/CarcassonneScreen";
import { MonopolyHpScreen } from "./features/monopolyHp/MonopolyHpScreen";
import { GarridokuScreen } from "./features/garridoku/GarridokuScreen";
import { OverquestScreen } from "./features/overquest/OverquestScreen";
import { MachkinScreen } from "./features/machkin/MachkinScreen";
import { BunkerScreen } from "./features/bunker/BunkerScreen";
import { ReaderScreen } from "./features/reader/ReaderScreen";
import { PdfStudioScreen } from "./features/pdfStudio/PdfStudioScreen";
import { CheckersScreen } from "./features/checkers/CheckersScreen";
import { CardOfDayScreen } from "./features/cardOfDay/CardOfDayScreen";
import { IcebreakerScreen } from "./features/icebreakers/IcebreakerScreen";
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

// Учёт времени в играх для статистики хаба (см. data/playStats). Живёт в корне роутера,
// чтобы тикать и во время игры (экраны/iframe остаются детьми App). Возврат на «/» и
// сворачивание/закрытие приложения закрывают сессию.
function PlaytimeTracker() {
  const location = useLocation();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    setActiveAccount(userId ?? null);
  }, [userId]);

  useEffect(() => {
    if (location.pathname === "/") endSession();
  }, [location.pathname]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") beat();
    }, 10_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") markResumed();
      else beat(); // зачесть время до момента сворачивания вкладки
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", endSession);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", endSession);
    };
  }, []);

  return null;
}

export function App() {
  useThemeStore(); // trigger hydration/initialization
  useVisualModeStore(); // trigger hydration/initialization
  usePieceStyleStore(); // trigger hydration/initialization
  return (
    <BrowserRouter>
      <div className="background-blobs" />
      <AppleDefinitions />
      <PlaytimeTracker />
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
        <Route path="/neurogrid" element={<Protected><NeurogridScreen /></Protected>} />
        <Route path="/webgrid" element={<Protected><WebgridScreen /></Protected>} />
        <Route path="/catan" element={<Protected><CatanScreen /></Protected>} />
        <Route path="/catan-fable" element={<Protected><CatanFableScreen /></Protected>} />
        <Route path="/fable-factory" element={<Protected><FableFactoryScreen /></Protected>} />
        <Route path="/ticket-to-sonnet" element={<Protected><TicketToSonnetScreen /></Protected>} />
        <Route path="/carcassonne" element={<Protected><CarcassonneScreen /></Protected>} />
        <Route path="/monopoly-hp" element={<Protected><MonopolyHpScreen /></Protected>} />
        <Route path="/garridoku" element={<Protected><GarridokuScreen /></Protected>} />
        <Route path="/overquest" element={<Protected><OverquestScreen /></Protected>} />
        <Route path="/machkin" element={<Protected><MachkinScreen /></Protected>} />
        <Route path="/bunker" element={<Protected><BunkerScreen /></Protected>} />
        <Route path="/reader" element={<Protected><ReaderScreen /></Protected>} />
        <Route path="/pdf-studio" element={<Protected><PdfStudioScreen /></Protected>} />
        <Route path="/checkers" element={<Protected><CheckersScreen /></Protected>} />
        <Route path="/card-of-day" element={<Protected><CardOfDayScreen /></Protected>} />
        <Route path="/icebreakers" element={<Protected><IcebreakerScreen /></Protected>} />
        <Route path="*" element={<Navigate to="/loading" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

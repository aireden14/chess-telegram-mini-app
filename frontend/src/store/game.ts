import { create } from "zustand";
import { GameStateDTO } from "../types";

interface GameState {
  game: GameStateDTO | null;
  myColor: "white" | "black" | null;
  opponentOnline: boolean;
  pendingPauseRequestBy: string | null;
  pendingDrawOfferBy: string | null;
  pendingResumeRequestBy: string | null;
  gameOver: { winner: string; reason: string } | null;
  toast: string | null;
  setGame: (g: GameStateDTO, myUserId: number) => void;
  patchGame: (patch: Partial<GameStateDTO>) => void;
  setOpponentOnline: (v: boolean) => void;
  setPauseRequestBy: (by: string | null) => void;
  setDrawOfferBy: (by: string | null) => void;
  setResumeRequestBy: (by: string | null) => void;
  setGameOver: (v: { winner: string; reason: string } | null) => void;
  setToast: (t: string | null) => void;
  reset: () => void;
}

function calcMyColor(g: GameStateDTO, myUserId: number): "white" | "black" | null {
  if (g.playerWhite?.id === myUserId) return "white";
  if (g.playerBlack?.id === myUserId) return "black";
  return null;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  myColor: null,
  opponentOnline: false,
  pendingPauseRequestBy: null,
  pendingDrawOfferBy: null,
  pendingResumeRequestBy: null,
  gameOver: null,
  toast: null,
  setGame(g, myUserId) {
    set({
      game: g,
      myColor: calcMyColor(g, myUserId),
      pendingPauseRequestBy: g.pauseRequestBy,
      pendingDrawOfferBy: g.drawOfferBy,
      gameOver: g.status === "COMPLETED" && g.winner
        ? { winner: g.winner, reason: g.endReason || "" }
        : null,
    });
  },
  patchGame(patch) {
    const g = get().game;
    if (!g) return;
    set({ game: { ...g, ...patch } });
  },
  setOpponentOnline(v) {
    set({ opponentOnline: v });
  },
  setPauseRequestBy(by) {
    set({ pendingPauseRequestBy: by });
  },
  setDrawOfferBy(by) {
    set({ pendingDrawOfferBy: by });
  },
  setResumeRequestBy(by) {
    set({ pendingResumeRequestBy: by });
  },
  setGameOver(v) {
    set({ gameOver: v });
  },
  setToast(t) {
    set({ toast: t });
    if (t) setTimeout(() => set({ toast: null }), 2500);
  },
  reset() {
    set({
      game: null,
      myColor: null,
      opponentOnline: false,
      pendingPauseRequestBy: null,
      pendingDrawOfferBy: null,
      pendingResumeRequestBy: null,
      gameOver: null,
    });
  },
}));

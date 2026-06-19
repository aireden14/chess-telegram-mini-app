import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizePieceStyle, PieceStyleType } from "../components/pieceStyles";

interface PieceStyleState {
  pieceStyle: PieceStyleType;
  setPieceStyle: (style: PieceStyleType) => void;
  hydratePieceStyle: (style: unknown) => void;
}

function applyPieceStyle(style: PieceStyleType) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-piece-style", style);
}

export const usePieceStyleStore = create<PieceStyleState>()(
  persist(
    (set) => ({
      pieceStyle: "v2png",
      setPieceStyle: (pieceStyle) => {
        const next = normalizePieceStyle(pieceStyle);
        set({ pieceStyle: next });
        applyPieceStyle(next);
      },
      hydratePieceStyle: (style) => {
        const next = normalizePieceStyle(style);
        set({ pieceStyle: next });
        applyPieceStyle(next);
      },
    }),
    {
      name: "chess-piece-style",
      onRehydrateStorage: () => (state) => {
        const next = normalizePieceStyle(state?.pieceStyle);
        state?.setPieceStyle(next);
        applyPieceStyle(next);
      },
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizePieceStyle, PieceStyleType } from "../components/pieceStyles";

interface PieceStyleState {
  pieceStyle: PieceStyleType;
  setPieceStyle: (style: PieceStyleType) => void;
  hydratePieceStyle: (style: unknown) => void;
}

export const usePieceStyleStore = create<PieceStyleState>()(
  persist(
    (set) => ({
      pieceStyle: "apple",
      setPieceStyle: (pieceStyle) => set({ pieceStyle }),
      hydratePieceStyle: (style) => set({ pieceStyle: normalizePieceStyle(style) }),
    }),
    { name: "chess-piece-style" },
  ),
);

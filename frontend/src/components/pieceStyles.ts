import { makeApplePieces } from "./ApplePieces";
import { makeClassicPieces } from "./ClassicPieces";
import { makeEmojiPieces } from "./EmojiPieces";

export type PieceStyleType = "apple" | "emoji" | "classic";

export const PIECE_STYLE_OPTIONS: {
  label: string;
  value: PieceStyleType;
  icon: string;
  preview: string;
  description: string;
}[] = [
  {
    label: "Liquid",
    value: "apple",
    icon: "◈",
    preview: "♔ ♕ ♖",
    description: "Pearl & gold",
  },
  {
    label: "Unicode",
    value: "classic",
    icon: "♔",
    preview: "♔ ♕ ♖",
    description: "Классические символы",
  },
  {
    label: "Playful",
    value: "emoji",
    icon: "♟",
    preview: "♚ ♛ ♜",
    description: "Фан-режим, не основной стиль",
  },
];

export function normalizePieceStyle(value: unknown): PieceStyleType {
  return value === "emoji" || value === "classic" || value === "apple" ? value : "apple";
}

export function makePiecesForStyle(style: PieceStyleType) {
  if (style === "classic") return makeClassicPieces();
  if (style === "emoji") return makeEmojiPieces();
  return makeApplePieces();
}

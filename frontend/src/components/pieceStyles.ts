import { makeApplePieces } from "./ApplePieces";
import { makeClassicPieces } from "./ClassicPieces";
import { makeEmojiPieces } from "./EmojiPieces";
import { makePngPieces } from "./PngPieces";

export type PieceStyleType = "apple" | "emoji" | "classic" | "v2png";

export const PIECE_STYLE_OPTIONS: {
  label: string;
  value: PieceStyleType;
  icon: string;
  preview: string;
  description: string;
}[] = [
  {
    label: "V2 PNG",
    value: "v2png",
    icon: "◆",
    preview: "♚ ♛ ♜",
    description: "Синие PNG-фигуры",
  },
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
  return value === "emoji" || value === "classic" || value === "apple" || value === "v2png" ? value : "v2png";
}

export function makePiecesForStyle(style: PieceStyleType) {
  if (style === "v2png") return makePngPieces();
  if (style === "classic") return makeClassicPieces();
  if (style === "emoji") return makeEmojiPieces();
  return makeApplePieces();
}

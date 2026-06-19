import { makeClassicBlackPieces, makeEmojiPngPieces, makePngPieces } from "./PngPieces";

export type PieceStyleType = "v2png" | "emojiPng" | "classicBlack";

export const PIECE_STYLE_OPTIONS: {
  label: string;
  value: PieceStyleType;
  icon: string;
  preview: string;
  description: string;
}[] = [
  {
    label: "Blue glass",
    value: "v2png",
    icon: "◆",
    preview: "♚ ♛ ♜",
    description: "Синий стеклянный стиль",
  },
  {
    label: "Emoji chess",
    value: "emojiPng",
    icon: "👑",
    preview: "👑 🏰 🐴",
    description: "Настоящие emoji PNG",
  },
  {
    label: "Classic black",
    value: "classicBlack",
    icon: "◐",
    preview: "♔ ♕ ♖",
    description: "Чёрно-белая классика",
  },
];

export function normalizePieceStyle(value: unknown): PieceStyleType {
  return value === "classicBlack" || value === "emojiPng" || value === "v2png" ? value : "v2png";
}

export function makePiecesForStyle(style: PieceStyleType) {
  if (style === "classicBlack") return makeClassicBlackPieces();
  if (style === "emojiPng") return makeEmojiPngPieces();
  if (style === "v2png") return makePngPieces();
  return makePngPieces();
}

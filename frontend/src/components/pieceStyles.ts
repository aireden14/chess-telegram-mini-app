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
    label: "Apple",
    value: "apple",
    icon: "◈",
    preview: "K Q R",
    description: "Глянцевые фигуры",
  },
  {
    label: "Emoji",
    value: "emoji",
    icon: "♟",
    preview: "👑 👸 🏰",
    description: "Старый emoji-стиль",
  },
  {
    label: "Unicode",
    value: "classic",
    icon: "♔",
    preview: "♔ ♕ ♖ / ♚ ♛ ♜",
    description: "Классические символы",
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

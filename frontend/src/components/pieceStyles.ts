import { makeEmojiPngPieces, makePngPieces } from "./PngPieces";

export type PieceStyleType = "v2png" | "emojiPng";

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
    label: "Emoji PNG",
    value: "emojiPng",
    icon: "●",
    preview: "♚ ♛ ♜",
    description: "Цветные PNG-фигуры",
  },
];

export function normalizePieceStyle(value: unknown): PieceStyleType {
  return value === "emojiPng" || value === "v2png" ? value : "v2png";
}

export function makePiecesForStyle(style: PieceStyleType) {
  if (style === "emojiPng") return makeEmojiPngPieces();
  if (style === "v2png") return makePngPieces();
  return makePngPieces();
}

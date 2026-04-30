import React from "react";

// Эмоджи-фигурки. react-chessboard принимает customPieces — функция возвращает компонент
// для каждой фигуры. Ключи: "wP", "wN", "wB", "wR", "wQ", "wK", "bP", ...

const EMOJI: Record<string, string> = {
  wK: "👑",
  wQ: "👸",
  wR: "🏰",
  wB: "🐘",
  wN: "🐴",
  wP: "♟️",
  bK: "👑",
  bQ: "👸",
  bR: "🏰",
  bB: "🐘",
  bN: "🐴",
  bP: "♟️",
};

export function makeEmojiPieces() {
  const pieces: Record<string, (props: any) => JSX.Element> = {};
  for (const key of Object.keys(EMOJI)) {
    pieces[key] = ({ squareWidth }: { squareWidth: number }) => (
      <div
        className="emoji-piece"
        style={{ width: squareWidth, height: squareWidth, fontSize: squareWidth * 0.8 }}
      >
        {EMOJI[key]}
      </div>
    );
  }
  return pieces;
}

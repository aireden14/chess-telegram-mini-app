import React from "react";

const CLASSIC_SYMBOLS: Record<string, string> = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

export function makeClassicPieces() {
  const pieces: Record<string, (props: any) => JSX.Element> = {};
  for (const key of Object.keys(CLASSIC_SYMBOLS)) {
    pieces[key] = ({ squareWidth }: { squareWidth: number }) => (
      <div
        className={`classic-piece classic-piece--${key[0]}`}
        style={{ width: squareWidth, height: squareWidth, fontSize: squareWidth * 0.82 }}
      >
        <span className="classic-piece__glyph">{CLASSIC_SYMBOLS[key]}</span>
      </div>
    );
  }
  return pieces;
}

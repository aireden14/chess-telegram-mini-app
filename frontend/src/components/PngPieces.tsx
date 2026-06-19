import React from "react";

const PIECE_KEYS = ["P", "N", "B", "R", "Q", "K"] as const;
const COLORS = ["w", "b"] as const;

function PngPiece({ pieceKey, squareWidth }: { pieceKey: string; squareWidth: number }) {
  return (
    <img
      className={`png-piece png-piece--${pieceKey[0]}`}
      src={`/pieces/v2-png/${pieceKey}.png`}
      alt=""
      draggable={false}
      style={{
        width: squareWidth,
        height: squareWidth,
      }}
    />
  );
}

export function makePngPieces() {
  const pieces: Record<string, (props: any) => JSX.Element> = {};

  for (const color of COLORS) {
    for (const type of PIECE_KEYS) {
      const key = `${color}${type}`;
      pieces[key] = ({ squareWidth }: { squareWidth: number }) => (
        <PngPiece pieceKey={key} squareWidth={squareWidth} />
      );
    }
  }

  return pieces;
}

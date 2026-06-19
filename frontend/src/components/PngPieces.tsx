import React from "react";

const PIECE_KEYS = ["P", "N", "B", "R", "Q", "K"] as const;
const COLORS = ["w", "b"] as const;
type PngPieceSet = "v2-png" | "emoji-png" | "classic-black";

function PngPiece({ pieceKey, pieceSet, squareWidth }: { pieceKey: string; pieceSet: PngPieceSet; squareWidth: number }) {
  return (
    <img
      className={`png-piece png-piece-set--${pieceSet} png-piece--${pieceKey[0]}`}
      src={`/pieces/${pieceSet}/${pieceKey}.png`}
      alt=""
      draggable={false}
      style={{
        width: squareWidth,
        height: squareWidth,
      }}
    />
  );
}

function makePieces(pieceSet: PngPieceSet) {
  const pieces: Record<string, (props: any) => JSX.Element> = {};

  for (const color of COLORS) {
    for (const type of PIECE_KEYS) {
      const key = `${color}${type}`;
      pieces[key] = ({ squareWidth }: { squareWidth: number }) => (
        <PngPiece pieceKey={key} pieceSet={pieceSet} squareWidth={squareWidth} />
      );
    }
  }

  return pieces;
}

export function makePngPieces() {
  return makePieces("v2-png");
}

export function makeEmojiPngPieces() {
  return makePieces("emoji-png");
}

export function makeClassicBlackPieces() {
  return makePieces("classic-black");
}

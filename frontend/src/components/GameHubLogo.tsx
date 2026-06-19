import React from "react";

export type GameIconKind = "chess" | "checkers" | "catan" | "sudoku" | "force";

function ChessIcon() {
  return (
    <svg className="game-symbol game-symbol-chess" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="14" className="game-symbol-tile" />
      <path d="M15 15H49V49H15V15Z" className="game-symbol-board" />
      <path d="M15 15H32V32H15V15ZM32 32H49V49H32V32Z" className="game-symbol-board-dark" />
      <path
        d="M26.8 43.5H43.7C43.7 39 41.2 36.8 37.6 35.4C41 32.8 42.5 29.5 41.3 24.8C39.8 19 34.6 17.6 30.6 20.8C33.8 23.2 33.1 26.4 30.2 28.6C27.2 30.9 24.9 33.6 26.2 37.5C26.9 39.5 26.8 41.1 26.8 43.5Z"
        className="game-symbol-main"
      />
      <path d="M24.4 49H46.1" className="game-symbol-stroke" />
      <circle cx="34.5" cy="24.3" r="1.6" className="game-symbol-eye" />
    </svg>
  );
}

function CheckersIcon() {
  return (
    <svg className="game-symbol game-symbol-checkers" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="14" className="game-symbol-tile" />
      <path d="M17 17H47V47H17V17Z" className="game-symbol-board" />
      <path d="M17 17H27V27H17V17ZM37 17H47V27H37V17ZM27 27H37V37H27V27ZM17 37H27V47H17V37ZM37 37H47V47H37V37Z" className="game-symbol-board-dark" />
      <ellipse cx="28" cy="37.5" rx="10" ry="5.5" className="game-symbol-disc-shadow" />
      <ellipse cx="28" cy="33.4" rx="10" ry="5.7" className="game-symbol-disc" />
      <ellipse cx="38" cy="28.4" rx="10" ry="5.5" className="game-symbol-disc-alt" />
      <ellipse cx="38" cy="25" rx="10" ry="5.8" className="game-symbol-disc-light" />
    </svg>
  );
}

function SudokuIcon() {
  return (
    <svg className="game-symbol game-symbol-sudoku" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="14" className="game-symbol-tile" />
      <rect x="16" y="16" width="32" height="32" rx="6" className="game-symbol-grid-bg" />
      <path d="M26.7 16V48M37.3 16V48M16 26.7H48M16 37.3H48" className="game-symbol-grid-line" />
      <path d="M16 16H48V48H16V16Z" className="game-symbol-grid-frame" />
      <text x="21.2" y="25.8" className="game-symbol-number">5</text>
      <text x="32.1" y="36.7" className="game-symbol-number">8</text>
      <text x="42.3" y="46.7" className="game-symbol-number">2</text>
    </svg>
  );
}

function CatanIcon() {
  return (
    <svg className="game-symbol game-symbol-catan" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="14" className="game-symbol-tile" />
      <path d="M32 13.8L47.8 22.9V41.1L32 50.2L16.2 41.1V22.9L32 13.8Z" className="game-symbol-main" />
      <path d="M32 13.8V50.2M16.2 22.9L47.8 41.1M47.8 22.9L16.2 41.1" className="game-symbol-stroke game-symbol-catan-lines" />
      <circle cx="32" cy="32" r="4.6" className="game-symbol-eye" />
    </svg>
  );
}

function ForceIcon() {
  return (
    <svg className="game-symbol game-symbol-force" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="14" className="game-symbol-tile" />
      <path d="M32 13L36.4 27.6L51 32L36.4 36.4L32 51L27.6 36.4L13 32L27.6 27.6L32 13Z" className="game-symbol-main" />
      <path d="M32 21V43M21 32H43" className="game-symbol-stroke" />
    </svg>
  );
}

export function GamePickerIcon({ type, fallback }: { type: GameIconKind; fallback?: string }) {
  if (type === "chess") return <ChessIcon />;
  if (type === "checkers") return <CheckersIcon />;
  if (type === "sudoku") return <SudokuIcon />;
  if (type === "catan") return <CatanIcon />;
  if (type === "force") return <ForceIcon />;
  return <>{fallback}</>;
}

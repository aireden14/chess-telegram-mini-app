import React from "react";

export type GameIconKind = "chess" | "checkers" | "catan" | "sudoku" | "force";

export function GameHubLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`game-hub-logo ${className}`} aria-hidden="true">
      <svg viewBox="0 0 128 128" role="img">
        <defs>
          <linearGradient id="hubLogoBlob" x1="24" y1="18" x2="106" y2="104" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A8C9FF" />
            <stop offset="0.48" stopColor="#536BFF" />
            <stop offset="1" stopColor="#1830FF" />
          </linearGradient>
          <linearGradient id="hubLogoCard" x1="43" y1="40" x2="94" y2="94" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EAF2FF" />
          </linearGradient>
          <filter id="hubLogoShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#1830FF" floodOpacity="0.34" />
          </filter>
          <filter id="hubLogoSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1437E8" floodOpacity="0.18" />
          </filter>
        </defs>

        <rect x="8" y="8" width="112" height="112" rx="30" fill="#FFFFFF" />
        <rect x="9" y="9" width="110" height="110" rx="29" fill="none" stroke="#EEF3FF" strokeWidth="2" />

        <g filter="url(#hubLogoShadow)">
          <path
            d="M36.6 49.7C37.4 35.4 50.9 25 64.6 31.2C72.4 19.9 90.6 24.4 92.7 38C105.9 40.1 110.4 57.4 100.7 66.2C108.2 78 98.2 94.6 83.6 91.7C76.2 103.2 58.2 100.9 54 88.1C42 91.5 29.2 82.3 31.9 69.8C21.2 62.6 24.3 47.5 36.6 49.7Z"
            fill="url(#hubLogoBlob)"
          />
          <path
            d="M43.8 39.8C53.4 29.8 67.4 34.4 69.8 46.3C74.8 39.8 86.9 43.1 88.4 52.7"
            fill="none"
            stroke="#D9E7FF"
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>

        <g filter="url(#hubLogoSoft)">
          <rect x="43" y="41" width="51" height="51" rx="15" fill="url(#hubLogoCard)" />
          <rect x="43" y="41" width="51" height="51" rx="15" fill="none" stroke="#C7D8FF" strokeWidth="1.8" />
          <path d="M68.5 44V89M46 66.5H91" stroke="#D5E2FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.78" />

          <g transform="translate(49 47)">
            <rect x="0" y="0" width="16" height="16" rx="4.5" fill="#F6F9FF" stroke="#9CB6FF" strokeWidth="1.2" />
            <path d="M5.1 13.8H11.8C11.8 11.3 10.4 10.1 8.8 9.4C10.2 8.3 10.7 7.1 10.2 5.1C9.6 2.9 7 2.7 5.6 3.9C7 4.8 6.8 6.1 5.5 7C4.2 7.9 3.7 9 4.3 10.5C4.8 11.7 5.1 12.5 5.1 13.8Z" fill="#3157F6" />
          </g>

          <g transform="translate(74 49)">
            <ellipse cx="6.1" cy="10.1" rx="6.1" ry="3.2" fill="#2447F5" opacity="0.3" />
            <ellipse cx="6.1" cy="7.2" rx="6.1" ry="3.4" fill="#3157F6" />
            <ellipse cx="6.1" cy="4.3" rx="6.1" ry="3.4" fill="#AFC6FF" />
          </g>

          <g transform="translate(51 72)">
            <rect x="0" y="0" width="15.5" height="15.5" rx="3.2" fill="#F6F9FF" stroke="#9CB6FF" strokeWidth="1.3" />
            <path d="M5.1 1.5V14M10.4 1.5V14M1.5 5.1H14M1.5 10.4H14" stroke="#3157F6" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
            <circle cx="3.4" cy="3.4" r="1.2" fill="#3157F6" />
            <circle cx="12.1" cy="7.8" r="1.2" fill="#3157F6" />
            <circle cx="7.8" cy="12.1" r="1.2" fill="#3157F6" opacity="0.72" />
          </g>

          <g transform="translate(75 73)">
            <path d="M7 0L9.1 4.9L14 7L9.1 9.1L7 14L4.9 9.1L0 7L4.9 4.9L7 0Z" fill="#3157F6" />
            <circle cx="7" cy="7" r="2.2" fill="#AFC6FF" />
          </g>
        </g>
      </svg>
    </span>
  );
}

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

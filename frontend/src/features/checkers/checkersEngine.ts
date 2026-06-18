// Russian draughts (шашки) engine.
// 8x8 board, men capture in all 4 diagonal directions, flying kings,
// mandatory capture (must take if a capture exists), multi-jump chains.

export type Color = "w" | "b";
export interface Piece {
  color: Color;
  king: boolean;
}
export type Board = (Piece | null)[]; // length 64, row-major

export interface Capture {
  to: number;
  captured: number;
}

const SIZE = 8;
const DIRS: Array<[number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export const idx = (r: number, c: number) => r * SIZE + c;
export const rc = (i: number) => [Math.floor(i / SIZE), i % SIZE] as const;
export const isDark = (r: number, c: number) => (r + c) % 2 === 1;
const inB = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export function initialBoard(): Board {
  const b: Board = Array(64).fill(null);
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (!isDark(r, c)) continue;
      if (r < 3) b[idx(r, c)] = { color: "b", king: false };
      else if (r > 4) b[idx(r, c)] = { color: "w", king: false };
    }
  }
  return b;
}

export function cloneBoard(b: Board): Board {
  return b.map((p) => (p ? { ...p } : null));
}

export function pieceCaptures(b: Board, i: number): Capture[] {
  const p = b[i];
  if (!p) return [];
  const [r, c] = rc(i);
  const res: Capture[] = [];
  if (!p.king) {
    for (const [dr, dc] of DIRS) {
      const er = r + dr;
      const ec = c + dc;
      const lr = r + 2 * dr;
      const lc = c + 2 * dc;
      if (!inB(lr, lc)) continue;
      const mid = b[idx(er, ec)];
      if (mid && mid.color !== p.color && !b[idx(lr, lc)]) {
        res.push({ to: idx(lr, lc), captured: idx(er, ec) });
      }
    }
  } else {
    for (const [dr, dc] of DIRS) {
      let rr = r + dr;
      let cc = c + dc;
      while (inB(rr, cc) && !b[idx(rr, cc)]) {
        rr += dr;
        cc += dc;
      }
      if (!inB(rr, cc)) continue;
      const mid = b[idx(rr, cc)];
      if (!mid || mid.color === p.color) continue;
      const captured = idx(rr, cc);
      let lr = rr + dr;
      let lc = cc + dc;
      while (inB(lr, lc) && !b[idx(lr, lc)]) {
        res.push({ to: idx(lr, lc), captured });
        lr += dr;
        lc += dc;
      }
    }
  }
  return res;
}

export function pieceSimpleMoves(b: Board, i: number): number[] {
  const p = b[i];
  if (!p) return [];
  const [r, c] = rc(i);
  const res: number[] = [];
  if (!p.king) {
    const fwd = p.color === "w" ? -1 : 1;
    for (const dc of [-1, 1]) {
      const nr = r + fwd;
      const nc = c + dc;
      if (inB(nr, nc) && !b[idx(nr, nc)]) res.push(idx(nr, nc));
    }
  } else {
    for (const [dr, dc] of DIRS) {
      let rr = r + dr;
      let cc = c + dc;
      while (inB(rr, cc) && !b[idx(rr, cc)]) {
        res.push(idx(rr, cc));
        rr += dr;
        cc += dc;
      }
    }
  }
  return res;
}

export function hasAnyCapture(b: Board, color: Color): boolean {
  for (let i = 0; i < 64; i += 1) {
    if (b[i]?.color === color && pieceCaptures(b, i).length) return true;
  }
  return false;
}

export function hasAnyMove(b: Board, color: Color): boolean {
  if (hasAnyCapture(b, color)) return true;
  for (let i = 0; i < 64; i += 1) {
    if (b[i]?.color === color && pieceSimpleMoves(b, i).length) return true;
  }
  return false;
}

export function countPieces(b: Board, color: Color): number {
  return b.reduce((n, p) => (p?.color === color ? n + 1 : n), 0);
}

// Legal targets for a piece, respecting global mandatory capture.
export function legalForPiece(b: Board, i: number): { captures: Capture[]; moves: number[] } {
  const p = b[i];
  if (!p) return { captures: [], moves: [] };
  const caps = pieceCaptures(b, i);
  if (hasAnyCapture(b, p.color)) return { captures: caps, moves: [] };
  return { captures: caps, moves: pieceSimpleMoves(b, i) };
}

function promote(b: Board, i: number) {
  const p = b[i];
  if (!p || p.king) return;
  const [r] = rc(i);
  if ((p.color === "w" && r === 0) || (p.color === "b" && r === SIZE - 1)) p.king = true;
}

// Apply a move/capture. Returns new board and whether the same piece must keep capturing.
export function applyMove(
  b: Board,
  from: number,
  to: number,
  captured: number | null,
): { board: Board; mustContinue: boolean; end: number } {
  const nb = cloneBoard(b);
  const p = nb[from]!;
  nb[to] = p;
  nb[from] = null;
  if (captured !== null) nb[captured] = null;
  promote(nb, to);
  let mustContinue = false;
  if (captured !== null && pieceCaptures(nb, to).length > 0) mustContinue = true;
  return { board: nb, mustContinue, end: to };
}

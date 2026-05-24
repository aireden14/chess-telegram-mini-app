import { SudokuDifficulty, SudokuPuzzle } from "./types";

const SIZE = 9;
const CELLS = 81;

const TARGET_GIVENS: Record<SudokuDifficulty, number> = {
  easy: 43,
  medium: 36,
  hard: 31,
  expert: 27,
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: string) {
  let t = hashSeed(seed) || 1;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pattern(row: number, col: number): number {
  return (row * 3 + Math.floor(row / 3) + col) % SIZE;
}

function buildSolution(seed: string): number[] {
  const rng = makeRng(seed);
  const base = [0, 1, 2];
  const rows = shuffle(base, rng).flatMap((band) =>
    shuffle(base, rng).map((row) => band * 3 + row),
  );
  const cols = shuffle(base, rng).flatMap((stack) =>
    shuffle(base, rng).map((col) => stack * 3 + col),
  );
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);

  const solution: number[] = [];
  for (const row of rows) {
    for (const col of cols) {
      solution.push(nums[pattern(row, col)]);
    }
  }
  return solution;
}

function candidates(grid: Array<number | null>, index: number): number[] {
  if (grid[index]) return [];
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const used = new Set<number>();

  for (let i = 0; i < SIZE; i += 1) {
    const rowValue = grid[row * SIZE + i];
    const colValue = grid[i * SIZE + col];
    if (rowValue) used.add(rowValue);
    if (colValue) used.add(colValue);
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      const value = grid[r * SIZE + c];
      if (value) used.add(value);
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}

function findBestEmpty(grid: Array<number | null>): { index: number; values: number[] } | null {
  let best: { index: number; values: number[] } | null = null;
  for (let index = 0; index < CELLS; index += 1) {
    if (grid[index] !== null) continue;
    const values = candidates(grid, index);
    if (values.length === 0) return { index, values };
    if (!best || values.length < best.values.length) {
      best = { index, values };
      if (values.length === 1) return best;
    }
  }
  return best;
}

export function countSolutions(grid: Array<number | null>, limit = 2): number {
  const draft = [...grid];
  let count = 0;

  function solve(): void {
    if (count >= limit) return;
    const empty = findBestEmpty(draft);
    if (!empty) {
      count += 1;
      return;
    }
    if (empty.values.length === 0) return;

    for (const value of empty.values) {
      draft[empty.index] = value;
      solve();
      draft[empty.index] = null;
      if (count >= limit) return;
    }
  }

  solve();
  return count;
}

export function hasUniqueSolution(grid: Array<number | null>): boolean {
  return countSolutions(grid, 2) === 1;
}

function carvePuzzle(solution: number[], difficulty: SudokuDifficulty, seed: string): Array<number | null> {
  const rng = makeRng(`${seed}:carve`);
  const givensTarget = TARGET_GIVENS[difficulty];
  const puzzle: Array<number | null> = [...solution];
  const order = shuffle(Array.from({ length: CELLS }, (_, i) => i), rng);

  for (const index of order) {
    const currentGivens = puzzle.filter((value) => value !== null).length;
    if (currentGivens <= givensTarget) break;

    const previous = puzzle[index];
    puzzle[index] = null;
    if (!hasUniqueSolution(puzzle)) {
      puzzle[index] = previous;
    }
  }

  return puzzle;
}

export function generateSudokuPuzzle(
  difficulty: SudokuDifficulty,
  options: { seed?: string; mode?: "classic" | "daily"; dailyDate?: string } = {},
): SudokuPuzzle {
  const seed =
    options.seed ||
    `${difficulty}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  const solution = buildSolution(seed);
  const givens = carvePuzzle(solution, difficulty, seed);

  return {
    id: `${options.mode || "classic"}-${difficulty}-${hashSeed(seed).toString(36)}`,
    difficulty,
    givens,
    solution,
    createdAt: Date.now(),
    mode: options.mode || "classic",
    dailyDate: options.dailyDate,
  };
}

export function getTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function generateDailySudoku(dateKey = getTodayKey()): SudokuPuzzle {
  return generateSudokuPuzzle("medium", {
    seed: `daily-sudoku-${dateKey}`,
    mode: "daily",
    dailyDate: dateKey,
  });
}

export function isSolved(entries: Array<number | null>, solution: number[]): boolean {
  return entries.length === CELLS && entries.every((value, index) => value === solution[index]);
}

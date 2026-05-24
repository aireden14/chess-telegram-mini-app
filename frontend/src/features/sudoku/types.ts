export type SudokuDifficulty = "easy" | "medium" | "hard" | "expert";
export type SudokuCheckMode = "instant" | "manual";

export interface SudokuCell {
  index: number;
  row: number;
  col: number;
  value: number | null;
  solution: number;
  given: boolean;
  notes: number[];
}

export interface SudokuPuzzle {
  id: string;
  difficulty: SudokuDifficulty;
  givens: Array<number | null>;
  solution: number[];
  createdAt: number;
  mode: "classic" | "daily";
  dailyDate?: string;
}

export interface SudokuStats {
  played: number;
  completed: number;
  bestTimes: Record<SudokuDifficulty, number | null>;
  dailyStreak: number;
  lastDailyDate: string | null;
}

export interface SudokuGameState {
  puzzle: SudokuPuzzle | null;
  entries: Array<number | null>;
  notes: number[][];
  selectedIndex: number | null;
  selectedNumber: number | null;
  notesMode: boolean;
  checkMode: SudokuCheckMode;
  checkedAt: number | null;
  mistakes: number;
  hintsUsed: number;
  elapsedSeconds: number;
  lastTickAt: number | null;
  isComplete: boolean;
  victory: {
    difficulty: SudokuDifficulty;
    elapsedSeconds: number;
    mistakes: number;
    hintsUsed: number;
    mode: "classic" | "daily";
  } | null;
}

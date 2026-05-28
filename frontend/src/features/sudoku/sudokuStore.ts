import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateDailySudoku,
  generateSudokuPuzzle,
  getTodayKey,
  isSolved,
} from "./sudokuEngine";
import { SudokuCheckMode, SudokuDifficulty, SudokuGameState, SudokuStats } from "./types";

type Snapshot = Pick<
  SudokuGameState,
  | "entries"
  | "notes"
  | "mistakes"
  | "hintsUsed"
  | "selectedIndex"
  | "selectedNumber"
  | "checkedAt"
  | "isComplete"
  | "victory"
>;

interface SudokuStore extends SudokuGameState {
  stats: SudokuStats;
  undoStack: Snapshot[];
  startNew: (difficulty: SudokuDifficulty) => void;
  startDaily: () => void;
  selectCell: (index: number) => void;
  selectNumber: (value: number | null) => void;
  enterNumber: (value: number, targetIndex?: number) => "ok" | "error" | "note" | "blocked" | "complete";
  erase: () => void;
  undo: () => void;
  hint: () => "ok" | "blocked" | "complete";
  checkPuzzle: () => "clean" | "errors" | "complete" | "blocked";
  tick: () => void;
  setCheckMode: (mode: SudokuCheckMode) => void;
  toggleNotesMode: () => void;
  dismissVictory: () => void;
}

const emptyNotes = () => Array.from({ length: 81 }, () => [] as number[]);

const defaultStats = (): SudokuStats => ({
  played: 0,
  completed: 0,
  bestTimes: { easy: null, medium: null, hard: null, expert: null },
  dailyStreak: 0,
  lastDailyDate: null,
});

function snapshot(state: SudokuStore): Snapshot {
  return {
    entries: [...state.entries],
    notes: state.notes.map((cell) => [...cell]),
    mistakes: state.mistakes,
    hintsUsed: state.hintsUsed,
    selectedIndex: state.selectedIndex,
    selectedNumber: state.selectedNumber,
    checkedAt: state.checkedAt,
    isComplete: state.isComplete,
    victory: state.victory,
  };
}

function isGiven(state: SudokuStore, index: number): boolean {
  return state.puzzle?.givens[index] !== null;
}

function peersOf(index: number): number[] {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const peers = new Set<number>();
  for (let i = 0; i < 9; i += 1) {
    peers.add(row * 9 + i);
    peers.add(i * 9 + col);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      peers.add(r * 9 + c);
    }
  }
  peers.delete(index);
  return [...peers];
}

function cleanPeerNotes(notes: number[][], index: number, value: number): number[][] {
  const next = notes.map((cell) => [...cell]);
  for (const peer of peersOf(index)) {
    next[peer] = next[peer].filter((note) => note !== value);
  }
  return next;
}

function completeStats(state: SudokuStore): Pick<SudokuStore, "stats" | "victory" | "isComplete"> {
  const puzzle = state.puzzle!;
  const currentBest = state.stats.bestTimes[puzzle.difficulty];
  const bestTimes = {
    ...state.stats.bestTimes,
    [puzzle.difficulty]:
      currentBest === null ? state.elapsedSeconds : Math.min(currentBest, state.elapsedSeconds),
  };

  let dailyStreak = state.stats.dailyStreak;
  let lastDailyDate = state.stats.lastDailyDate;
  if (puzzle.mode === "daily" && puzzle.dailyDate && state.stats.lastDailyDate !== puzzle.dailyDate) {
    const previous = state.stats.lastDailyDate ? new Date(`${state.stats.lastDailyDate}T00:00:00Z`) : null;
    const current = new Date(`${puzzle.dailyDate}T00:00:00Z`);
    const diffDays = previous
      ? Math.round((current.getTime() - previous.getTime()) / 86400000)
      : 0;
    dailyStreak = previous && diffDays === 1 ? state.stats.dailyStreak + 1 : 1;
    lastDailyDate = puzzle.dailyDate;
  }

  return {
    isComplete: true,
    victory: {
      difficulty: puzzle.difficulty,
      elapsedSeconds: state.elapsedSeconds,
      mistakes: state.mistakes,
      hintsUsed: state.hintsUsed,
      mode: puzzle.mode,
    },
    stats: {
      ...state.stats,
      completed: state.stats.completed + 1,
      bestTimes,
      dailyStreak,
      lastDailyDate,
    },
  };
}

function startFromPuzzle(
  puzzle: NonNullable<SudokuGameState["puzzle"]>,
  stats: SudokuStats,
): Partial<SudokuStore> {
  return {
    puzzle,
    entries: [...puzzle.givens],
    notes: emptyNotes(),
    selectedIndex: null,
    selectedNumber: null,
    notesMode: false,
    checkedAt: null,
    mistakes: 0,
    hintsUsed: 0,
    elapsedSeconds: 0,
    lastTickAt: Date.now(),
    isComplete: false,
    victory: null,
    undoStack: [],
    stats: { ...stats, played: stats.played + 1 },
  };
}

export const useSudokuStore = create<SudokuStore>()(
  persist(
    (set, get) => ({
      puzzle: null,
      entries: [],
      notes: emptyNotes(),
      selectedIndex: null,
      selectedNumber: null,
      notesMode: false,
      checkMode: "instant",
      checkedAt: null,
      mistakes: 0,
      hintsUsed: 0,
      elapsedSeconds: 0,
      lastTickAt: null,
      isComplete: false,
      victory: null,
      undoStack: [],
      stats: defaultStats(),
      startNew(difficulty) {
        const puzzle = generateSudokuPuzzle(difficulty);
        set((state) => startFromPuzzle(puzzle, state.stats));
      },
      startDaily() {
        const today = getTodayKey();
        const puzzle = generateDailySudoku(today);
        set((state) => startFromPuzzle(puzzle, state.stats));
      },
      selectCell(index) {
        if (index < 0 || index > 80) return;
        set({ selectedIndex: index });
      },
      selectNumber(value) {
        if (value !== null && (value < 1 || value > 9)) return;
        set({ selectedNumber: value });
      },
      enterNumber(value, targetIndex) {
        const state = get();
        const index = targetIndex ?? state.selectedIndex;
        if (!state.puzzle || index === null || isGiven(state, index) || state.isComplete) return "blocked";
        if (value < 1 || value > 9) return "blocked";

        if (state.notesMode) {
          const notes = state.notes.map((cell) => [...cell]);
          notes[index] = notes[index].includes(value)
            ? notes[index].filter((note) => note !== value)
            : [...notes[index], value].sort();
          set({
            notes,
            selectedIndex: index,
            undoStack: [snapshot(state), ...state.undoStack].slice(0, 40),
          });
          return "note";
        }

        const entries = [...state.entries];
        const isCorrect = value === state.puzzle.solution[index];
        const notes = isCorrect
          ? cleanPeerNotes(state.notes, index, value)
          : state.notes.map((cell) => [...cell]);
        entries[index] = value;
        notes[index] = [];
        const mistakes = !isCorrect && state.checkMode === "instant" ? state.mistakes + 1 : state.mistakes;
        const nextState = {
          entries,
          notes,
          mistakes,
          selectedIndex: index,
          checkedAt: isCorrect ? state.checkedAt : state.checkMode === "instant" ? Date.now() : state.checkedAt,
          undoStack: [snapshot(state), ...state.undoStack].slice(0, 40),
        };
        if (isSolved(entries, state.puzzle.solution)) {
          set({ ...nextState, ...completeStats({ ...state, ...nextState }) });
          return "complete";
        }
        set(nextState);
        return isCorrect || state.checkMode === "manual" ? "ok" : "error";
      },
      erase() {
        const state = get();
        const index = state.selectedIndex;
        if (!state.puzzle || index === null || isGiven(state, index) || state.isComplete) return;
        const entries = [...state.entries];
        const notes = state.notes.map((cell) => [...cell]);
        entries[index] = null;
        notes[index] = [];
        set({
          entries,
          notes,
          checkedAt: null,
          undoStack: [snapshot(state), ...state.undoStack].slice(0, 40),
        });
      },
      undo() {
        const state = get();
        const [previous, ...rest] = state.undoStack;
        if (!previous) return;
        set({ ...previous, undoStack: rest });
      },
      hint() {
        const state = get();
        if (!state.puzzle || state.isComplete) return "blocked";
        const preferred = state.selectedIndex;
        const target =
          preferred !== null && !isGiven(state, preferred) && state.entries[preferred] !== state.puzzle.solution[preferred]
            ? preferred
            : state.entries.findIndex(
                (entry, index) => !isGiven(state, index) && entry !== state.puzzle!.solution[index],
              );
        if (target < 0) return "blocked";

        const entries = [...state.entries];
        const notes = cleanPeerNotes(state.notes, target, state.puzzle.solution[target]);
        entries[target] = state.puzzle.solution[target];
        notes[target] = [];
        const nextState = {
          entries,
          notes,
          selectedIndex: target,
          hintsUsed: state.hintsUsed + 1,
          checkedAt: null,
          undoStack: [snapshot(state), ...state.undoStack].slice(0, 40),
        };
        if (isSolved(entries, state.puzzle.solution)) {
          set({ ...nextState, ...completeStats({ ...state, ...nextState }) });
          return "complete";
        }
        set(nextState);
        return "ok";
      },
      checkPuzzle() {
        const state = get();
        if (!state.puzzle || state.isComplete) return "blocked";
        if (isSolved(state.entries, state.puzzle.solution)) {
          set({ checkedAt: Date.now(), ...completeStats(state) });
          return "complete";
        }
        const hasWrongEntry = state.entries.some(
          (entry, index) => entry !== null && entry !== state.puzzle!.solution[index],
        );
        if (hasWrongEntry) {
          set({ checkedAt: Date.now(), mistakes: state.mistakes + 1 });
          return "errors";
        }
        set({ checkedAt: Date.now() });
        return "clean";
      },
      tick() {
        const state = get();
        if (!state.puzzle || state.isComplete) return;
        const now = Date.now();
        if (!state.lastTickAt) {
          set({ lastTickAt: now });
          return;
        }
        const delta = Math.max(0, Math.floor((now - state.lastTickAt) / 1000));
        if (delta > 0) {
          set({ elapsedSeconds: state.elapsedSeconds + delta, lastTickAt: now });
        }
      },
      toggleNotesMode() {
        set((state) => ({ notesMode: !state.notesMode }));
      },
      setCheckMode(mode) {
        set((state) => ({
          checkMode: mode,
          checkedAt: mode === "instant" ? state.checkedAt : null,
        }));
      },
      dismissVictory() {
        set({ victory: null });
      },
    }),
    {
      name: "chess-app-sudoku-v1",
      partialize: (state) => ({
        puzzle: state.puzzle,
        entries: state.entries,
        notes: state.notes,
        selectedIndex: state.selectedIndex,
        selectedNumber: state.selectedNumber,
        notesMode: state.notesMode,
        checkMode: state.checkMode,
        checkedAt: state.checkedAt,
        mistakes: state.mistakes,
        hintsUsed: state.hintsUsed,
        elapsedSeconds: state.elapsedSeconds,
        isComplete: state.isComplete,
        victory: state.victory,
        stats: state.stats,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.lastTickAt = Date.now();
          state.selectedNumber = state.selectedNumber ?? null;
          state.checkMode = state.checkMode ?? "instant";
          state.checkedAt = state.checkedAt ?? null;
        }
      },
    },
  ),
);

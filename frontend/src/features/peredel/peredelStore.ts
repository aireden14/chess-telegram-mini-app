import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateSudokuPuzzle } from "../sudoku/sudokuEngine";
import { analyzePuzzle, cellCandidates, findDeduction } from "../sudoku/sudokuLogic";

const CELLS = 81;
/** Заморозка после промаха — единственное наказание, очки не отнимаем. */
const FREEZE_MS = 3000;

export type Owner = "you" | "bot" | null;
export type PeredelStatus = "playing" | "finished";

export interface BotLevel {
  id: string;
  title: string;
  /** Потолок приёмов решателя: бот физически не видит того, что сложнее. */
  maxTier: number;
  /** Пауза между ходами. */
  delayMs: number;
  desc: string;
}

export const BOT_LEVELS: BotLevel[] = [
  { id: "rookie", title: "Новичок", maxTier: 1, delayMs: 5200, desc: "Видит только голые одиночки и медлит" },
  { id: "steady", title: "Уверенный", maxTier: 2, delayMs: 3600, desc: "Добавляет скрытые одиночки" },
  { id: "master", title: "Мастер", maxTier: 3, delayMs: 2500, desc: "Ещё и указующие пары, думает быстро" },
  { id: "grandmaster", title: "Гроссмейстер", maxTier: 6, delayMs: 1700, desc: "Пары, тройки и X-Wing почти без пауз" },
];

export function botLevelById(id: string): BotLevel {
  return BOT_LEVELS.find((level) => level.id === id) || BOT_LEVELS[1];
}

export interface PeredelResult {
  youScore: number;
  botScore: number;
  youCells: number;
  botCells: number;
  mistakes: number;
  levelId: string;
}

interface PeredelState {
  givens: Array<number | null>;
  solution: number[];
  entries: Array<number | null>;
  owners: Owner[];
  candidates: number[][];

  levelId: string;
  status: PeredelStatus;
  selectedIndex: number | null;
  showCandidates: boolean;

  youScore: number;
  botScore: number;
  mistakes: number;

  frozenUntil: number;
  botNextAt: number;
  lastBotIndex: number | null;
  /** Всплывающая цена только что взятой клетки. */
  flash: { index: number; points: number; owner: Owner } | null;

  result: PeredelResult | null;
  bestScores: Record<string, number>;

  start: (levelId?: string) => void;
  select: (index: number) => void;
  place: (digit: number) => "taken" | "miss" | "blocked";
  tick: (now: number) => void;
  toggleCandidates: () => void;
  clearFlash: () => void;
  dismissResult: () => void;
}

/**
 * Расклад для «Передела» обязан проходиться логикой до конца.
 *
 * Обычный «Сложно» этого не гарантирует (замер: примерно один расклад из
 * двадцати пяти требует перебора). Боту такой расклад не страшен — он просто
 * встанет, — но игра превратится в тупик, поэтому такие отбраковываем.
 */
function buildPuzzle() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const puzzle = generateSudokuPuzzle("hard");
    if (analyzePuzzle(puzzle.givens, 8).solvable) return puzzle;
  }
  return generateSudokuPuzzle("medium");
}

function countCells(owners: Owner[], owner: Owner): number {
  return owners.filter((value) => value === owner).length;
}

export const usePeredel = create<PeredelState>()(
  persist(
    (set, get) => ({
      givens: [],
      solution: [],
      entries: [],
      owners: [],
      candidates: [],

      levelId: "steady",
      status: "finished",
      selectedIndex: null,
      showCandidates: true,

      youScore: 0,
      botScore: 0,
      mistakes: 0,

      frozenUntil: 0,
      botNextAt: 0,
      lastBotIndex: null,
      flash: null,

      result: null,
      bestScores: {},

      start(levelId) {
        const level = botLevelById(levelId ?? get().levelId);
        const puzzle = buildPuzzle();
        const now = Date.now();
        set({
          givens: puzzle.givens,
          solution: puzzle.solution,
          entries: [...puzzle.givens],
          owners: Array.from({ length: CELLS }, () => null),
          candidates: cellCandidates(puzzle.givens),
          levelId: level.id,
          status: "playing",
          selectedIndex: null,
          youScore: 0,
          botScore: 0,
          mistakes: 0,
          frozenUntil: 0,
          // Фора на осмотр доски, иначе бот начинает щёлкать раньше, чем игрок вчитался.
          botNextAt: now + level.delayMs + 1500,
          lastBotIndex: null,
          flash: null,
          result: null,
        });
      },

      select(index) {
        const state = get();
        if (state.status !== "playing") return;
        if (index < 0 || index >= CELLS) return;
        if (state.entries[index] !== null) return;
        set({ selectedIndex: index });
      },

      place(digit) {
        const state = get();
        const index = state.selectedIndex;
        if (state.status !== "playing" || index === null) return "blocked";
        if (Date.now() < state.frozenUntil) return "blocked";
        if (state.entries[index] !== null) return "blocked";
        if (digit < 1 || digit > 9) return "blocked";

        if (digit !== state.solution[index]) {
          // Промах не пишется в сетку: расклад обязан оставаться логически чистым,
          // иначе бот начнёт выводить ходы из чужой ошибки.
          set({ mistakes: state.mistakes + 1, frozenUntil: Date.now() + FREEZE_MS });
          return "miss";
        }

        const points = Math.max(1, state.candidates[index]?.length || 1);
        const entries = [...state.entries];
        const owners = [...state.owners];
        entries[index] = digit;
        owners[index] = "you";

        set({
          entries,
          owners,
          candidates: cellCandidates(entries),
          youScore: state.youScore + points,
          selectedIndex: null,
          flash: { index, points, owner: "you" },
        });
        get().tick(Date.now());
        return "taken";
      },

      tick(now) {
        const state = get();
        if (state.status !== "playing") return;

        if (state.entries.every((value) => value !== null)) {
          const result: PeredelResult = {
            youScore: state.youScore,
            botScore: state.botScore,
            youCells: countCells(state.owners, "you"),
            botCells: countCells(state.owners, "bot"),
            mistakes: state.mistakes,
            levelId: state.levelId,
          };
          const previousBest = state.bestScores[state.levelId] ?? 0;
          set({
            status: "finished",
            result,
            bestScores:
              state.youScore > previousBest
                ? { ...state.bestScores, [state.levelId]: state.youScore }
                : state.bestScores,
          });
          return;
        }

        if (now < state.botNextAt) return;

        const level = botLevelById(state.levelId);
        const move = findDeduction(state.entries, level.maxTier);
        if (!move) {
          // Боту нечего вывести — ждёт, пока игрок откроет ему дорогу.
          set({ botNextAt: now + Math.max(600, level.delayMs / 2) });
          return;
        }

        const points = Math.max(1, state.candidates[move.index]?.length || 1);
        const entries = [...state.entries];
        const owners = [...state.owners];
        entries[move.index] = move.digit;
        owners[move.index] = "bot";

        set({
          entries,
          owners,
          candidates: cellCandidates(entries),
          botScore: state.botScore + points,
          botNextAt: now + level.delayMs,
          lastBotIndex: move.index,
          selectedIndex: state.selectedIndex === move.index ? null : state.selectedIndex,
          flash: { index: move.index, points, owner: "bot" },
        });
      },

      toggleCandidates() {
        set((state) => ({ showCandidates: !state.showCandidates }));
      },

      clearFlash() {
        set({ flash: null });
      },

      dismissResult() {
        set({ result: null });
      },
    }),
    {
      name: "gamepass-peredel-v1",
      // Партию не храним: она реального времени, восстанавливать её на полпути
      // нечестно по отношению к боту (его таймер сбросится).
      partialize: (state) => ({
        levelId: state.levelId,
        showCandidates: state.showCandidates,
        bestScores: state.bestScores,
      }),
    },
  ),
);

// Крючок для прогона партии в дев-сборке (см. приём с selftest у остальных игр).
// В прод не попадает: Vite вырезает ветку по import.meta.env.DEV.
if (import.meta.env.DEV) {
  (window as unknown as { PEREDEL?: unknown }).PEREDEL = usePeredel;
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LESSON_COUNT } from "./lessons";

/**
 * Прогресс «Школы судоку» — только на устройстве.
 *
 * Уроки намеренно не трогают ни рейтинг, ни опыт: тренажёр должен быть местом,
 * где не страшно ошибиться, а любая цифра в общем зачёте превращает его в ещё
 * одну гонку. Поэтому здесь нет ни таймера, ни счётчика промахов.
 */
interface SchoolStore {
  completed: number[];
  /** Пропущенные открывают следующий урок, но галочкой не считаются. */
  skipped: number[];
  complete: (id: number) => void;
  skip: (id: number) => void;
  reset: () => void;
}

export const useSudokuSchool = create<SchoolStore>()(
  persist(
    (set) => ({
      completed: [],
      skipped: [],
      complete: (id) =>
        set((state) => ({
          completed: state.completed.includes(id) ? state.completed : [...state.completed, id],
          skipped: state.skipped.filter((item) => item !== id),
        })),
      skip: (id) =>
        set((state) =>
          state.completed.includes(id) || state.skipped.includes(id)
            ? state
            : { ...state, skipped: [...state.skipped, id] },
        ),
      reset: () => set({ completed: [], skipped: [] }),
    }),
    { name: "gamepass-sudoku-school" },
  ),
);

/** Урок открыт, если все предыдущие сданы или пропущены. */
export function isLessonOpen(id: number, completed: number[], skipped: number[]): boolean {
  for (let previous = 1; previous < id; previous += 1) {
    if (!completed.includes(previous) && !skipped.includes(previous)) return false;
  }
  return true;
}

/** Первый несданный урок — на него ведёт кнопка «Продолжить». */
export function nextLesson(completed: number[]): number {
  for (let id = 1; id <= LESSON_COUNT; id += 1) if (!completed.includes(id)) return id;
  return LESSON_COUNT;
}

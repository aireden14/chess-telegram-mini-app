import type {
  PreparedLayout,
  TrainingDashboard,
  TrainingExercise,
  TrainingMode,
  TrainingSession,
  TrainingState,
} from "./types";

export const MODE_META: Record<TrainingMode, { label: string; eyebrow: string; note: string }> = {
  sick: { label: "БОЛЕЮ", eyebrow: "1 спокойный подход", note: "Сохранить ритм без давления" },
  light: { label: "ЛАЙТОВЫЙ", eyebrow: "Мягкий день", note: "Коротко, но день закрыт" },
  medium: { label: "СРЕДНИЙ", eyebrow: "Рабочий темп", note: "Уверенная дневная нагрузка" },
  record: { label: "РЕКОРДСМЕН", eyebrow: "+ шаг после победы", note: "Качает личную цель упражнения" },
};

export const MODE_ORDER: TrainingMode[] = ["sick", "light", "medium", "record"];

export function targetForMode(exercise: TrainingExercise, mode: TrainingMode): number {
  return mode === "record" ? exercise.recordTarget : exercise.levels[mode];
}

export function isUnlocked(exercise: TrainingExercise, state: TrainingState): boolean {
  if (!exercise.unlockAfterExerciseId) return true;
  const previous = state.exercises.find((item) => item.id === exercise.unlockAfterExerciseId);
  if (!previous) return true;
  const threshold = exercise.unlockAtTarget ?? previous.recordCap;
  return threshold != null && previous.recordTarget >= threshold;
}

export function activeExercises(state: TrainingState): TrainingExercise[] {
  return state.exercises.filter((exercise) => exercise.active && isUnlocked(exercise, state));
}

function splitEven(total: number, count: number): number[] {
  const safeCount = Math.max(1, Math.min(count, total));
  const base = Math.floor(total / safeCount);
  const extra = total % safeCount;
  return Array.from({ length: safeCount }, (_, index) => base + (index < extra ? 1 : 0));
}

function strongStart(total: number, leadSet: number): number[] {
  if (total < 3) return [total];
  const first = Math.max(1, Math.min(leadSet, Math.ceil(total * 0.44), total - 2));
  return [first, ...splitEven(total - first, 2)];
}

export function preparedLayouts(exercise: TrainingExercise, mode: TrainingMode): PreparedLayout[] {
  const target = targetForMode(exercise, mode);
  if (mode === "sick") {
    return [{ id: "one", title: "Один раз — и всё", hint: "Без таймера между подходами", sets: [target] }];
  }
  const options: PreparedLayout[] = [
    {
      id: "habit",
      title: "Сильный старт",
      hint: "Первый подход — самый большой",
      sets: strongStart(target, exercise.leadSet),
    },
    {
      id: "balanced",
      title: "Ровно",
      hint: "Три почти одинаковых подхода",
      sets: splitEven(target, 3),
    },
    {
      id: "short",
      title: "Короткими",
      hint: "Четыре небольших подхода",
      sets: splitEven(target, 4),
    },
  ];
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.sets.join("+");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", options || { day: "numeric", month: "long" }).format(date);
}

export function shortWeekday(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date).replace(".", "");
}

export function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function optimisticDashboard(
  dashboard: TrainingDashboard,
  session: TrainingSession,
): TrainingDashboard {
  const previous = dashboard.history.find((item) => item.dateKey === session.dateKey);
  const history = [session, ...dashboard.history.filter((item) => item.dateKey !== session.dateKey)]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const state: TrainingState = session.mode !== "record" || previous
    ? dashboard.state
    : {
        ...dashboard.state,
        exercises: dashboard.state.exercises.map((exercise) => {
          if (!session.actual.some((item) => item.exerciseId === exercise.id)) return exercise;
          const next = exercise.recordTarget + exercise.recordStep;
          return {
            ...exercise,
            recordTarget: exercise.recordCap == null ? next : Math.min(next, exercise.recordCap),
          };
        }),
      };
  const dates = new Set(history.map((item) => item.dateKey));
  let currentStreak = 0;
  let cursor = session.dateKey;
  while (dates.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return {
    ...dashboard,
    state,
    today: session,
    history,
    stats: {
      currentStreak,
      bestStreak: Math.max(dashboard.stats.bestStreak, currentStreak),
      totalWorkouts: dashboard.stats.totalWorkouts + (previous ? 0 : 1),
      totalReps: dashboard.stats.totalReps - (previous?.totalActual || 0) + session.totalActual,
      recordWorkouts: dashboard.stats.recordWorkouts + (!previous && session.mode === "record" ? 1 : 0),
    },
  };
}


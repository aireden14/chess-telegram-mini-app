// BurpiOpus — вся предметная логика без DOM.
// Здесь живут: модель данных, расчёт цели дня, разбивка цели на подходы,
// статистика (серия, рекорд, календарь) и работа с localStorage.
// Файл намеренно чистый: его можно переиспользовать в отдельном боте без изменений.

export const STORAGE_KEY = "burpi-opus.v1";

// Акценты уровней. Ключ — то, что уходит в CSS-переменную --accent.
export const ACCENTS = {
  mint:    { c1: "#3ddcac", c2: "#12a37a" },
  blue:    { c1: "#4aa4ff", c2: "#0a6ae0" },
  amber:   { c1: "#ffb340", c2: "#f0800a" },
  crimson: { c1: "#ff4d6d", c2: "#d81b60" },
  violet:  { c1: "#b07bff", c2: "#6f3ce0" },
  cyan:    { c1: "#4fe3e8", c2: "#12909c" },
};
export const ACCENT_KEYS = Object.keys(ACCENTS);

/* ------------------------------------------------------------------ даты */

export function dayKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(key, deltaDays) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + deltaDays);
  return dayKey(d);
}

// Разница в календарных днях (b - a), без часовых поясов и летнего времени.
export function daysBetween(aKey, bKey) {
  const a = keyToDate(aKey);
  const b = keyToDate(bKey);
  return Math.round((b - a) / 86400000);
}

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
export const WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export function humanDate(key) {
  const d = keyToDate(key);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function humanWeekday(key) {
  return WEEKDAYS[keyToDate(key).getDay()];
}

// Понедельник = 0, воскресенье = 6 — под русскую неделю.
export function weekdayIndex(key) {
  return (keyToDate(key).getDay() + 6) % 7;
}

/* ------------------------------------------------- разбивка на подходы */

// Первый подход всегда самый большой: свежий — можешь больше.
// Дальше каждый следующий примерно на четверть меньше предыдущего.
const FALLOFF = 0.75;

export function splitSets(total, count) {
  const t = Math.max(1, Math.round(total));
  const n = Math.max(1, Math.min(Math.round(count), t));
  if (n === 1) return [t];

  const weights = [];
  for (let i = 0; i < n; i += 1) weights.push(Math.pow(FALLOFF, i));
  const sum = weights.reduce((a, b) => a + b, 0);

  const raw = weights.map((w) => (w / sum) * t);
  const sets = raw.map((v) => Math.max(1, Math.round(v)));

  // Округление всегда даёт погрешность — гасим её, не ломая убывание.
  let diff = t - sets.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (diff !== 0 && guard < 500) {
    guard += 1;
    if (diff > 0) {
      sets[0] += 1;
      diff -= 1;
    } else {
      // Снимаем с самого правого подхода, где ещё есть что снять.
      let i = sets.length - 1;
      while (i > 0 && sets[i] <= 1) i -= 1;
      sets[i] -= 1;
      diff += 1;
    }
  }

  // Гарантируем невозрастающий ряд: 12·8·6·4, а не 12·6·8·4.
  for (let i = 1; i < sets.length; i += 1) {
    if (sets[i] > sets[i - 1]) {
      const over = sets[i] - sets[i - 1];
      sets[i] -= over;
      sets[0] += over;
    }
  }
  return sets;
}

// Сколько подходов уместно на такую цель, если уровень не задал число сам.
export function suggestSetCount(total) {
  if (total <= 10) return 1;
  if (total <= 18) return 2;
  if (total <= 28) return 3;
  if (total <= 45) return 4;
  if (total <= 70) return 5;
  return 6;
}

/* ------------------------------------------------------- цели уровней */

// Взята ли цель в этой тренировке. Записи, сделанные до появления флага,
// пересчитываем по сумме — так старый дневник не теряет закрытые задания.
export function goalReached(session) {
  if (typeof session.goalReached === "boolean") return session.goalReached;
  return (session.doneTotal ?? 0) >= (session.target ?? Number.POSITIVE_INFINITY);
}

// Растёт только за ВЗЯТЫЕ цели: закончил раньше — цель осталась прежней.
export function levelCompletions(state, exerciseId, levelId) {
  return state.sessions.filter(
    (s) => s.exerciseId === exerciseId && s.levelId === levelId && s.finishedAt && goalReached(s),
  ).length;
}

/* ------------------------------------------------------- прогресс за день */

// Сколько сделано сегодня по этому упражнению — независимо от уровня.
export function dayTotal(state, exerciseId, todayK = dayKey()) {
  return finishedSessions(state, exerciseId)
    .filter((s) => s.dayKey === todayK)
    .reduce((a, s) => a + (s.doneTotal ?? 0), 0);
}

export function goalReachedToday(state, exerciseId, levelId, todayK = dayKey()) {
  return state.sessions.some(
    (s) => s.finishedAt && s.exerciseId === exerciseId && s.levelId === levelId
      && s.dayKey === todayK && goalReached(s),
  );
}

// Незакрытая работа за сегодня: сделал 10 из 31 утром — вечером продолжаем
// с того же места, а не с нуля. Как только цель взята, счёт обнуляется.
export function carryOverToday(state, exerciseId, levelId, todayK = dayKey()) {
  const todays = state.sessions.filter(
    (s) => s.finishedAt && s.exerciseId === exerciseId && s.levelId === levelId && s.dayKey === todayK,
  );
  if (todays.some(goalReached)) return 0;
  return todays.reduce((a, s) => a + (s.doneTotal ?? 0), 0);
}

// Цель уровня на ближайшую тренировку.
// fixed       — постоянное число (БОЛЕЮ / ЛАЙТОВЫЙ / СРЕДНИЙ).
// progressive — база + шаг × количество уже закрытых тренировок этого уровня.
export function levelTarget(state, exerciseId, level) {
  if (level.mode === "progressive") {
    const done = levelCompletions(state, exerciseId, level.id);
    return Math.max(1, Math.round(level.base + level.step * done));
  }
  return Math.max(1, Math.round(level.total));
}

// Подсказка к тренировке, а НЕ жёсткий план: сколько подходов делать и по
// сколько — решает человек. Разбивка нужна только чтобы подставить разумное
// число в текущий подход и показать примерный расклад.
// `remaining` — сколько ещё осталось до цели (с учётом сделанного сегодня).
export function suggestPlan(state, exerciseId, level, remaining) {
  const target = levelTarget(state, exerciseId, level);
  const left = Math.max(1, Math.round(remaining ?? target));
  const count = level.sets && level.sets > 0 ? level.sets : suggestSetCount(left);
  return { target, remaining: left, sets: splitSets(left, count) };
}

// Готовые цели вперёд — «всё уже подсчитано на +1», смотреть и не считать.
export function forecast(state, exerciseId, level, steps = 7) {
  const out = [];
  const startKey = dayKey();
  let target = levelTarget(state, exerciseId, level);
  for (let i = 0; i < steps; i += 1) {
    out.push({
      dayKey: shiftKey(startKey, i),
      target,
      sets: splitSets(target, level.sets && level.sets > 0 ? level.sets : suggestSetCount(target)),
    });
    if (level.mode === "progressive") target += level.step;
  }
  return out;
}

/* ------------------------------------------------------------ статистика */

export function finishedSessions(state, exerciseId) {
  return state.sessions
    .filter((s) => s.finishedAt && (!exerciseId || s.exerciseId === exerciseId))
    .sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
}

export function daysWithWork(state, exerciseId) {
  const set = new Set();
  finishedSessions(state, exerciseId).forEach((s) => set.add(s.dayKey));
  return set;
}

// Серия — календарные дни подряд. Вчерашняя серия ещё жива: сегодняшний день
// не считается пропуском, пока он не закончился.
export function computeStreak(state, exerciseId, todayK = dayKey()) {
  const days = daysWithWork(state, exerciseId);
  if (days.size === 0) return { current: 0, best: 0, doneToday: false, atRisk: false };

  let cursor = days.has(todayK) ? todayK : shiftKey(todayK, -1);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = shiftKey(cursor, -1);
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  sorted.forEach((k) => {
    run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  });

  return {
    current,
    best: Math.max(best, current),
    doneToday: days.has(todayK),
    atRisk: current > 0 && !days.has(todayK),
  };
}

// Рекорд — лучший ДЕНЬ, а не лучший подход: тренировку можно разбить на
// несколько заходов, и это не должно занижать личный максимум.
export function personalBest(state, exerciseId) {
  const ex = state.exercises.find((e) => e.id === exerciseId);
  const byDay = new Map();
  finishedSessions(state, exerciseId).forEach((s) => {
    byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + (s.doneTotal ?? 0));
  });
  let best = ex?.seedBest ?? 0;
  byDay.forEach((total) => { if (total > best) best = total; });
  return best;
}

export const RANKS = [
  { at: 0,   name: "Первый шаг",  icon: "🌱" },
  { at: 3,   name: "Втянулся",    icon: "🔥" },
  { at: 7,   name: "Привычка",    icon: "⚡️" },
  { at: 14,  name: "Дисциплина",  icon: "🛡" },
  { at: 30,  name: "Машина",      icon: "⚙️" },
  { at: 60,  name: "Зверь",       icon: "🐺" },
  { at: 100, name: "Легенда",     icon: "👑" },
];

export function rankFor(totalSessions) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (totalSessions >= r.at) idx = i;
  });
  const current = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const from = current.at;
  const to = next ? next.at : current.at;
  const progress = next ? Math.min(1, (totalSessions - from) / (to - from)) : 1;
  return { current, next, progress, index: idx };
}

// Стадия пламени — Duolingo-подобная награда за длину серии.
export function flameStage(streak) {
  if (streak >= 100) return 5;
  if (streak >= 30) return 4;
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

export function stats(state, exerciseId) {
  const done = finishedSessions(state, exerciseId);
  const streak = computeStreak(state, exerciseId);
  const totalReps = done.reduce((a, s) => a + (s.doneTotal ?? 0), 0);
  const ex = state.exercises.find((e) => e.id === exerciseId);
  return {
    sessions: done.length,
    totalReps: totalReps + (ex?.seedReps ?? 0),
    streak,
    best: personalBest(state, exerciseId),
    rank: rankFor(done.length),
  };
}

// Последние N дней для полоски-календаря на главной.
export function lastDays(state, exerciseId, count = 7) {
  const days = daysWithWork(state, exerciseId);
  const today = dayKey();
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const k = shiftKey(today, -i);
    out.push({ dayKey: k, done: days.has(k), isToday: i === 0, weekday: weekdayIndex(k) });
  }
  return out;
}

export function sessionsByDay(state, exerciseId) {
  const map = new Map();
  finishedSessions(state, exerciseId).forEach((s) => {
    if (!map.has(s.dayKey)) map.set(s.dayKey, []);
    map.get(s.dayKey).push(s);
  });
  return map;
}

/* ------------------------------------------------------- начальное состояние */

export function defaultState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    activeExerciseId: "burpee",
    exercises: [
      {
        id: "burpee",
        name: "Бёрпи",
        icon: "🔥",
        // Что уже было сделано до приложения — чтобы рекорд и счётчик не начинались с нуля.
        seedBest: 30,
        seedReps: 30,
        levels: [
          {
            id: "sick",
            name: "БОЛЕЮ",
            tagline: "Не выпасть из ритма",
            mode: "fixed",
            total: 7,
            sets: 1,
            accent: "mint",
          },
          {
            id: "light",
            name: "ЛАЙТОВЫЙ",
            tagline: "Лёгкий день",
            mode: "fixed",
            total: 15,
            sets: 2,
            accent: "blue",
          },
          {
            id: "medium",
            name: "СРЕДНИЙ",
            tagline: "Рабочая норма",
            mode: "fixed",
            total: 23,
            sets: 3,
            accent: "amber",
          },
          {
            id: "record",
            name: "РЕКОРДСМЕН",
            tagline: "+1 к прошлому разу",
            mode: "progressive",
            base: 31,
            step: 1,
            sets: 4,
            accent: "crimson",
          },
        ],
      },
    ],
    sessions: [],
    settings: {
      restEnabled: true,
      restSeconds: 75,
      haptics: true,
      confetti: true,
      lastLevelByExercise: { burpee: "record" },
      seenMilestones: [],
      seenVersion: null,
    },
  };
}

/* ------------------------------------------------------------- хранилище */

function migrate(raw) {
  const base = defaultState();
  const state = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  };
  if (!Array.isArray(state.exercises) || state.exercises.length === 0) {
    state.exercises = base.exercises;
  }
  if (!Array.isArray(state.sessions)) state.sessions = [];
  state.exercises.forEach((ex) => {
    if (!Array.isArray(ex.levels)) ex.levels = [];
    ex.levels.forEach((lvl) => {
      if (lvl.mode === "progressive") {
        lvl.base = Number(lvl.base) || 1;
        lvl.step = Number.isFinite(Number(lvl.step)) ? Number(lvl.step) : 1;
      } else {
        lvl.total = Number(lvl.total) || 1;
      }
      lvl.sets = Number(lvl.sets) || 0;
    });
  });
  if (!state.exercises.some((e) => e.id === state.activeExerciseId)) {
    state.activeExerciseId = state.exercises[0].id;
  }
  return state;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* приватный режим или переполнение — работаем в памяти */
  }
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function findExercise(state, id) {
  return state.exercises.find((e) => e.id === id) ?? state.exercises[0];
}

export function findLevel(exercise, id) {
  return exercise.levels.find((l) => l.id === id) ?? exercise.levels[0];
}

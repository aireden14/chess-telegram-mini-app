// Читопус — вся предметная логика без DOM.
// Здесь живут: модель данных (книги, записи о чтении), цель дня, прогресс
// книги, статистика (серия, темп, рекорд) и работа с localStorage.
// Файл намеренно чистый: его можно переиспользовать в отдельном боте.

export const STORAGE_KEY = "chitopus.v1";

// Акценты книг. Ключ уходит в CSS-переменные --accent-1/--accent-2:
// у каждой книги свой цвет, и приложение «звучит» по-разному, пока её читаешь.
export const ACCENTS = {
  amber:   { c1: "#ffb340", c2: "#f0800a" },
  sand:    { c1: "#e9c37c", c2: "#b3803a" },
  crimson: { c1: "#ff4d6d", c2: "#d81b60" },
  violet:  { c1: "#b07bff", c2: "#6f3ce0" },
  blue:    { c1: "#4aa4ff", c2: "#0a6ae0" },
  cyan:    { c1: "#4fe3e8", c2: "#12909c" },
  mint:    { c1: "#3ddcac", c2: "#12a37a" },
  olive:   { c1: "#c3d94e", c2: "#6f8f1c" },
};
export const ACCENT_KEYS = Object.keys(ACCENTS);

// Цель по умолчанию: 30 страниц в день, БЕЗ повышения. Это принципиально —
// трекер держит привычку, а не разгоняет её.
export const DEFAULT_GOAL = 30;

/* ------------------------------------------------------------------ даты */

// Часовой пояс, в котором приложение считает границы суток.
// null — брать с устройства (обычный случай). Явный выбор нужен тем, кто
// переезжает или читает заполночь в поездке: иначе серия может потерять день.
let activeTimeZone = null;

export function setTimeZone(tz) {
  activeTimeZone = tz || null;
}

export function detectedTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function effectiveTimeZone() {
  return activeTimeZone ?? detectedTimeZone();
}

export function clockIn(tz) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: tz, hour: "2-digit", minute: "2-digit",
    }).format(new Date());
  } catch {
    return "—";
  }
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  if (activeTimeZone) {
    try {
      // en-CA форматирует ровно как YYYY-MM-DD — то, что нужно для ключа.
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: activeTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch {
      /* неизвестная зона — тихо падаем на время устройства */
    }
  }
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
export const MONTHS_NOM = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function humanDate(key) {
  const d = keyToDate(key);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

// С годом — для полки: прочитанные книги живут там годами.
export function humanDateYear(key) {
  const d = keyToDate(key);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function humanWeekday(key) {
  return WEEKDAYS[keyToDate(key).getDay()];
}

// Понедельник = 0, воскресенье = 6 — под русскую неделю.
export function weekdayIndex(key) {
  return (keyToDate(key).getDay() + 6) % 7;
}

/* ------------------------------------------------------------------ книги */

export function dailyGoal(state) {
  return Math.max(1, Math.round(state.settings?.dailyGoal ?? DEFAULT_GOAL));
}

export function readingBooks(state) {
  return state.books.filter((b) => b.status === "reading");
}

export function shelfBooks(state) {
  return state.books
    .filter((b) => b.status !== "reading")
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));
}

export function findBook(state, id) {
  return state.books.find((b) => b.id === id) ?? null;
}

// Активная книга — та, в которую пишутся страницы с главного экрана.
// Читать можно несколько книг сразу, но «сегодня» всегда про одну.
export function activeBook(state) {
  const picked = findBook(state, state.activeBookId);
  if (picked && picked.status === "reading") return picked;
  return readingBooks(state)[0] ?? null;
}

export function bookSessions(state, bookId) {
  return state.sessions
    .filter((s) => s.bookId === bookId)
    .sort((a, b) => (a.at < b.at ? -1 : 1));
}

/**
 * Прогресс книги.
 * `page` — страница, на которой человек остановился (абсолютная).
 * У книги без известного объёма страниц процент не считается: счётчик
 * страниц всё равно ведётся, просто без шкалы.
 */
export function bookProgress(state, book) {
  if (!book) return { page: 0, read: 0, total: 0, left: 0, pct: 0, sessions: [] };
  const sessions = bookSessions(state, book.id);
  const start = Math.max(0, Math.round(book.startFrom ?? 0));
  const page = sessions.length ? sessions[sessions.length - 1].toPage : start;
  const read = sessions.reduce((a, s) => a + (s.pages ?? 0), 0);
  const total = Math.max(0, Math.round(book.pages ?? 0));
  const left = total ? Math.max(0, total - page) : 0;
  const pct = total ? Math.min(1, page / total) : 0;
  return { page, read, total, left, pct, sessions };
}

// Сколько дней книга «в работе»: от первой записи до последней (или до сегодня).
export function bookSpan(state, book) {
  const sessions = bookSessions(state, book.id);
  if (sessions.length === 0) return { days: 0, activeDays: 0, from: null, to: null };
  const from = sessions[0].dayKey;
  const to = book.finishedDay ?? sessions[sessions.length - 1].dayKey;
  const activeDays = new Set(sessions.map((s) => s.dayKey)).size;
  return { days: Math.max(1, daysBetween(from, to) + 1), activeDays, from, to };
}

// Темп по книге — страниц за день, в который её реально читали.
export function bookPace(state, book) {
  const { read } = bookProgress(state, book);
  const { activeDays } = bookSpan(state, book);
  if (!activeDays) return 0;
  return Math.round(read / activeDays);
}

/* --------------------------------------------------------------- дни и цель */

export function dayPages(state, key, bookId = null) {
  return state.sessions
    .filter((s) => s.dayKey === key && (!bookId || s.bookId === bookId))
    .reduce((a, s) => a + (s.pages ?? 0), 0);
}

export function goalReachedOn(state, key) {
  return dayPages(state, key) >= dailyGoal(state);
}

// Дни, в которые прочитана хотя бы одна страница. Именно они держат серию:
// одна страница — уже день чтения, это и есть смысл трекера.
export function daysWithReading(state) {
  const set = new Set();
  state.sessions.forEach((s) => { if ((s.pages ?? 0) > 0) set.add(s.dayKey); });
  return set;
}

// Серия — календарные дни подряд. Вчерашняя серия ещё жива: сегодняшний день
// не считается пропуском, пока он не закончился.
export function computeStreak(state, todayK = dayKey()) {
  const days = daysWithReading(state);
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

export function bestDay(state) {
  const byDay = new Map();
  state.sessions.forEach((s) => {
    byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + (s.pages ?? 0));
  });
  let best = 0;
  byDay.forEach((v) => { if (v > best) best = v; });
  return best;
}

export function totalPages(state) {
  return state.sessions.reduce((a, s) => a + (s.pages ?? 0), 0);
}

// Средний темп за окно: делим на календарные дни, а не на дни с чтением —
// пропуски должны быть видны, иначе цифра врёт.
export function pace(state, windowDays = 30) {
  if (state.sessions.length === 0) return 0;
  const today = dayKey();
  const firstKey = [...state.sessions].map((s) => s.dayKey).sort()[0];
  const span = Math.min(windowDays, Math.max(1, daysBetween(firstKey, today) + 1));
  const from = shiftKey(today, -(span - 1));
  const sum = state.sessions
    .filter((s) => s.dayKey >= from)
    .reduce((a, s) => a + (s.pages ?? 0), 0);
  return Math.round(sum / span);
}

// Последние N дней для полоски-календаря на главной.
// `full` — цель дня взята, `part` — читал, но меньше цели (серия всё равно жива).
export function lastDays(state, count = 7) {
  const goal = dailyGoal(state);
  const today = dayKey();
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const k = shiftKey(today, -i);
    const pages = dayPages(state, k);
    out.push({
      dayKey: k,
      pages,
      full: pages >= goal,
      part: pages > 0 && pages < goal,
      isToday: i === 0,
      weekday: weekdayIndex(k),
    });
  }
  return out;
}

export function sessionsByDay(state) {
  const map = new Map();
  [...state.sessions]
    .sort((a, b) => (a.at < b.at ? -1 : 1))
    .forEach((s) => {
      if (!map.has(s.dayKey)) map.set(s.dayKey, []);
      map.get(s.dayKey).push(s);
    });
  return map;
}

/* ------------------------------------------------------------ звания и вехи */

// Звание растёт от числа ДОЧИТАННЫХ книг: это единственная величина, которую
// нельзя накрутить одним длинным вечером.
export const RANKS = [
  { at: 0,  name: "Открыл книгу",   icon: "🌱" },
  { at: 1,  name: "Читатель",       icon: "📖" },
  { at: 3,  name: "Постоянный",     icon: "🔖" },
  { at: 7,  name: "Книгочей",       icon: "📚" },
  { at: 15, name: "Ночной чтец",    icon: "🦉" },
  { at: 30, name: "Библиотекарь",   icon: "🏛" },
  { at: 60, name: "Легенда полки",  icon: "👑" },
];

export function rankFor(booksFinished) {
  let idx = 0;
  RANKS.forEach((r, i) => { if (booksFinished >= r.at) idx = i; });
  const current = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const from = current.at;
  const to = next ? next.at : current.at;
  const progress = next ? Math.min(1, (booksFinished - from) / (to - from)) : 1;
  return { current, next, progress, index: idx };
}

const FLAMES = ["🔥", "✨", "🔥", "🔥", "🌟", "💎"];

export function flameStage(streak) {
  if (streak >= 100) return 5;
  if (streak >= 30) return 4;
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export function flameIcon(streak) {
  return FLAMES[flameStage(streak)];
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

export function stats(state) {
  const finished = state.books.filter((b) => b.status === "finished");
  return {
    streak: computeStreak(state),
    totalPages: totalPages(state),
    booksFinished: finished.length,
    booksDropped: state.books.filter((b) => b.status === "dropped").length,
    bestDay: bestDay(state),
    pace: pace(state),
    rank: rankFor(finished.length),
    days: daysWithReading(state).size,
  };
}

/* ------------------------------------------------------- начальное состояние */

export function defaultState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    activeBookId: null,
    books: [],
    sessions: [],
    // Незаконченная запись: экран «сколько прочитал» переживает сворачивание.
    draft: null,
    settings: {
      // Цель фиксированная и не растёт — это осознанное правило приложения.
      dailyGoal: DEFAULT_GOAL,
      // null — сутки считаются по часовому поясу устройства.
      timeZone: null,
      // null = ещё не решали; проставляется при первом запуске.
      sound: null,
      soundVolume: "mid",
      haptics: true,
      confetti: true,
      seenMilestones: [],
      seenVersion: null,
      accentCursor: 0,
    },
  };
}

// Следующий цвет для новой книги — по кругу, чтобы полка не была одноцветной.
export function nextAccent(state) {
  const cursor = Number(state.settings.accentCursor ?? 0) % ACCENT_KEYS.length;
  return ACCENT_KEYS[cursor];
}

/* ------------------------------------------------------------- хранилище */

function migrate(raw) {
  const base = defaultState();
  const state = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  };
  if (!Array.isArray(state.books)) state.books = [];
  if (!Array.isArray(state.sessions)) state.sessions = [];
  state.books.forEach((b) => {
    b.pages = Math.max(0, Math.round(Number(b.pages) || 0));
    b.startFrom = Math.max(0, Math.round(Number(b.startFrom) || 0));
    if (!b.status) b.status = b.finishedAt ? "finished" : "reading";
    if (!ACCENTS[b.accent]) b.accent = "amber";
  });
  state.sessions.forEach((s) => {
    s.pages = Math.max(0, Math.round(Number(s.pages) || 0));
    s.toPage = Math.max(0, Math.round(Number(s.toPage) || 0));
  });
  if (!findBook(state, state.activeBookId)) {
    state.activeBookId = readingBooks(state)[0]?.id ?? null;
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

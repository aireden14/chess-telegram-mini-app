// Статистика игр GamePass — на каждый аккаунт отдельно (ключ localStorage с id юзера).
//
// Что считаем:
//  • recent   — какие игры и когда открывали в последний раз (для «Недавно заходили»);
//  • playtime — сколько миллисекунд суммарно провели в каждой игре (для «Больше всего играли»);
//  • на основе обоих сигналов — «Рекомендуем» (топ-3 сверху).
//
// Время меряем сессиями: startSession() при заходе в игру из хаба, дальше App шлёт beat()
// раз в BEAT_MS пока вкладка видима, endSession() при возврате на главную. Начисляем только
// дельты while-visible ≤ MAX_DELTA — поэтому фон/сон вкладки и закрытие приложения не раздувают
// счётчик (незачтённый разрыв просто теряется, а не превращается в часы «игры»).

export type RecentGame = { to: string; lastPlayedAt: number };

export type StatsView = {
  recent: RecentGame[];                       // по убыванию времени последнего захода
  playtime: Record<string, number>;           // route -> суммарные мс
  topByTime: { to: string; ms: number }[];    // по убыванию времени, только >0
  recommended: { to: string; score: number }[]; // по убыванию смешанного скора
  favorites: string[];                        // routes в порядке добавления в избранное
};

type StatsData = {
  recent: RecentGame[];
  playtime: Record<string, number>;
  session: { to: string; lastBeat: number } | null;
  favorites: string[];
};

const BASE_KEY = "gamepass-stats-v1";
const LEGACY_RECENT_KEY = "gamepass-recent-games-v1"; // старый формат «недавних» (без аккаунтов)
const MAX_RECENT = 12;
const BEAT_MS = 10_000;      // как часто App начисляет время активной игры
const MAX_DELTA = 30_000;    // дельту больше этой считаем «отходил» и не начисляем
const RECENCY_HALF = 14 * 24 * 60 * 60 * 1000; // за сколько затухает бонус свежести
const RECENCY_BONUS = 30 * 60 * 1000;          // «вес» свежести в единицах времени (≈30 мин)

let activeKey = `${BASE_KEY}:guest`;
let viewCache: StatsView | null = null;
const listeners = new Set<() => void>();

function emptyData(): StatsData {
  return { recent: [], playtime: {}, session: null, favorites: [] };
}

function safeParse(raw: string | null): StatsData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    return {
      recent: Array.isArray(d.recent)
        ? d.recent.filter(
            (r: any) => r && typeof r.to === "string" && typeof r.lastPlayedAt === "number",
          )
        : [],
      playtime:
        d.playtime && typeof d.playtime === "object"
          ? (Object.fromEntries(
              Object.entries(d.playtime).filter(
                ([, v]) => typeof v === "number" && Number.isFinite(v) && v > 0,
              ),
            ) as Record<string, number>)
          : {},
      session:
        d.session && typeof d.session.to === "string" && typeof d.session.lastBeat === "number"
          ? d.session
          : null,
      favorites: Array.isArray(d.favorites)
        ? d.favorites.filter((f: any) => typeof f === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function read(): StatsData {
  if (typeof window === "undefined") return emptyData();
  const existing = safeParse(localStorage.getItem(activeKey));
  if (existing) return existing;
  // Первый заход этого аккаунта — подхватываем старые «недавние» (общие, без аккаунта).
  const legacy = migrateLegacyRecent();
  return legacy ?? emptyData();
}

function migrateLegacyRecent(): StatsData | null {
  try {
    const raw = localStorage.getItem(LEGACY_RECENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const recent: RecentGame[] = parsed
      .filter((r: any) => r && typeof r.to === "string" && typeof r.lastPlayedAt === "number")
      .slice(0, MAX_RECENT);
    return recent.length ? { recent, playtime: {}, session: null, favorites: [] } : null;
  } catch {
    return null;
  }
}

function write(d: StatsData): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(activeKey, JSON.stringify(d));
    } catch {
      // приватный/ограниченный webview — просто не сохраняем
    }
  }
  emit();
}

function emit(): void {
  viewCache = null;
  for (const l of listeners) l();
}

/** Зачесть время сессии по её последнему beat (без сдвига lastBeat — вызывается при закрытии). */
function creditSession(d: StatsData, now: number): void {
  if (!d.session) return;
  const delta = now - d.session.lastBeat;
  if (delta > 0 && delta <= MAX_DELTA) {
    d.playtime[d.session.to] = (d.playtime[d.session.to] ?? 0) + delta;
  }
}

function recencyBonus(lastPlayedAt: number, now: number): number {
  const age = now - lastPlayedAt;
  if (age <= 0) return RECENCY_BONUS;
  const f = 1 - age / RECENCY_HALF;
  return f > 0 ? f * RECENCY_BONUS : 0;
}

// ── Публичный API ────────────────────────────────────────────────────────────

/** Переключить активный аккаунт (по id юзера). До логина — «guest». */
export function setActiveAccount(userId?: string | number | null): void {
  const key = `${BASE_KEY}:${userId != null && userId !== "" ? String(userId) : "guest"}`;
  if (key === activeKey) return;
  activeKey = key;
  emit();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Зайти в игру из хаба: закрыть прежнюю сессию, начать новую и записать в «недавние». */
export function startSession(to: string): void {
  const now = Date.now();
  const d = read();
  creditSession(d, now); // прежняя игра, если из неё ушли не через главную
  d.session = { to, lastBeat: now };
  d.recent = [{ to, lastPlayedAt: now }, ...d.recent.filter((r) => r.to !== to)].slice(0, MAX_RECENT);
  write(d);
}

/** Тик активной игры: начислить прошедшее время и сдвинуть отметку. Зовёт App пока видимо. */
export function beat(): void {
  const d = read();
  if (!d.session) return;
  const now = Date.now();
  const delta = now - d.session.lastBeat;
  if (delta <= 0) return;
  if (delta <= MAX_DELTA) {
    d.playtime[d.session.to] = (d.playtime[d.session.to] ?? 0) + delta;
  }
  d.session.lastBeat = now;
  write(d);
}

/** Вкладка снова видима — не начисляем время «отсутствия», просто продолжаем с этого момента. */
export function markResumed(): void {
  const d = read();
  if (!d.session) return;
  d.session.lastBeat = Date.now();
  write(d);
}

/** Выйти из игры (возврат на главную/закрытие): зачесть остаток и завершить сессию. */
export function endSession(): void {
  const d = read();
  if (!d.session) return;
  creditSession(d, Date.now());
  d.session = null;
  write(d);
}

/** Добавить/убрать игру из избранного (порядок добавления сохраняется). */
export function toggleFavorite(to: string): void {
  const d = read();
  d.favorites = d.favorites.includes(to)
    ? d.favorites.filter((f) => f !== to)
    : [...d.favorites, to];
  write(d);
}

export function getView(): StatsView {
  if (viewCache) return viewCache;
  const d = read();
  const now = Date.now();

  const recent = [...d.recent].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

  const topByTime = Object.entries(d.playtime)
    .map(([to, ms]) => ({ to, ms }))
    .filter((x) => x.ms > 0)
    .sort((a, b) => b.ms - a.ms);

  const lastPlayed = new Map(recent.map((r) => [r.to, r.lastPlayedAt]));
  const routes = new Set<string>([...Object.keys(d.playtime), ...recent.map((r) => r.to)]);
  const recommended = [...routes]
    .map((to) => ({
      to,
      score: (d.playtime[to] ?? 0) + recencyBonus(lastPlayed.get(to) ?? 0, now),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  viewCache = { recent, playtime: { ...d.playtime }, topByTime, recommended, favorites: [...d.favorites] };
  return viewCache;
}

/** «1 ч 23 м» / «5 м 12 с» / «42 с» — компактно, самые крупные две единицы. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} д ${h} ч`;
  if (h > 0) return `${h} ч ${m} м`;
  if (m > 0) return `${m} м ${s} с`;
  return `${s} с`;
}

// Статистика игр GamePass — на каждый аккаунт отдельно (ключ localStorage с id юзера).
//
// Считаем только одно: сколько раз человек запускал каждую игру (launchCount) и когда в
// последний раз (lastPlayedAt — тай-брейк при равном счёте). Хаб строит из этого один плоский
// список игр: те, что запускают чаще всего — сверху.

export type StatsView = {
  launchCount: Record<string, number>;
  lastPlayedAt: Record<string, number>;
};

type StatsData = {
  launchCount: Record<string, number>;
  lastPlayedAt: Record<string, number>;
};

const STATS_KEY_PREFIX = "gamepass-stats-v2";
const CONTENT_MILESTONE_KEY_PREFIX = "gamepass-content-milestone-v1";

function accountKey(userId?: string | number | null): string {
  const suffix = userId != null && userId !== "" ? String(userId) : "guest";
  return [STATS_KEY_PREFIX, suffix].join(":");
}

function contentMilestoneKey(): string {
  return `${CONTENT_MILESTONE_KEY_PREFIX}:${activeKey.slice(STATS_KEY_PREFIX.length + 1)}`;
}

let activeKey = accountKey(null);
let viewCache: StatsView | null = null;
const listeners: Array<() => void> = [];

function emptyData(): StatsData {
  return { launchCount: {}, lastPlayedAt: {} };
}

function sanitizeCounts(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).filter(
      ([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0,
    ),
  ) as Record<string, number>;
}

function safeParse(raw: string | null): StatsData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    return {
      launchCount: sanitizeCounts(d.launchCount),
      lastPlayedAt: sanitizeCounts(d.lastPlayedAt),
    };
  } catch {
    return null;
  }
}

function read(): StatsData {
  if (typeof window === "undefined") return emptyData();
  return safeParse(localStorage.getItem(activeKey)) ?? emptyData();
}

function persist(d: StatsData): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(activeKey, JSON.stringify(d));
    } catch {
      // приватный/ограниченный webview — просто не сохраняем
    }
  }
  notify();
}

function notify(): void {
  viewCache = null;
  for (const l of listeners) l();
}

// ── Публичный API ────────────────────────────────────────────────────────────

/** Переключить активный аккаунт (по id юзера). До логина — «guest». */
export function setActiveAccount(userId?: string | number | null): void {
  const key = accountKey(userId);
  if (key === activeKey) return;
  activeKey = key;
  notify();
}

export function subscribe(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Зайти в игру из хаба: учесть запуск в статистике. */
export function startSession(to: string): void {
  const d = read();
  d.launchCount[to] = (d.launchCount[to] ?? 0) + 1;
  d.lastPlayedAt[to] = Date.now();
  persist(d);
}

/**
 * Возвращает новый достигнутый рубеж исследования (10, 20 … 100) только один раз
 * на аккаунт. Сам процент вычисляет экран хаба, потому что именно он знает каталог.
 */
export function claimContentMilestone(progressPercent: number): number | null {
  if (typeof window === "undefined") return null;
  const milestone = Math.min(100, Math.floor(Math.max(0, progressPercent) / 10) * 10);
  if (milestone < 10) return null;

  try {
    const key = contentMilestoneKey();
    const previous = Number(localStorage.getItem(key) ?? 0);
    if (milestone <= previous) return null;
    localStorage.setItem(key, String(milestone));
    return milestone;
  } catch {
    return null;
  }
}

export function getView(): StatsView {
  if (viewCache) return viewCache;
  const d = read();
  viewCache = { launchCount: { ...d.launchCount }, lastPlayedAt: { ...d.lastPlayedAt } };
  return viewCache;
}

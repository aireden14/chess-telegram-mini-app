export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

// Newest first. Bump the top version when you ship user-visible features.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4",
    date: "2026-06-18",
    title: "Новые игры: Шашки и Катан",
    items: [
      "Шашки — игра вдвоём на одном устройстве (русские правила)",
      "Катан — колонизация, ресурсы и боты",
      "Локальные партии (шахматы и шашки) сохраняются между сессиями",
    ],
  },
  {
    version: "1.3",
    date: "2026-06-15",
    title: "Игры вдвоём и геймификация",
    items: [
      "Экран выбора игры и отдельный хаб шахмат",
      "Рестарт партии одной кнопкой",
      "Шахматы вдвоём на одном устройстве",
      "Судоку: рейтинг, уровни и XP-прогресс, серия дней с рекордом",
      "Задания дня с наградами XP и бонусом за все задания",
      "13 достижений и лидерборд по судоку",
      "Ключевые цифры в судоку выделены отдельно",
      "Адаптация интерфейса под iPad",
      "Плавные анимации и конфетти на победу",
    ],
  },
  {
    version: "1.2",
    date: "2026-06-02",
    title: "Стили фигур и темы",
    items: [
      "Новые стили фигур: Liquid, Unicode, Playful",
      "Тёмная и светлая темы оформления",
    ],
  },
  {
    version: "1.1",
    date: "2026-05-28",
    title: "Новые игры",
    items: ["Судоку с ежедневной задачкой", "Аркада «Отражатель»"],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;

const SEEN_KEY = "chess-whatsnew-seen";

export function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_VERSION);
  } catch {}
}

export function hasUnseenWhatsNew(): boolean {
  return getSeenVersion() !== LATEST_VERSION;
}

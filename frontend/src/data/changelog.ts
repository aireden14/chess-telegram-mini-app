export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

// Newest first. Bump the top version when you ship user-visible features.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.6",
    date: "2026-06-19",
    title: "V2 Beta стиль",
    items: [
      "Новый синий логотип игрового хаба без PDF-текста",
      "Переключатель V2 Beta на главном экране",
      "Перерисованные иконки шахмат, шашек и судоку",
      "PNG-фигуры шахмат с контрастной обводкой для светлых и тёмных клеток",
      "Старые стили шахмат скрыты; доступны только Blue glass, Emoji chess и Classic black",
      "Третий стиль Classic black с чёрно-белыми PNG-фигурами",
      "Classic black включает чёрно-белый интерфейс и чёрно-белую доску; Emoji chess теперь рендерится настоящими emoji",
      "В Emoji chess пешки заменены на настоящий pawn emoji, а судоку получило чёрно-белый Classic black вариант",
    ],
  },
  {
    version: "1.5",
    date: "2026-06-19",
    title: "Шашки: бот и онлайн",
    items: [
      "Режим против бота с 5 уровнями сложности",
      "Онлайн-мультиплеер по коду комнаты",
      "Сервер проверяет обязательный бой, цепочки и дамки",
    ],
  },
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

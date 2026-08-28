// Пресеты настроек стола: настроил один раз — дальше выбираешь из списка.
// Живут локально, поэтому переживают перезапуск мини-аппа без бэкенда.

export interface TabletopSettings {
  seats: number;
  botFill: boolean;
  turnSeconds: number;
  password: string;
}

export interface TabletopPreset {
  id: string;
  name: string;
  settings: TabletopSettings;
}

export const DEFAULT_SETTINGS: TabletopSettings = {
  seats: 2,
  botFill: false,
  turnSeconds: 0,
  password: "",
};

const storageKey = (game: string) => `tabletop:presets:${game}`;
const lastKey = (game: string) => `tabletop:last:${game}`;

export function loadPresets(game: string): TabletopPreset[] {
  try {
    const raw = localStorage.getItem(storageKey(game));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(game: string, presets: TabletopPreset[]): TabletopPreset[] {
  try {
    localStorage.setItem(storageKey(game), JSON.stringify(presets));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
  return presets;
}

export function savePreset(game: string, name: string, settings: TabletopSettings): TabletopPreset[] {
  const clean = String(name || "").trim().slice(0, 24) || "Без названия";
  const presets = loadPresets(game);
  const existing = presets.find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (existing) {
    existing.settings = { ...settings };
    return persist(game, presets);
  }
  presets.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: clean, settings: { ...settings } });
  return persist(game, presets.slice(-12)); // больше дюжины пресетов — уже свалка
}

export function deletePreset(game: string, id: string): TabletopPreset[] {
  return persist(game, loadPresets(game).filter((p) => p.id !== id));
}

/** Последние применённые настройки — чтобы не настраивать заново каждый раз. */
export function loadLastSettings(game: string): TabletopSettings {
  try {
    const raw = localStorage.getItem(lastKey(game));
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveLastSettings(game: string, settings: TabletopSettings): void {
  try {
    localStorage.setItem(lastKey(game), JSON.stringify(settings));
  } catch {
    /* не критично */
  }
}

import React, { useEffect, useMemo, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { TAROT_DECK, type TarotCard } from "../../data/tarot";
import "./cardOfDay.css";

const KEY = "card-of-day-v1";
const TZ_KEY = "card-of-day-tz"; // "" / отсутствует => авто (часовой пояс устройства)

type Stored = { cardId: string; dayKey: string; tz: string };

// Популярные пояса (с упором на СНГ) для быстрой ручной настройки.
const TZ_OPTIONS: { id: string; label: string }[] = [
  { id: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { id: "Europe/Moscow", label: "Москва (UTC+3)" },
  { id: "Europe/Minsk", label: "Минск (UTC+3)" },
  { id: "Europe/Kyiv", label: "Киев (UTC+3)" },
  { id: "Asia/Tbilisi", label: "Тбилиси (UTC+4)" },
  { id: "Asia/Baku", label: "Баку (UTC+4)" },
  { id: "Asia/Yerevan", label: "Ереван (UTC+4)" },
  { id: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
  { id: "Asia/Tashkent", label: "Ташкент (UTC+5)" },
  { id: "Asia/Almaty", label: "Алматы (UTC+5)" },
  { id: "Asia/Omsk", label: "Омск (UTC+6)" },
  { id: "Asia/Krasnoyarsk", label: "Красноярск (UTC+7)" },
  { id: "Asia/Irkutsk", label: "Иркутск (UTC+8)" },
  { id: "Asia/Yakutsk", label: "Якутск (UTC+9)" },
  { id: "Asia/Vladivostok", label: "Владивосток (UTC+10)" },
  { id: "Asia/Magadan", label: "Магадан (UTC+11)" },
  { id: "Asia/Kamchatka", label: "Камчатка (UTC+12)" },
  { id: "UTC", label: "UTC" },
];

function autoTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getTzSetting(): string {
  try {
    const v = localStorage.getItem(TZ_KEY);
    return v && v.trim() ? v : ""; // "" = авто
  } catch {
    return "";
  }
}

function resolveTz(setting: string): string {
  return setting || autoTz();
}

// Календарная дата (YYYY-MM-DD) в указанном поясе — ключ дня.
function dayKeyIn(tz: string, d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
}

// Сколько мс осталось до ближайшей локальной полуночи (00:00) в поясе.
function msUntilMidnight(tz: string, now: Date = new Date()): number {
  let h = 0;
  let m = 0;
  let s = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    h = get("hour");
    if (h === 24) h = 0; // некоторые движки отдают 24 в полночь
    m = get("minute");
    s = get("second");
  } catch {
    h = now.getHours();
    m = now.getMinutes();
    s = now.getSeconds();
  }
  const elapsedMs = (h * 3600 + m * 60 + s) * 1000 + now.getMilliseconds();
  const left = 24 * 60 * 60 * 1000 - elapsedMs;
  return left <= 0 ? 0 : left;
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored> & { drawnAt?: number };
    if (!parsed?.cardId) return null;
    // Миграция со старого формата (rolling 24h по drawnAt): считаем картой "сегодня" того пояса.
    if (!parsed.dayKey && parsed.drawnAt) {
      const tz = resolveTz(getTzSetting());
      return { cardId: parsed.cardId, dayKey: dayKeyIn(tz, new Date(parsed.drawnAt)), tz };
    }
    if (!parsed.dayKey) return null;
    return { cardId: parsed.cardId, dayKey: parsed.dayKey, tz: parsed.tz ?? "" };
  } catch {
    return null;
  }
}

function fmtRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function CardOfDayScreen() {
  const [stored, setStored] = useState<Stored | null>(() => readStored());
  const [tzSetting, setTzSetting] = useState<string>(() => getTzSetting());
  const [now, setNow] = useState<Date>(() => new Date());
  const [revealing, setRevealing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tz = resolveTz(tzSetting);
  const todayKey = dayKeyIn(tz, now);

  // Карта действительна, пока идёт тот же календарный день в выбранном поясе.
  const active = stored && stored.dayKey === todayKey ? stored : null;
  const card: TarotCard | undefined = useMemo(
    () => (active ? TAROT_DECK.find((c) => c.id === active.cardId) : undefined),
    [active],
  );
  const remaining = active ? msUntilMidnight(tz, now) : 0;

  // Тикаем каждую секунду, пока карта вытянута — обновляем таймер до полуночи.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const draw = () => {
    if (active) return;
    triggerHaptic("medium");
    const pick = TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];
    const next: Stored = { cardId: pick.id, dayKey: todayKey, tz: tzSetting };
    localStorage.setItem(KEY, JSON.stringify(next));
    setRevealing(true);
    setStored(next);
    setNow(new Date());
    window.setTimeout(() => setRevealing(false), 900);
  };

  const changeTz = (value: string) => {
    setTzSetting(value);
    try {
      if (value) localStorage.setItem(TZ_KEY, value);
      else localStorage.removeItem(TZ_KEY);
    } catch {
      /* noop */
    }
    setNow(new Date());
    triggerHaptic("light");
  };

  const autoZone = autoTz();
  const tzLabel = tzSetting
    ? TZ_OPTIONS.find((o) => o.id === tzSetting)?.label ?? tzSetting
    : `Авто · ${autoZone}`;

  return (
    <div className="app-screen cod-screen">
      <TopNav title="Карта дня" backTo="/" />
      <div className="cod-stars" aria-hidden>
        {["✨", "⭐", "🌟", "💫", "✦", "✧", "⋆", "✩"].map((s, i) => (
          <span key={i} className={`cod-star cod-star-${i}`}>{s}</span>
        ))}
      </div>

      <div className="cod-body">
        {card ? (
          <div className={`cod-card revealed${revealing ? " flip-in" : ""}`}>
            <div className="cod-card-glow" aria-hidden />
            <span className="cod-card-name">{card.name}</span>
            <div className="cod-emojis">
              {card.emojis.map((e, i) => (
                <span key={i} className="cod-emoji" style={{ animationDelay: `${i * 0.12}s` }}>{e}</span>
              ))}
            </div>
            <p className="cod-message">{card.message}</p>
            <div className="cod-timer">
              <span className="cod-timer-label">Новая карта в 00:00 · через</span>
              <strong>{fmtRemaining(remaining)}</strong>
            </div>
          </div>
        ) : (
          <button className="cod-card back" onClick={draw} aria-label="Получить карту дня">
            <div className="cod-card-glow" aria-hidden />
            <span className="cod-back-orb">🔮</span>
            <span className="cod-back-title">Карта дня</span>
            <span className="cod-back-hint">Нажми, чтобы открыть предсказание</span>
          </button>
        )}
      </div>

      {!card && (
        <button className="cod-draw-btn" onClick={draw}>
          🔮 Получить карту дня
        </button>
      )}

      <div className="cod-tz">
        <button
          className="cod-tz-toggle"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
        >
          🕛 Часовой пояс: <strong>{tzLabel}</strong> <span className="cod-tz-caret">{settingsOpen ? "▴" : "▾"}</span>
        </button>
        {settingsOpen && (
          <div className="cod-tz-panel">
            <label className="cod-tz-row">
              <span>Сброс карты в полночь по поясу</span>
              <select
                className="cod-tz-select"
                value={tzSetting}
                onChange={(e) => changeTz(e.target.value)}
              >
                <option value="">Авто (определить автоматически)</option>
                {TZ_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            <p className="cod-tz-hint">
              Сейчас используется: <b>{tz}</b>. Авто берёт пояс твоего устройства.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

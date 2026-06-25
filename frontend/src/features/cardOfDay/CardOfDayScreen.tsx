import React, { useEffect, useMemo, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { TAROT_DECK, type TarotCard } from "../../data/tarot";
import "./cardOfDay.css";

const KEY = "card-of-day-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

type Stored = { cardId: string; drawnAt: number };

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.cardId || !parsed?.drawnAt) return null;
    return parsed;
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
  const [now, setNow] = useState(Date.now());
  const [revealing, setRevealing] = useState(false);

  // Карта действительна, пока не прошло 24 часа с момента вытягивания.
  const active = stored && now - stored.drawnAt < DAY_MS ? stored : null;
  const card: TarotCard | undefined = useMemo(
    () => (active ? TAROT_DECK.find((c) => c.id === active.cardId) : undefined),
    [active],
  );
  const remaining = active ? active.drawnAt + DAY_MS - now : 0;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const draw = () => {
    if (active) return;
    triggerHaptic("medium");
    const pick = TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];
    const next: Stored = { cardId: pick.id, drawnAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(next));
    setRevealing(true);
    setStored(next);
    setNow(Date.now());
    window.setTimeout(() => setRevealing(false), 900);
  };

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
              <span className="cod-timer-label">Новая карта через</span>
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
    </div>
  );
}

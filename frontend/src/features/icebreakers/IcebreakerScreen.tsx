import React, { useMemo, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { ICE_QUESTIONS, ICE_CATEGORIES, type IceCategory, type IceQuestion } from "../../data/icebreakers";
import "./icebreakers.css";

type Filter = "all" | IceCategory;

const CAT_META: Record<IceCategory, { name: string; emoji: string }> = ICE_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: { name: c.name, emoji: c.emoji } }),
  {} as Record<IceCategory, { name: string; emoji: string }>,
);

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Прогресс «отвечено» ключуется ТЕКСТОМ вопроса, а не id: при апдейтах набора
// id могут переехать, а текст — стабильная идентичность карточки.
const ANSWERED_KEY = "ice.answered.v1";
function loadAnswered(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(ANSWERED_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
function saveAnswered(s: Set<string>) {
  try {
    localStorage.setItem(ANSWERED_KEY, JSON.stringify([...s]));
  } catch {
    /* приватный режим — просто без сохранения */
  }
}

export function IcebreakerScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [answered, setAnswered] = useState<Set<string>>(() => loadAnswered());
  const [queue, setQueue] = useState<IceQuestion[]>(() =>
    shuffle(ICE_QUESTIONS.filter((q) => !loadAnswered().has(q.text))),
  );
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);

  const pool = useMemo(
    () => (filter === "all" ? ICE_QUESTIONS : ICE_QUESTIONS.filter((q) => q.category === filter)),
    [filter],
  );
  const answeredInPool = pool.filter((q) => answered.has(q.text)).length;

  const current = queue[idx];

  const reshuffle = (f: Filter, ans: Set<string>) => {
    const base = f === "all" ? ICE_QUESTIONS : ICE_QUESTIONS.filter((q) => q.category === f);
    setQueue(shuffle(base.filter((q) => !ans.has(q.text))));
    setIdx(0);
    setFlip((v) => !v);
  };

  const changeFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    reshuffle(f, answered);
    triggerHaptic("light");
  };

  const next = () => {
    if (queue.length === 0) return;
    triggerHaptic("medium");
    setFlip((v) => !v);
    setIdx((i) => (i + 1 >= queue.length ? 0 : i + 1));
  };

  const markAnswered = () => {
    if (!current) return;
    triggerHaptic("medium");
    const na = new Set(answered);
    na.add(current.text);
    setAnswered(na);
    saveAnswered(na);
    const nq = queue.filter((q) => q.id !== current.id);
    setQueue(nq);
    setIdx((i) => (nq.length === 0 ? 0 : Math.min(i, nq.length - 1)));
    setFlip((v) => !v);
  };

  const resetProgress = () => {
    if (!window.confirm(`Сбросить прогресс? Все ${answered.size} отвеченных вопросов вернутся в колоду.`)) return;
    const empty = new Set<string>();
    setAnswered(empty);
    saveAnswered(empty);
    reshuffle(filter, empty);
    triggerHaptic("light");
  };

  const total = pool.length;

  return (
    <div className="app-screen ice-screen">
      <TopNav title="Знакомства" backTo="/" />

      <div className="ice-cats" role="group" aria-label="Категория вопросов">
        <button className={`ice-cat${filter === "all" ? " on" : ""}`} onClick={() => changeFilter("all")}>
          <span className="ice-cat-emoji">🎲</span> Все
        </button>
        {ICE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`ice-cat${filter === c.id ? " on" : ""}`}
            onClick={() => changeFilter(c.id)}
          >
            <span className="ice-cat-emoji">{c.emoji}</span> {c.name}
          </button>
        ))}
      </div>

      <div className="ice-body">
        <div className={`ice-card${flip ? " flip" : ""}`} key={current?.id ?? "none"}>
          {current ? (
            <>
              <span className="ice-card-cat">
                {CAT_META[current.category].emoji} {CAT_META[current.category].name}
              </span>
              <p className="ice-card-q">{current.text}</p>
              <span className="ice-card-num">осталось {queue.length}</span>
            </>
          ) : (
            <>
              <p className="ice-card-q">
                {answeredInPool > 0
                  ? "Вы ответили на все вопросы здесь! 🎉"
                  : "Нет вопросов в этой категории"}
              </p>
              {answeredInPool > 0 && (
                <span className="ice-card-num">можно сбросить прогресс и пройти заново</span>
              )}
            </>
          )}
        </div>
      </div>

      {current ? (
        <div className="ice-btnrow">
          <button className="ice-next-btn ice-done-btn" onClick={markAnswered}>
            ✓ Отвечено
          </button>
          <button className="ice-next-btn" onClick={next}>
            Дальше →
          </button>
        </div>
      ) : (
        answeredInPool > 0 && (
          <button className="ice-next-btn" onClick={resetProgress}>
            Сбросить прогресс
          </button>
        )
      )}
      <p className="ice-hint">
        Отвечено {answeredInPool} из {total}
        {answered.size > 0 && current ? (
          <>
            {" · "}
            <button className="ice-reset-link" onClick={resetProgress}>
              сбросить
            </button>
          </>
        ) : null}
        <br />
        «✓ Отвечено» убирает карточку насовсем — прогресс сохраняется.
      </p>
    </div>
  );
}

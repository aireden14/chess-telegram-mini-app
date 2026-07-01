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

export function IcebreakerScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  // очередь перемешанных вопросов под текущий фильтр + индекс
  const [queue, setQueue] = useState<IceQuestion[]>(() => shuffle(ICE_QUESTIONS));
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);

  const pool = useMemo(
    () => (filter === "all" ? ICE_QUESTIONS : ICE_QUESTIONS.filter((q) => q.category === filter)),
    [filter],
  );

  const current = queue[idx];

  const reshuffle = (f: Filter) => {
    const base = f === "all" ? ICE_QUESTIONS : ICE_QUESTIONS.filter((q) => q.category === f);
    setQueue(shuffle(base));
    setIdx(0);
    setFlip((v) => !v);
  };

  const changeFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    reshuffle(f);
    triggerHaptic("light");
  };

  const next = () => {
    triggerHaptic("medium");
    setFlip((v) => !v);
    setIdx((i) => {
      const ni = i + 1;
      if (ni >= queue.length) {
        // прошли все — перемешиваем заново
        setQueue(shuffle(pool));
        return 0;
      }
      return ni;
    });
  };

  const total = pool.length;
  const shown = Math.min(idx + 1, total);

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
              <span className="ice-card-num">{shown} / {total}</span>
            </>
          ) : (
            <p className="ice-card-q">Нет вопросов в этой категории</p>
          )}
        </div>
      </div>

      <button className="ice-next-btn" onClick={next}>
        Следующий вопрос →
      </button>
      <p className="ice-hint">Задавайте по очереди и отвечайте честно. 100 вопросов, чтобы узнать друг друга.</p>
    </div>
  );
}

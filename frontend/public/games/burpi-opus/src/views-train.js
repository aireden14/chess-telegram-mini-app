// Экраны тренировочного цикла: задание на день → выбор уровня → подходы → финиш.

import {
  ACCENTS, dayKey, humanDate, humanWeekday, planFor, forecast, stats,
  lastDays, levelTarget, splitSets, suggestSetCount, WEEKDAYS_SHORT,
  flameStage, STREAK_MILESTONES, levelCompletions,
} from "./core.js?v=1.0.0";
import { h, plural, toast, sheet, closeSheet } from "./ui.js?v=1.0.0";
import { haptic } from "./tg.js?v=1.0.0";
import { confetti, countUp, ringSvg, setRingProgress, pulse } from "./fx.js?v=1.0.0";

const FLAMES = ["🔥", "✨", "🔥", "🔥", "🌟", "💎"];

function levelStyle(level) {
  const a = ACCENTS[level.accent] ?? ACCENTS.crimson;
  return { "--lvl-1": a.c1, "--lvl-2": a.c2 };
}

function setsLine(sets) {
  return sets.join(" · ");
}

/* ============================================================ ЗАДАНИЕ НА ДЕНЬ */

export function viewToday(app) {
  const ex = app.exercise();
  const level = app.level();
  const today = dayKey();
  const st = stats(app.state, ex.id);
  const plan = planFor(app.state, ex.id, level);

  const todaySessions = app.state.sessions.filter(
    (s) => s.finishedAt && s.exerciseId === ex.id && s.dayKey === today,
  );
  const doneToday = todaySessions.reduce((a, s) => a + s.doneTotal, 0);
  const isDone = todaySessions.length > 0;

  app.setAccent(level.accent);

  /* ---- шапка */
  const head = h("div.head", {},
    h("div", {},
      h("div.eyebrow", { text: `${humanWeekday(today)}, ${humanDate(today)}` }),
      h("h1.head-title", { text: isDone ? "Задание закрыто" : "Задание на день" }),
    ),
    h("div.pill-row", {},
      h(`div.pill${st.streak.current > 0 ? ".is-hot" : ".is-muted"}`, {},
        h("span", { text: FLAMES[flameStage(st.streak.current)] }),
        h("span.pill-num", { text: String(st.streak.current) }),
      ),
    ),
  );

  /* ---- герой */
  const heroNumber = h("div.hero-number", { text: "0" });
  const heroValue = isDone ? doneToday : plan.target;

  const hero = h("div.hero", {},
    h("div.hero-label", { text: isDone ? "сделано сегодня" : level.name }),
    heroNumber,
    h("div.hero-unit", { text: ex.name.toLowerCase() }),
    isDone
      ? h("div.hero-note", {
          text: `Следующая цель — ${planFor(app.state, ex.id, level).target}`,
        })
      : h("div.hero-note", {
          text: `${plan.sets.length} ${plural(plan.sets.length, "подход", "подхода", "подходов")} · первый самый большой`,
        }),
  );

  /* ---- подходы */
  const strip = h("div.sets-strip", {},
    plan.sets.flatMap((n, i) => [
      i > 0 ? h("span.set-dot", { text: "·" }) : null,
      h("div.set-chip", { text: String(n) }),
    ]),
  );

  /* ---- неделя */
  const week = h("div.week", {},
    lastDays(app.state, ex.id, 7).map((d) =>
      h(`div.week-cell${d.isToday ? ".is-today" : ""}${d.done ? ".is-done" : ""}`, {},
        h("div.week-name", { text: WEEKDAYS_SHORT[d.weekday] }),
        h(`div.week-mark${d.done ? ".is-done" : ""}`, { text: d.done ? "✓" : "" }),
      ),
    ),
  );

  /* ---- следующие цели: всё уже посчитано вперёд */
  const upcoming = forecast(app.state, ex.id, level, 5);
  const forecastCard = h("div.card", {},
    h("div.card-title", {
      text: level.mode === "progressive" ? "Дальше — по нарастающей" : "План уровня",
    }),
    h("div.sets-strip.is-scroll", {},
      upcoming.map((f, i) =>
        h(`div.set-chip${i === 0 ? ".is-current" : ""}`, { text: String(f.target) }),
      ),
    ),
    h("div.hero-note", {
      style: { "margin-top": "12px", "text-align": "left" },
      text: level.mode === "progressive"
        ? `+${level.step} к цели после каждой закрытой тренировки этого уровня`
        : "Фиксированная цель — растёт только «РЕКОРДСМЕН»",
    }),
  );

  /* ---- действия */
  const actions = h("div.actions", {},
    h("button.btn.btn-primary", {
      type: "button",
      text: isDone ? "Ещё тренировка" : "Начать тренировку",
      on: { click: () => { haptic("medium"); app.go("levels"); } },
    }),
    isDone
      ? h("button.btn.btn-quiet", {
          type: "button",
          text: `Сегодня: ${todaySessions.length} ${plural(todaySessions.length, "тренировка", "тренировки", "тренировок")} · ${doneToday} ${plural(doneToday, "повтор", "повтора", "повторов")}`,
          on: { click: () => { haptic("light"); app.go("diary"); } },
        })
      : null,
  );

  const screen = h("div.screen", {}, head, hero, strip, week, forecastCard,
    h("div.spacer"), actions);

  // Число «набирается» — маленькая деталь, из-за которой экран оживает.
  requestAnimationFrame(() => countUp(heroNumber, heroValue, { duration: 640 }));

  return screen;
}

/* ============================================================== ВЫБОР УРОВНЯ */

export function viewLevels(app) {
  const ex = app.exercise();

  const cards = ex.levels.map((level) => {
    const plan = planFor(app.state, ex.id, level);
    const closed = levelCompletions(app.state, ex.id, level.id);
    const meta = level.mode === "progressive" && closed > 0
      ? `${setsLine(plan.sets)} · закрыто ${closed} ${plural(closed, "раз", "раза", "раз")}`
      : setsLine(plan.sets);

    return h(`button.btn.level-card${level.id === app.state.settings.lastLevelByExercise?.[ex.id] ? ".is-active" : ""}`, {
      type: "button",
      style: levelStyle(level),
      on: {
        click: () => {
          haptic("medium");
          app.startWorkout(level.id);
        },
      },
    },
      h("div.level-badge", { text: String(plan.target) }),
      h("div.level-body", {},
        h("div.level-name", { text: level.name }),
        h("div.level-meta", { text: level.tagline ? `${level.tagline} · ${meta}` : meta }),
      ),
      h("div.level-chevron", { text: "›" }),
    );
  });

  return h("div.screen", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: ex.name }),
        h("h1.head-title", { text: "Как сегодня?" }),
      ),
    ),
    h("div.hero-note", {
      style: { "text-align": "left", "margin-top": "-8px" },
      text: "Всё уже посчитано — выбери самочувствие и просто отмечай подходы.",
    }),
    h("div.level-list", {}, cards),
    h("div.spacer"),
    h("div.actions", {},
      h("button.btn.btn-quiet", {
        type: "button",
        text: "Назад",
        on: { click: () => { haptic("light"); app.go("today"); } },
      }),
    ),
  );
}

/* ================================================================ ТРЕНИРОВКА */

export function viewWorkout(app) {
  const session = app.session;
  if (!session) return viewToday(app);

  const ex = app.exercise();
  const level = app.level(session.levelId);
  app.setAccent(level.accent);

  const index = session.done.length;
  const isExtra = index >= session.planned.length;
  const suggested = isExtra
    ? Math.max(1, session.planned[session.planned.length - 1])
    : session.planned[index];

  // Текущее число живёт в сессии: вернулся из отдыха — правка не потерялась.
  if (session.currentReps === null || session.currentReps === undefined) {
    session.currentReps = suggested;
  }

  const doneSoFar = session.done.reduce((a, b) => a + b, 0);
  const remaining = Math.max(0, session.target - doneSoFar);

  const repsNode = h("div.hero-number", { text: String(session.currentReps) });

  function setReps(value) {
    session.currentReps = Math.max(1, Math.min(999, Math.round(value)));
    repsNode.textContent = String(session.currentReps);
    pulse(repsNode);
  }

  /* ---- прогресс */
  const progressValue = h("div.progress-value", {
    style: { width: `${Math.min(100, (doneSoFar / Math.max(1, session.target)) * 100)}%` },
  });

  const top = h("div", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: level.name }),
        h("h1.head-title", {
          text: isExtra ? "Сверх плана" : `Подход ${index + 1} из ${session.planned.length}`,
        }),
      ),
      h("button.btn.btn-icon", {
        type: "button",
        "aria-label": "Прервать тренировку",
        text: "✕",
        on: { click: () => { haptic("light"); app.askAbortWorkout(); } },
      }),
    ),
    h("div.progress-track", { style: { "margin-top": "14px" } }, progressValue),
    h("div.hero-note", {
      style: { "text-align": "left", "margin-top": "8px" },
      text: `${doneSoFar} из ${session.target} · осталось ${remaining}`,
    }),
  );

  /* ---- крупное редактируемое число */
  const stage = h("div.rep-stage", {},
    h("div.hero-label", { text: isExtra ? "дополнительный подход" : "цель подхода" }),
    repsNode,
    h("div.hero-unit", { text: plural(session.currentReps, "повтор", "повтора", "повторов") }),
    h("div.stepper", {},
      h("button.btn.stepper-btn", {
        type: "button", "aria-label": "Меньше", text: "−",
        on: { click: () => { haptic("light"); setReps(session.currentReps - 1); } },
      }),
      h("button.btn.stepper-btn", {
        type: "button", "aria-label": "Больше", text: "+",
        on: { click: () => { haptic("light"); setReps(session.currentReps + 1); } },
      }),
    ),
    h("div.quick-row", {},
      [5, 10].map((step) =>
        h("button.btn.quick-chip", {
          type: "button", text: `+${step}`,
          on: { click: () => { haptic("medium"); setReps(session.currentReps + step); } },
        }),
      ).concat([
        h("button.btn.quick-chip", {
          type: "button", text: "по плану",
          on: { click: () => { haptic("select"); setReps(suggested); } },
        }),
      ]),
    ),
  );

  /* ---- лента подходов */
  const strip = h("div.sets-strip", {},
    session.planned.flatMap((planned, i) => {
      const value = i < session.done.length ? session.done[i] : planned;
      const cls = i < session.done.length ? ".is-done" : i === index ? ".is-current" : "";
      const extra = i >= session.plannedBase ? ".is-extra" : "";
      return [
        i > 0 ? h("span.set-dot", { text: "·" }) : null,
        h(`div.set-chip${cls}${extra}`, { text: String(value) }),
      ];
    }),
  );

  /* ---- главная кнопка */
  const doneBtn = h("button.btn.done-btn", {
    type: "button",
    on: { click: () => app.completeSet(session.currentReps) },
  }, h("span", { text: "✓" }), h("span", { text: "Выполнил" }));

  const addSet = h("button.btn.btn-quiet", {
    type: "button",
    text: "+ подход сверх плана",
    on: {
      click: () => {
        haptic("light");
        session.planned.push(Math.max(1, session.planned[session.planned.length - 1]));
        app.save();
        app.render();
      },
    },
  });

  return h("div.screen", {}, top, h("div.spacer"), stage, strip, h("div.spacer"),
    h("div.actions", {}, doneBtn, addSet));
}

/* ------------------------------------------------------------------ отдых */

export function restOverlay(app, seconds, nextReps, onDone) {
  let left = seconds;
  let total = Math.max(1, seconds);

  const timeNode = h("div.rest-time", { text: formatTime(left) });
  const ring = h("div.rest-ring", { html: ringSvg(1) });
  ring.append(
    h("div.rest-center", {},
      h("div", {},
        h("div.rest-caption", { text: "отдых" }),
        timeNode,
      ),
    ),
  );

  const overlay = h("div.rest", {},
    ring,
    h("div.rest-next", { text: `Дальше — ${nextReps} ${plural(nextReps, "повтор", "повтора", "повторов")}` }),
    h("div.rest-actions", {},
      h("button.btn.btn-ghost", {
        type: "button", text: "+30 сек",
        on: {
          click: () => {
            haptic("light");
            left += 30;
            total = Math.max(total, left);
            timeNode.textContent = formatTime(left);
            setRingProgress(ring, left / total);
          },
        },
      }),
      h("button.btn.btn-ghost", {
        type: "button", text: "Готов",
        on: { click: () => { haptic("medium"); finish(); } },
      }),
    ),
  );

  document.body.appendChild(overlay);
  requestAnimationFrame(() => setRingProgress(ring, left / total));

  const timer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      haptic("success");
      finish();
      return;
    }
    timeNode.textContent = formatTime(left);
    setRingProgress(ring, left / total);
  }, 1000);

  function finish() {
    clearInterval(timer);
    overlay.remove();
    onDone?.();
  }

  return { close: finish };
}

function formatTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ==================================================================== ФИНИШ */

export function viewFinish(app) {
  const result = app.lastResult;
  if (!result) return viewToday(app);

  const ex = app.exercise();
  const st = stats(app.state, ex.id);

  const isRecord = result.doneTotal >= st.best && result.doneTotal > 0;
  const overshoot = result.doneTotal - result.target;

  let subtitle = `${result.levelName} · план ${result.target}`;
  if (overshoot > 0) subtitle += ` · сверху ${overshoot}`;

  const screen = h("div.screen.finish", {},
    h("div.finish-mark", { text: isRecord ? "🏆" : "✓" }),
    h("div.finish-title", { text: isRecord ? "Новый рекорд" : "Готово" }),
    h("div.finish-sub", { text: subtitle }),
    h("div.finish-stats", {},
      h("div.finish-stat", {},
        h("div.stat-value", { text: String(result.doneTotal) }),
        h("div.stat-label", { text: plural(result.doneTotal, "повтор", "повтора", "повторов") }),
      ),
      h("div.finish-stat", {},
        h("div.stat-value", { text: String(st.streak.current) }),
        h("div.stat-label", {
          text: `${plural(st.streak.current, "день", "дня", "дней")} подряд`,
        }),
      ),
      h("div.finish-stat", {},
        h("div.stat-value", { text: String(st.best) }),
        h("div.stat-label", { text: "рекорд" }),
      ),
    ),
    h("div.hero-note", {
      text: `Следующая цель этого уровня — ${result.nextTarget}`,
    }),
    h("div.actions", { style: { "margin-top": "28px", width: "100%" } },
      h("button.btn.btn-primary", {
        type: "button", text: "Отлично",
        on: { click: () => { haptic("light"); app.go("today"); } },
      }),
      h("button.btn.btn-quiet", {
        type: "button", text: "Ещё одна тренировка",
        on: { click: () => { haptic("medium"); app.go("levels"); } },
      }),
    ),
  );

  return screen;
}

/* ------------------------------------------------- награды за серию (Duo) */

export function celebrate(app, result) {
  const ex = app.exercise();
  const st = stats(app.state, ex.id);
  const accent = ACCENTS[app.level(result.levelId).accent] ?? ACCENTS.crimson;

  confetti({ colors: [accent.c1, accent.c2, "#ffffff", "#ffd166"], power: result.isRecord ? 1.4 : 1 });
  haptic("success");

  // Пороги серии показываем один раз — иначе награда обесценивается.
  const seen = app.state.settings.seenMilestones ?? [];
  const hit = STREAK_MILESTONES.filter((m) => st.streak.current >= m && !seen.includes(m));
  if (hit.length > 0) {
    const top = hit[hit.length - 1];
    app.state.settings.seenMilestones = [...seen, ...hit];
    app.save();
    setTimeout(() => {
      confetti({ colors: [accent.c1, "#ffd166", "#ffffff"], power: 1.2 });
      haptic("heavy");
      toast({
        icon: FLAMES[flameStage(top)] || "🔥",
        title: `${top} ${plural(top, "день", "дня", "дней")} подряд`,
        subtitle: "Серия держится. Не роняй её.",
        duration: 3600,
      });
    }, 900);
  }
}

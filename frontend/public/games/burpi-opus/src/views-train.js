// Экраны тренировочного цикла: задание на день → выбор уровня → подходы → финиш.
//
// Главный принцип: подходы НЕ ограничены. Приложение подсказывает разумную
// разбивку, но закрывает задание только по сумме повторов. Один подход на всю
// цель — норм. Десять маленьких — тоже. Закончить раньше можно всегда:
// тренировка попадёт в дневник и в серию, но цель не будет засчитана.

import {
  ACCENTS, dayKey, humanDate, humanWeekday, suggestPlan, forecast, stats,
  lastDays, WEEKDAYS_SHORT, flameStage, STREAK_MILESTONES, levelCompletions,
  carryOverToday, goalReachedToday, dayTotal, levelTarget,
} from "./core.js?v=1.1.0";
import { h, plural, toast } from "./ui.js?v=1.1.0";
import { haptic } from "./tg.js?v=1.1.0";
import { confetti, countUp, ringSvg, setRingProgress, pulse } from "./fx.js?v=1.1.0";

const FLAMES = ["🔥", "✨", "🔥", "🔥", "🌟", "💎"];

function levelStyle(level) {
  const a = ACCENTS[level.accent] ?? ACCENTS.crimson;
  return { "--lvl-1": a.c1, "--lvl-2": a.c2 };
}

/* ============================================================ ЗАДАНИЕ НА ДЕНЬ */

export function viewToday(app) {
  const ex = app.exercise();
  const level = app.level();
  const today = dayKey();
  const st = stats(app.state, ex.id);

  const target = levelTarget(app.state, ex.id, level);
  const closed = goalReachedToday(app.state, ex.id, level.id);
  const carry = carryOverToday(app.state, ex.id, level.id);
  const doneToday = dayTotal(app.state, ex.id);
  const left = Math.max(0, target - carry);
  const hint = suggestPlan(app.state, ex.id, level, left).sets;

  app.setAccent(level.accent);

  /* ---- шапка */
  const head = h("div.head", {},
    h("div", {},
      h("div.eyebrow", { text: `${humanWeekday(today)}, ${humanDate(today)}` }),
      h("h1.head-title", { text: closed ? "Задание закрыто" : "Задание на день" }),
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
  const heroValue = closed ? doneToday : target;

  const note = closed
    ? `Следующая цель — ${levelTarget(app.state, ex.id, level)}`
    : carry > 0
      ? `Сегодня уже ${carry} · осталось ${left}`
      : "Разбей как хочешь — важна только сумма";

  const hero = h("div.hero", {},
    h("div.hero-label", { text: closed ? "сделано сегодня" : level.name }),
    heroNumber,
    h("div.hero-unit", { text: ex.name.toLowerCase() }),
    h("div.hero-note", { text: note }),
  );

  /* ---- подсказка по разбивке (именно подсказка, не план) */
  const strip = closed
    ? null
    : h("div", {},
        h("div.hint-caption", {
          text: hint.length > 1 ? `можно так: ${hint.join(" · ")}` : "хоть за один подход",
        }),
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
        ? `+${level.step} к цели — но только когда цель взята. Закончил раньше — она останется прежней`
        : "Фиксированная цель — растёт только «РЕКОРДСМЕН»",
    }),
  );

  /* ---- действия */
  const actions = h("div.actions", {},
    h("button.btn.btn-primary", {
      type: "button",
      text: closed ? "Ещё тренировка" : carry > 0 ? "Продолжить" : "Начать тренировку",
      on: { click: () => { haptic("medium"); app.go("levels"); } },
    }),
    doneToday > 0
      ? h("button.btn.btn-quiet", {
          type: "button",
          text: `Сегодня: ${doneToday} ${plural(doneToday, "повтор", "повтора", "повторов")}`,
          on: { click: () => { haptic("light"); app.go("diary"); } },
        })
      : null,
  );

  const screen = h("div.screen", {}, head, hero, strip, week, forecastCard,
    h("div.spacer"), actions);

  requestAnimationFrame(() => countUp(heroNumber, heroValue, { duration: 640 }));

  return screen;
}

/* ============================================================== ВЫБОР УРОВНЯ */

export function viewLevels(app) {
  const ex = app.exercise();

  const cards = ex.levels.map((level) => {
    const carry = carryOverToday(app.state, ex.id, level.id);
    const target = levelTarget(app.state, ex.id, level);
    const left = Math.max(1, target - carry);
    const plan = suggestPlan(app.state, ex.id, level, left);
    const closedCount = levelCompletions(app.state, ex.id, level.id);

    const parts = [];
    if (carry > 0) parts.push(`осталось ${left} из ${target}`);
    else if (level.tagline) parts.push(level.tagline);
    if (plan.sets.length > 1) parts.push(`можно ${plan.sets.join("·")}`);
    if (level.mode === "progressive" && closedCount > 0) {
      parts.push(`взято ${closedCount} ${plural(closedCount, "раз", "раза", "раз")}`);
    }

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
      h("div.level-badge", { text: String(carry > 0 ? left : target) }),
      h("div.level-body", {},
        h("div.level-name", { text: level.name }),
        h("div.level-meta", { text: parts.join(" · ") }),
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
      text: "Цель посчитана. Сколькими подходами её закрыть — решаешь на месте.",
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

  const level = app.level(session.levelId);
  app.setAccent(level.accent);

  const index = session.done.length;
  const doneHere = session.done.reduce((a, b) => a + b, 0);
  const total = session.carry + doneHere;
  const remaining = Math.max(1, session.target - total);

  // Подсказка на текущий подход: следующий кусок из разбивки, но не больше,
  // чем осталось до цели. Число всегда можно переписать.
  const suggested = Math.min(
    remaining,
    Math.max(1, session.suggestion[index] ?? session.suggestion[session.suggestion.length - 1] ?? remaining),
  );

  if (session.currentReps === null || session.currentReps === undefined) {
    session.currentReps = suggested;
  }

  const repsNode = h("div.hero-number", { text: String(session.currentReps) });
  const unitNode = h("div.hero-unit", {
    text: plural(session.currentReps, "повтор", "повтора", "повторов"),
  });

  function setReps(value) {
    session.currentReps = Math.max(1, Math.min(999, Math.round(value)));
    repsNode.textContent = String(session.currentReps);
    unitNode.textContent = plural(session.currentReps, "повтор", "повтора", "повторов");
    pulse(repsNode);
  }

  /* ---- прогресс */
  const top = h("div", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: level.name }),
        h("h1.head-title", { text: `Подход ${index + 1}` }),
      ),
      h("button.btn.btn-icon", {
        type: "button",
        "aria-label": "Закончить тренировку",
        text: "✕",
        on: { click: () => { haptic("light"); app.askAbortWorkout(); } },
      }),
    ),
    h("div.progress-track", { style: { "margin-top": "14px" } },
      h("div.progress-value", {
        style: { width: `${Math.min(100, (total / Math.max(1, session.target)) * 100)}%` },
      }),
    ),
    h("div.hero-note", {
      style: { "text-align": "left", "margin-top": "8px" },
      text: `${total} из ${session.target} · осталось ${remaining}`,
    }),
  );

  /* ---- крупное редактируемое число */
  const stage = h("div.rep-stage", {},
    h("div.hero-label", { text: "сколько сделал" }),
    repsNode,
    unitNode,
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
        // Закрыть цель одним подходом — один тап, а не десять нажатий на «+».
        h("button.btn.quick-chip.is-strong", {
          type: "button", text: `всё: ${remaining}`,
          on: { click: () => { haptic("medium"); setReps(remaining); } },
        }),
      ]),
    ),
  );

  /* ---- уже сделанные подходы */
  const strip = session.done.length > 0 || session.carry > 0
    ? h("div.sets-strip", {},
        [
          session.carry > 0
            ? h("div.set-chip.is-done.is-extra", { text: String(session.carry), title: "сделано раньше сегодня" })
            : null,
          ...session.done.flatMap((value, i) => [
            i > 0 || session.carry > 0 ? h("span.set-dot", { text: "·" }) : null,
            h("div.set-chip.is-done", { text: String(value) }),
          ]),
        ],
      )
    : h("div.hint-caption", {
        text: session.suggestion.length > 1
          ? `подсказка: ${session.suggestion.join(" · ")}`
          : "можно закрыть за один подход",
      });

  /* ---- главные действия */
  const doneBtn = h("button.btn.done-btn", {
    type: "button",
    on: { click: () => app.completeSet(session.currentReps) },
  }, h("span", { text: "✓" }), h("span", { text: "Записать подход" }));

  const stopBtn = h("button.btn.btn-quiet", {
    type: "button",
    text: doneHere > 0 ? "Хватит на сегодня" : "Отменить тренировку",
    on: { click: () => { haptic("light"); app.askAbortWorkout(); } },
  });

  return h("div.screen", {}, top, h("div.spacer"), stage, strip, h("div.spacer"),
    h("div.actions", {}, doneBtn, stopBtn));
}

/* ------------------------------------------------------------------ отдых */

export function restOverlay(app, seconds, onDone) {
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

  const session = app.session;
  const leftToGoal = session
    ? Math.max(0, session.target - session.carry - session.done.reduce((a, b) => a + b, 0))
    : 0;

  const overlay = h("div.rest", {},
    ring,
    h("div.rest-next", {
      text: `До цели осталось ${leftToGoal} ${plural(leftToGoal, "повтор", "повтора", "повторов")}`,
    }),
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

  const overshoot = result.dayTotal - result.target;
  const mark = result.isRecord ? "🏆" : result.goalReached ? "✓" : "💪";
  const title = result.isRecord ? "Новый рекорд" : result.goalReached ? "Цель взята" : "Записано";

  let subtitle = `${result.levelName} · ${result.dayTotal} из ${result.target}`;
  if (result.goalReached && overshoot > 0) subtitle += ` · сверху ${overshoot}`;

  return h("div.screen.finish", {},
    h("div.finish-mark", { text: mark }),
    h("div.finish-title", { text: title }),
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
      text: result.goalReached
        ? `Следующая цель этого уровня — ${result.nextTarget}`
        : `Цель не засчитана — она осталась прежней: ${result.target}`,
    }),
    h("div.actions", { style: { "margin-top": "28px", width: "100%" } },
      h("button.btn.btn-primary", {
        type: "button", text: "Отлично",
        on: { click: () => { haptic("light"); app.go("today"); } },
      }),
      h("button.btn.btn-quiet", {
        type: "button",
        text: result.goalReached ? "Ещё одна тренировка" : "Продолжить тренировку",
        on: { click: () => { haptic("medium"); app.go("levels"); } },
      }),
    ),
  );
}

/* ------------------------------------------------- награды за серию (Duo) */

export function celebrate(app, result) {
  const ex = app.exercise();
  const st = stats(app.state, ex.id);
  const accent = ACCENTS[app.level(result.levelId).accent] ?? ACCENTS.crimson;

  // Закончил раньше — это тоже тренировка, но без салюта: салют за взятую цель.
  if (!result.goalReached) {
    haptic("light");
    toast({ icon: "📝", title: "Записано в дневник", subtitle: "Цель осталась прежней" });
    return;
  }

  confetti({ colors: [accent.c1, accent.c2, "#ffffff", "#ffd166"], power: result.isRecord ? 1.4 : 1 });
  haptic("success");

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

// Контроллер: состояние, маршруты между экранами и жизненный цикл тренировки.

import {
  loadState, saveState, defaultState, findExercise, findLevel, planFor,
  levelTarget, personalBest, dayKey, uid, ACCENTS,
} from "./core.js?v=1.0.0";
import { initTelegram, haptic, setHapticsEnabled, requestExit, isEmbedded } from "./tg.js?v=1.0.0";
import { setConfettiEnabled } from "./fx.js?v=1.0.0";
import { h, clear, tabIcon, sheet, closeSheet, isSheetOpen, toast, confirmSheet } from "./ui.js?v=1.0.0";
import { viewToday, viewLevels, viewWorkout, viewFinish, restOverlay, celebrate } from "./views-train.js?v=1.0.0";
import { viewDiary, viewSettings } from "./views-data.js?v=1.0.0";

const TABS = [
  { id: "today", label: "Сегодня", icon: "today" },
  { id: "diary", label: "Дневник", icon: "diary" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

// Экраны тренировочного потока забирают весь экран: табы там только мешают.
const FULLSCREEN_VIEWS = new Set(["levels", "workout", "finish"]);

const VIEWS = {
  today: viewToday,
  levels: viewLevels,
  workout: viewWorkout,
  finish: viewFinish,
  diary: viewDiary,
  settings: viewSettings,
};

export const app = {
  state: loadState(),
  view: "today",
  session: null,
  lastResult: null,
  diaryMonth: null,
  rest: null,

  /* ------------------------------------------------------------ доступ */

  exercise() {
    return findExercise(this.state, this.state.activeExerciseId);
  },

  level(levelId) {
    const ex = this.exercise();
    const id = levelId ?? this.state.settings.lastLevelByExercise?.[ex.id];
    return findLevel(ex, id);
  },

  save() {
    saveState(this.state);
  },

  replaceState(next) {
    this.state = next;
    this.session = null;
    this.lastResult = null;
    this.save();
    this.applyPreferences();
    this.go("today");
  },

  applyPreferences() {
    setHapticsEnabled(this.state.settings.haptics !== false);
    setConfettiEnabled(this.state.settings.confetti !== false);
  },

  setAccent(accentKey) {
    const a = ACCENTS[accentKey] ?? ACCENTS.crimson;
    const root = document.documentElement.style;
    root.setProperty("--accent-1", a.c1);
    root.setProperty("--accent-2", a.c2);
  },

  /* ---------------------------------------------------------- маршруты */

  go(view) {
    this.view = view;
    if (view !== "diary") this.diaryMonth = null;
    this.render();
    document.getElementById("view")?.scrollTo({ top: 0 });
  },

  render() {
    const host = document.getElementById("view");
    if (!host) return;
    const build = VIEWS[this.view] ?? viewToday;
    const screen = build(this);

    // Внутри GamePass приложение открыто в iframe: свой выход в хаб оно рисует
    // само, чтобы не накрывать оболочкой собственную шапку. У экранов
    // тренировки выход уже есть — там строка не нужна.
    if (isEmbedded() && !FULLSCREEN_VIEWS.has(this.view)) {
      screen.prepend(
        h("button.btn.exit-bar", {
          type: "button",
          text: "‹ GamePass",
          on: { click: () => { haptic("light"); requestExit(); } },
        }),
      );
    }

    clear(host).append(screen);
    this.renderTabs();
  },

  renderTabs() {
    const bar = document.getElementById("tabbar");
    if (!bar) return;
    bar.classList.toggle("is-hidden", FULLSCREEN_VIEWS.has(this.view));
    clear(bar).append(
      ...TABS.map((tab) =>
        h(`button.tab${this.view === tab.id ? ".is-on" : ""}`, {
          type: "button",
          on: {
            click: () => {
              if (this.view === tab.id) return;
              haptic("select");
              this.go(tab.id);
            },
          },
        },
          h("span", { html: tabIcon(tab.icon) }),
          h("span.tab-label", { text: tab.label }),
        ),
      ),
    );
  },

  /* -------------------------------------------------------- тренировка */

  startWorkout(levelId) {
    const ex = this.exercise();
    const level = findLevel(ex, levelId);
    const plan = planFor(this.state, ex.id, level);

    this.session = {
      id: uid("s"),
      dayKey: dayKey(),
      exerciseId: ex.id,
      levelId: level.id,
      levelName: level.name,
      target: plan.target,
      planned: [...plan.sets],
      plannedBase: plan.sets.length,
      done: [],
      currentReps: null,
      startedAt: new Date().toISOString(),
    };

    this.state.settings.lastLevelByExercise = {
      ...(this.state.settings.lastLevelByExercise ?? {}),
      [ex.id]: level.id,
    };
    this.state.active = this.session;
    this.save();
    this.go("workout");
  },

  completeSet(reps) {
    const session = this.session;
    if (!session) return;

    session.done.push(Math.max(1, Math.round(reps)));
    session.currentReps = null;
    this.state.active = session;
    this.save();
    haptic("heavy");

    const planExhausted = session.done.length >= session.planned.length;
    if (planExhausted) {
      this.finishWorkout();
      return;
    }

    // Сначала обновляем экран тренировки, потом накрываем его таймером:
    // при закрытии отдыха под ним уже правильный подход, без мигания.
    this.render();

    const nextReps = session.planned[session.done.length];
    const rest = this.state.settings;
    if (rest.restEnabled && rest.restSeconds > 0) {
      this.rest = restOverlay(this, rest.restSeconds, nextReps, () => {
        this.rest = null;
      });
    }
  },

  finishWorkout() {
    const session = this.session;
    if (!session) return;

    this.rest?.close?.();
    this.rest = null;

    const doneTotal = session.done.reduce((a, b) => a + b, 0);
    if (doneTotal === 0) {
      this.discardWorkout();
      return;
    }

    // Рекорд считаем ДО записи — иначе свежая тренировка сравнивалась бы сама с собой.
    const bestBefore = personalBest(this.state, session.exerciseId);

    const record = {
      ...session,
      finishedAt: new Date().toISOString(),
      doneTotal,
      sets: [...session.done],
      isRecord: doneTotal > bestBefore,
    };
    delete record.currentReps;

    this.state.sessions.push(record);
    this.state.active = null;
    this.session = null;
    this.save();

    // Цель уровня уже пересчиталась: закрытая тренировка вошла в счётчик.
    const level = findLevel(findExercise(this.state, record.exerciseId), record.levelId);
    this.lastResult = {
      ...record,
      nextTarget: levelTarget(this.state, record.exerciseId, level),
    };

    this.go("finish");
    celebrate(this, record);
  },

  discardWorkout() {
    this.rest?.close?.();
    this.rest = null;
    this.session = null;
    this.state.active = null;
    this.save();
    this.go("today");
  },

  askAbortWorkout() {
    const session = this.session;
    const doneTotal = session ? session.done.reduce((a, b) => a + b, 0) : 0;

    if (doneTotal === 0) {
      this.discardWorkout();
      return;
    }

    sheet({
      title: "Закончить тренировку?",
      subtitle: `Сделано ${doneTotal} из ${session.target}. Записать результат в дневник?`,
      actions: [
        { label: "Записать и выйти", kind: "primary", onClick: () => this.finishWorkout() },
        { label: "Выбросить", danger: true, onClick: () => this.discardWorkout() },
        { label: "Продолжить" },
      ],
    });
  },

  /* ------------------------------------------------------------- старт */

  boot() {
    this.applyPreferences();
    initTelegram();

    // Тренировка, прерванная сворачиванием Telegram, продолжается с того же места.
    const active = this.state.active;
    if (active && active.dayKey === dayKey() && Array.isArray(active.done)) {
      this.session = active;
      this.view = "workout";
    } else if (active) {
      this.state.active = null;
      this.save();
    }

    this.render();

    // Аппаратная «назад» и Escape ведут себя предсказуемо: закрыть лист,
    // иначе вернуться на шаг назад по потоку тренировки.
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (isSheetOpen()) closeSheet();
      else this.back();
    });
  },

  back() {
    if (this.view === "workout") this.askAbortWorkout();
    else if (this.view === "levels" || this.view === "finish") this.go("today");
    else if (this.view !== "today") this.go("today");
    else requestExit();
  },
};

window.addEventListener("DOMContentLoaded", () => app.boot());

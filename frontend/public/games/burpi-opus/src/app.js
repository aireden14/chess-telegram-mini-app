// Контроллер: состояние, маршруты между экранами и жизненный цикл тренировки.

import {
  loadState, saveState, defaultState, findExercise, findLevel, suggestPlan,
  levelTarget, personalBest, carryOverToday, computeStreak, dayKey, uid, ACCENTS,
} from "./core.js?v=1.2.0";
import { initTelegram, haptic, setHapticsEnabled, requestExit, isEmbedded } from "./tg.js?v=1.2.0";
import { setConfettiEnabled } from "./fx.js?v=1.2.0";
import { h, clear, tabIcon, sheet, closeSheet, isSheetOpen, toast } from "./ui.js?v=1.2.0";
import { viewToday, viewLevels, viewWorkout, viewFinish, restOverlay, celebrate } from "./views-train.js?v=1.2.0";
import { viewDiary, viewSettings } from "./views-data.js?v=1.2.0";

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
    const target = levelTarget(this.state, ex.id, level);
    // Незакрытая работа за сегодня переносится в эту тренировку: сделал 10 из
    // 31 утром — вечером добиваешь 21, а не начинаешь цель заново.
    const carry = carryOverToday(this.state, ex.id, level.id);
    const plan = suggestPlan(this.state, ex.id, level, Math.max(1, target - carry));

    this.session = {
      id: uid("s"),
      dayKey: dayKey(),
      exerciseId: ex.id,
      levelId: level.id,
      levelName: level.name,
      target,
      carry,
      suggestion: [...plan.sets],
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

    // Тренировка заканчивается по СУММЕ, а не по числу подходов: закрыл цель
    // одним подходом — значит всё, дальше приложение не гоняет.
    const total = session.carry + session.done.reduce((a, b) => a + b, 0);
    if (total >= session.target) {
      this.finishWorkout();
      return;
    }

    // Сначала обновляем экран тренировки, потом накрываем его таймером:
    // при закрытии отдыха под ним уже правильный подход, без мигания.
    this.render();

    const rest = this.state.settings;
    if (rest.restEnabled && rest.restSeconds > 0) {
      this.rest = restOverlay(this, rest.restSeconds, () => {
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

    // Рекорд считаем ДО записи — иначе свежая тренировка сравнивалась бы сама
    // с собой. Рекорд дневной, поэтому в bestBefore уже входит утренний заход.
    const bestBefore = personalBest(this.state, session.exerciseId);
    const dayTotalNow = session.carry + doneTotal;

    const record = {
      ...session,
      finishedAt: new Date().toISOString(),
      doneTotal,
      sets: [...session.done],
      // Цель засчитана только если сумма (с учётом сделанного раньше сегодня)
      // добралась до плана. Закончил раньше — тренировка есть, цели нет.
      goalReached: dayTotalNow >= session.target,
    };
    delete record.currentReps;

    this.state.sessions.push(record);
    // Рекорд — только за взятую цель. Закончил раньше — результат в дневнике
    // есть и в лучший день он войдёт, но как рекорд не празднуется.
    record.isRecord = record.goalReached
      && personalBest(this.state, record.exerciseId) > bestBefore;
    this.state.active = null;
    this.session = null;
    this.save();

    // Цель уровня пересчитана: она сдвигается только за ВЗЯТУЮ цель.
    const level = findLevel(findExercise(this.state, record.exerciseId), record.levelId);
    this.lastResult = {
      ...record,
      dayTotal: dayTotalNow,
      nextTarget: levelTarget(this.state, record.exerciseId, level),
    };

    this.go("finish");
    celebrate(this, record);
  },

  /* -------------------------------------------------------- удаление записей */

  // Удаление сразу применяется и предлагает отмену в тосте: так не приходится
  // переспрашивать «вы уверены?» на каждое действие, а ошибиться нельзя.
  removeSessions(ids, { title, subtitle }) {
    const set = new Set(ids);
    const removed = this.state.sessions.filter((s) => set.has(s.id));
    if (removed.length === 0) return;

    this.state.sessions = this.state.sessions.filter((s) => !set.has(s.id));
    // Прерванная тренировка того же дня тоже уходит — иначе она «воскреснет».
    if (this.state.active && removed.some((s) => s.dayKey === this.state.active.dayKey)) {
      this.state.active = null;
      if (this.session && removed.some((s) => s.dayKey === this.session.dayKey)) {
        this.rest?.close?.();
        this.rest = null;
        this.session = null;
        if (this.view === "workout") this.view = "diary";
      }
    }
    this.forgetUnreachedMilestones();
    this.save();
    this.render();

    toast({
      icon: "🧹",
      title,
      subtitle,
      duration: 6000,
      action: {
        label: "Вернуть",
        onClick: () => {
          this.state.sessions = [...this.state.sessions, ...removed]
            .sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
          this.forgetUnreachedMilestones();
          this.save();
          this.render();
          toast({ icon: "↩️", title: "Возвращено" });
        },
      },
    });
  },

  // После удаления серия могла упасть: снимаем отметки о наградах, которых
  // больше нет, иначе они не покажутся при повторном достижении.
  forgetUnreachedMilestones() {
    const best = this.state.exercises.reduce(
      (max, ex) => Math.max(max, computeStreak(this.state, ex.id).best),
      0,
    );
    this.state.settings.seenMilestones =
      (this.state.settings.seenMilestones ?? []).filter((m) => m <= best);
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

    const total = session.carry + doneTotal;
    const short = Math.max(0, session.target - total);

    sheet({
      title: "Хватит на сегодня?",
      subtitle: short > 0
        ? `Сделано ${total} из ${session.target}. Запишем в дневник, но цель не засчитается — до неё ещё ${short}.`
        : `Сделано ${total} из ${session.target}. Цель взята.`,
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

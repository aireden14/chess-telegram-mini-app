// Контроллер: состояние, маршруты между экранами и жизненный цикл тренировки.

import {
  loadState, saveState, defaultState, findExercise, findLevel, suggestPlan,
  levelTarget, personalBest, carryOverToday, computeStreak, dayKey, uid, ACCENTS,
  setTimeZone,
} from "./core.js?v=1.7.0";
import { initTelegram, haptic, setHapticsEnabled, requestExit, isEmbedded, reportDayComplete } from "./tg.js?v=1.7.0";
import { setConfettiEnabled } from "./fx.js?v=1.7.0";
import { configureSound, installAudioUnlock, playSound, audioMixMode } from "./sound.js?v=1.7.0";
import { h, clear, tabIcon, sheet, closeSheet, isSheetOpen, toast } from "./ui.js?v=1.7.0";
import { viewToday, viewLevels, viewWorkout, viewFinish, restOverlay, celebrate } from "./views-train.js?v=1.7.0";
import { viewDiary, viewSettings } from "./views-data.js?v=1.7.0";

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
    // Пояс задаёт границы суток, поэтому применяется до первого расчёта дня.
    setTimeZone(this.state.settings.timeZone ?? null);
    configureSound({
      enabled: this.state.settings.sound === true,
      volume: this.state.settings.soundVolume ?? "mid",
    });
  },

  // Звук включаем сами только там, где он гарантированно подмешивается к
  // чужой музыке. Где это не гарантировано — оставляем выключенным: молчащее
  // приложение лучше, чем приложение, оборвавшее музыку на первом же подходе.
  decideInitialSound() {
    if (this.state.settings.sound !== null && this.state.settings.sound !== undefined) return;
    // Включаем сами везде, кроме старого iOS, где звук может оборвать музыку.
    this.state.settings.sound = audioMixMode() !== "risky";
    this.save();
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
              playSound("tap");
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

    // Взятая цель НЕ заканчивает тренировку: приложение только подтверждает,
    // что план закрыт, и оставляет решение человеку — завершить или добавить
    // ещё подход (например, пять по 40 при цели 30).
    const total = session.carry + session.done.reduce((a, b) => a + b, 0);
    const justReached = total >= session.target && !session.goalAnnounced;
    if (justReached) session.goalAnnounced = true;
    this.save();

    if (justReached) {
      haptic("success");
      playSound("goal");
      toast({
        icon: "✓",
        title: `Цель взята — ${total} из ${session.target}`,
        subtitle: "Можно завершить или добавить ещё подход",
        duration: 4000,
      });
    } else {
      haptic("heavy");
      // Нота ползёт вверх с каждым подходом — серия слышна, а не только видна.
      playSound("set", { index: session.done.length - 1 });
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
    reportDayComplete(record.dayKey);

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
    playSound("erase");

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
          playSound("undo");
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

  // Единственный выход из тренировки: и кнопка «Завершить», и ✕, и отдых.
  // Цель взята — заканчиваем молча, без лишнего вопроса. Не взята — коротко
  // предупреждаем, что она не засчитается, и даём передумать.
  finishFromWorkout() {
    const session = this.session;
    const doneTotal = session ? session.done.reduce((a, b) => a + b, 0) : 0;

    if (doneTotal === 0) {
      this.discardWorkout();
      return;
    }

    const total = session.carry + doneTotal;
    const short = Math.max(0, session.target - total);

    if (short === 0) {
      this.finishWorkout();
      return;
    }

    sheet({
      title: "Завершить тренировку?",
      subtitle: `Сделано ${total} из ${session.target}. Запишем в дневник, но цель не засчитается — до неё ещё ${short}.`,
      actions: [
        { label: "Завершить", kind: "primary", onClick: () => this.finishWorkout() },
        { label: "Выбросить тренировку", danger: true, onClick: () => this.discardWorkout() },
        { label: "Продолжить" },
      ],
    });
  },

  /* ------------------------------------------------------------- старт */

  boot() {
    this.applyPreferences();
    initTelegram();
    this.decideInitialSound();
    this.applyPreferences();

    // AudioContext создаётся только из жеста, а система усыпляет его когда
    // угодно — сворачивание, звонок, чужое аудио. Поэтому слушатели постоянные,
    // а не одноразовые: иначе звук пропадает после первого же возврата в апп.
    installAudioUnlock();

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

    // После обновления напоминаний ранее закрытая тренировка тоже должна
    // остановить сообщения сразу при первом открытии приложения.
    if (this.state.sessions.some((item) => item.finishedAt && item.dayKey === dayKey())) {
      reportDayComplete(dayKey());
    }

    // Аппаратная «назад» и Escape ведут себя предсказуемо: закрыть лист,
    // иначе вернуться на шаг назад по потоку тренировки.
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (isSheetOpen()) closeSheet();
      else this.back();
    });
  },

  back() {
    if (this.view === "workout") this.finishFromWorkout();
    else if (this.view === "levels" || this.view === "finish") this.go("today");
    else if (this.view !== "today") this.go("today");
    else requestExit();
  },
};

window.addEventListener("DOMContentLoaded", () => app.boot());

// Контроллер: состояние, маршруты между экранами и жизненный цикл записи.

import {
  loadState, saveState, activeBook, findBook, readingBooks,
  bookProgress, dayKey, dayPages, dailyGoal, computeStreak, uid, ACCENTS,
  ACCENT_KEYS, setTimeZone, nextAccent, STREAK_MILESTONES, flameIcon,
} from "./core.js?v=1.0.0";
import { initTelegram, haptic, setHapticsEnabled, requestExit, isEmbedded } from "./tg.js?v=1.0.0";
import { setConfettiEnabled, confetti } from "./fx.js?v=1.0.0";
import { configureSound, installAudioUnlock, playSound, audioMixMode } from "./sound.js?v=1.0.0";
import { h, clear, tabIcon, closeSheet, isSheetOpen, toast, plural } from "./ui.js?v=1.0.0";
import { viewToday, viewLog, viewFinish } from "./views-today.js?v=1.0.0";
import { viewBooks } from "./views-books.js?v=1.0.0";
import { viewDiary, viewSettings } from "./views-data.js?v=1.0.0";

const TABS = [
  { id: "today", label: "Сегодня", icon: "today" },
  { id: "books", label: "Полка", icon: "books" },
  { id: "diary", label: "Дневник", icon: "diary" },
  { id: "settings", label: "Настройки", icon: "settings" },
];

// Экраны записи забирают весь экран: табы там только мешают.
const FULLSCREEN_VIEWS = new Set(["log", "finish"]);

const VIEWS = {
  today: viewToday,
  log: viewLog,
  finish: viewFinish,
  books: viewBooks,
  diary: viewDiary,
  settings: viewSettings,
};

export const app = {
  state: loadState(),
  view: "today",
  draft: null,
  lastResult: null,
  diaryMonth: null,

  /* ------------------------------------------------------------ доступ */

  book() {
    return activeBook(this.state);
  },

  goal() {
    return dailyGoal(this.state);
  },

  save() {
    saveState(this.state);
  },

  replaceState(next) {
    this.state = next;
    this.draft = null;
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
  // чужой музыке: читают часто под музыку, и оборвать её — худшее, что может
  // сделать трекер чтения.
  decideInitialSound() {
    if (this.state.settings.sound !== null && this.state.settings.sound !== undefined) return;
    this.state.settings.sound = audioMixMode() !== "risky";
    this.save();
  },

  // Цвет книги, которую читаешь сейчас, красит весь экран.
  setAccent(accentKey) {
    const a = ACCENTS[accentKey] ?? ACCENTS.amber;
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
    // само, чтобы оболочка не накрывала собственную шапку.
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

  /* ------------------------------------------------------------- книги */

  addBook({ title, author, pages, startFrom, accent }) {
    const book = {
      id: uid("b"),
      title,
      author: author ?? "",
      pages: Math.max(0, Math.round(pages || 0)),
      startFrom: Math.max(0, Math.round(startFrom || 0)),
      accent: accent ?? nextAccent(this.state),
      status: "reading",
      addedAt: new Date().toISOString(),
      finishedAt: null,
      finishedDay: null,
      finishedPage: 0,
      review: null,
    };
    this.state.books.push(book);
    this.state.activeBookId = book.id;
    this.state.settings.accentCursor =
      (Number(this.state.settings.accentCursor ?? 0) + 1) % ACCENT_KEYS.length;
    this.save();
    return book;
  },

  setActiveBook(bookId) {
    this.state.activeBookId = bookId;
    this.save();
  },

  // Книгу можно вернуть в чтение: передумал — и она снова на главной.
  reopenBook(book) {
    book.status = "reading";
    book.finishedAt = null;
    book.finishedDay = null;
    this.state.activeBookId = book.id;
    this.save();
    this.render();
    toast({ icon: "📖", title: "Книга снова в чтении", subtitle: "Отзыв сохранён — его можно поправить" });
  },

  /**
   * Закрыть книгу. `status`: "finished" — дочитал, "dropped" — отложил.
   * Дочитать можно на любой странице: сноски, указатели и благодарности
   * никто не читает, и приложение не должно этого требовать.
   */
  closeBook(book, { status, page, review }) {
    book.status = status;
    book.finishedAt = new Date().toISOString();
    book.finishedDay = dayKey();
    book.finishedPage = Math.max(0, Math.round(page ?? bookProgress(this.state, book).page));
    book.review = review ?? book.review ?? null;

    if (this.state.activeBookId === book.id) {
      this.state.activeBookId = readingBooks(this.state)[0]?.id ?? null;
    }
    this.save();

    if (status === "finished") {
      const a = ACCENTS[book.accent] ?? ACCENTS.amber;
      confetti({ colors: [a.c1, a.c2, "#ffffff", "#ffd166"], power: 1.3 });
      haptic("success");
      playSound("book");
      toast({ icon: "🏁", title: "Книга дочитана", subtitle: book.title, duration: 3600 });
    } else {
      haptic("light");
      playSound("drop");
      toast({ icon: "📕", title: "Книга отложена", subtitle: "Она осталась на полке с отметкой" });
    }

    this.go("books");
  },

  removeBook(book) {
    const sessions = this.state.sessions.filter((s) => s.bookId === book.id);
    const index = this.state.books.findIndex((b) => b.id === book.id);
    const removed = this.state.books[index];
    if (!removed) return;

    this.state.books.splice(index, 1);
    this.state.sessions = this.state.sessions.filter((s) => s.bookId !== book.id);
    if (this.state.activeBookId === book.id) {
      this.state.activeBookId = readingBooks(this.state)[0]?.id ?? null;
    }
    if (this.draft?.bookId === book.id) this.cancelLog(true);
    this.forgetUnreachedMilestones();
    this.save();
    this.render();
    playSound("erase");

    toast({
      icon: "🧹",
      title: "Книга удалена",
      subtitle: `Вместе с ней ${sessions.length} ${plural(sessions.length, "запись", "записи", "записей")}`,
      duration: 6000,
      action: {
        label: "Вернуть",
        onClick: () => {
          this.state.books.splice(index, 0, removed);
          this.state.sessions = [...this.state.sessions, ...sessions]
            .sort((a, b) => (a.at < b.at ? -1 : 1));
          this.forgetUnreachedMilestones();
          this.save();
          this.render();
          playSound("undo");
          toast({ icon: "↩️", title: "Возвращено" });
        },
      },
    });
  },

  /* --------------------------------------------------------- запись чтения */

  // Экран записи — один «подход» и всё: сколько страниц прочитал сегодня.
  startLog(bookId) {
    const book = findBook(this.state, bookId) ?? this.book();
    if (!book) return;
    const { page } = bookProgress(this.state, book);
    this.draft = {
      bookId: book.id,
      dayKey: dayKey(),
      fromPage: page,
      pages: 0,
    };
    this.state.draft = this.draft;
    this.save();
    this.go("log");
  },

  updateDraft(pages) {
    if (!this.draft) return;
    this.draft.pages = Math.max(0, Math.min(9999, Math.round(pages)));
    this.state.draft = this.draft;
    this.save();
  },

  cancelLog(silent = false) {
    this.draft = null;
    this.state.draft = null;
    this.save();
    if (!silent) this.go("today");
  },

  saveLog() {
    const draft = this.draft;
    if (!draft || draft.pages <= 0) {
      this.cancelLog();
      return;
    }
    const book = findBook(this.state, draft.bookId);
    if (!book) {
      this.cancelLog();
      return;
    }

    const goal = this.goal();
    const before = dayPages(this.state, draft.dayKey);
    const streakBefore = computeStreak(this.state).current;

    const session = {
      id: uid("r"),
      bookId: book.id,
      dayKey: draft.dayKey,
      pages: draft.pages,
      fromPage: draft.fromPage,
      toPage: draft.fromPage + draft.pages,
      at: new Date().toISOString(),
    };
    this.state.sessions.push(session);
    this.draft = null;
    this.state.draft = null;
    this.save();

    const after = before + draft.pages;
    this.lastResult = {
      session,
      bookId: book.id,
      dayTotal: after,
      goal,
      justReached: before < goal && after >= goal,
      streakBefore,
      streakAfter: computeStreak(this.state).current,
    };

    this.go("finish");
    this.celebrate();
  },

  celebrate() {
    const result = this.lastResult;
    if (!result) return;
    const book = findBook(this.state, result.bookId);
    const a = ACCENTS[book?.accent] ?? ACCENTS.amber;

    if (result.justReached) {
      confetti({ colors: [a.c1, a.c2, "#ffffff", "#ffd166"] });
      haptic("success");
      playSound("goal");
      toast({
        icon: "✓",
        title: `Цель дня взята — ${result.dayTotal} из ${result.goal}`,
        subtitle: "Дальше можно читать сколько хочется",
        duration: 3400,
      });
    } else {
      haptic("medium");
      playSound("page");
    }

    // Порог серии — отдельный праздник: он про привычку, а не про объём.
    const streak = result.streakAfter;
    const seen = this.state.settings.seenMilestones ?? [];
    const hit = STREAK_MILESTONES.filter((m) => streak >= m && !seen.includes(m));
    if (hit.length === 0) return;

    const top = hit[hit.length - 1];
    this.state.settings.seenMilestones = [...seen, ...hit];
    this.save();
    setTimeout(() => {
      confetti({ colors: [a.c1, "#ffd166", "#ffffff"], power: 1.2 });
      haptic("heavy");
      playSound("milestone");
      toast({
        icon: flameIcon(top),
        title: `${top} ${plural(top, "день", "дня", "дней")} подряд`,
        subtitle: "Серия держится. Не роняй её.",
        duration: 3600,
      });
    }, 900);
  },

  /* -------------------------------------------------------- удаление записей */

  // Удаление сразу применяется и предлагает отмену в тосте: так не приходится
  // переспрашивать «вы уверены?» на каждое действие, а ошибиться нельзя.
  removeSessions(ids, { title, subtitle }) {
    const set = new Set(ids);
    const removed = this.state.sessions.filter((s) => set.has(s.id));
    if (removed.length === 0) return;

    this.state.sessions = this.state.sessions.filter((s) => !set.has(s.id));
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
            .sort((a, b) => (a.at < b.at ? -1 : 1));
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
    const best = computeStreak(this.state).best;
    this.state.settings.seenMilestones =
      (this.state.settings.seenMilestones ?? []).filter((m) => m <= best);
  },

  /* ------------------------------------------------------------- старт */

  boot() {
    this.applyPreferences();
    initTelegram();
    this.decideInitialSound();
    this.applyPreferences();

    // AudioContext создаётся только из жеста, а система усыпляет его когда
    // угодно — сворачивание, звонок, чужое аудио. Поэтому слушатели постоянные.
    installAudioUnlock();

    // Незаконченная запись переживает сворачивание Telegram — но только внутри
    // своего дня: вчерашний черновик уже не про сегодня.
    const draft = this.state.draft;
    if (draft && draft.dayKey === dayKey() && findBook(this.state, draft.bookId)) {
      this.draft = draft;
      this.view = "log";
    } else if (draft) {
      this.state.draft = null;
      this.save();
    }

    this.render();

    // Аппаратная «назад» и Escape ведут себя предсказуемо: закрыть лист,
    // иначе вернуться на шаг назад.
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (isSheetOpen()) closeSheet();
      else this.back();
    });
  },

  back() {
    if (this.view === "log") this.cancelLog();
    else if (this.view !== "today") this.go("today");
    else requestExit();
  },
};

window.addEventListener("DOMContentLoaded", () => app.boot());

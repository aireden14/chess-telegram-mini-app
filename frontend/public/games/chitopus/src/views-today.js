// Экраны дня: сегодняшняя норма → запись страниц → итог.
//
// Подходов здесь нет и не будет: чтение — это одна запись «сколько прочитал».
// Цель фиксированная (30 страниц) и не растёт. Для серии хватает одной
// страницы: важно не пропустить день, а не выжать норму любой ценой.

import {
  bookProgress, dayKey, dayPages, humanDate, humanWeekday,
  lastDays, WEEKDAYS_SHORT, readingBooks, stats, flameIcon,
} from "./core.js?v=1.0.0";
import { h, plural } from "./ui.js?v=1.0.0";
import { bookCard, bookSheet, finishFlow } from "./views-books.js?v=1.0.0";
import { daySheet } from "./views-data.js?v=1.0.0";
import { haptic } from "./tg.js?v=1.0.0";
import { countUp, pulse } from "./fx.js?v=1.0.0";
import { playSound } from "./sound.js?v=1.0.0";

/* ================================================================= СЕГОДНЯ */

export function viewToday(app) {
  const book = app.book();
  const today = dayKey();
  const goal = app.goal();
  const done = dayPages(app.state, today);
  const left = Math.max(0, goal - done);
  const st = stats(app.state);

  app.setAccent(book?.accent ?? "amber");

  const head = h("div.head", {},
    h("div", {},
      h("div.eyebrow", { text: `${humanWeekday(today)}, ${humanDate(today)}` }),
      h("h1.head-title", { text: left === 0 && done > 0 ? "Норма прочитана" : "Сегодня" }),
    ),
    h("div.pill-row", {},
      h(`div.pill${st.streak.current > 0 ? ".is-hot" : ".is-muted"}`, {},
        h("span", { text: flameIcon(st.streak.current) }),
        h("span.pill-num", { text: String(st.streak.current) }),
      ),
    ),
  );

  /* ---- герой: прочитано сегодня, а под ним шкала до нормы */
  const heroNumber = h("div.hero-number", { text: "0" });
  const hero = h("div.hero", {},
    h("div.hero-label", { text: done > 0 ? "прочитано сегодня" : `цель дня — ${goal}` }),
    heroNumber,
    h("div.hero-unit", { text: plural(done, "страница", "страницы", "страниц") }),
    h("div.hero-note", {
      text: left === 0
        ? done > goal
          ? `Норма ${goal} взята · сверху ${done - goal}`
          : `Норма ${goal} взята`
        : done > 0
          ? `До нормы ещё ${left} стр.`
          : "Даже одна страница удержит серию",
    }),
  );

  const bar = h("div.progress-track", {},
    h("div.progress-value", { style: { width: `${Math.min(100, (done / goal) * 100)}%` } }),
  );

  /* ---- книга, в которую пишутся страницы */
  const bookBlock = book
    ? bookCard(app, book, { active: true, onClick: () => bookSheet(app, book) })
    // Без книги карточка молчит: кнопка «Добавить книгу» и так стоит главной
    // внизу экрана, две одинаковые кнопки на пустом экране только сбивают.
    : h("div.card", {},
        h("div.card-title", { text: "Что читаешь" }),
        h("div.empty", {
          style: { padding: "6px 0 4px" },
          text: "Книги пока нет. Добавь ту, что читаешь сейчас, — страницы будут писаться в неё.",
        }),
      );

  /* ---- неделя: сплошная отметка — норма, контурная — читал меньше нормы */
  const week = h("div.week", {},
    lastDays(app.state, 7).map((d) =>
      h(`div.week-cell${d.isToday ? ".is-today" : ""}${d.full ? ".is-done" : ""}`, {},
        h("div.week-name", { text: WEEKDAYS_SHORT[d.weekday] }),
        h(`div.week-mark${d.full ? ".is-done" : ""}${d.part ? ".is-part" : ""}`, {
          text: d.full ? "✓" : d.part ? String(d.pages) : "",
          title: d.pages ? `${d.pages} стр.` : "",
        }),
      ),
    ),
  );

  /* ---- вторая и следующие книги: читать можно параллельно */
  const others = readingBooks(app.state).filter((b) => b.id !== book?.id);
  const othersCard = others.length > 0
    ? h("div.card", {},
        h("div.card-title", { text: "Тоже в работе" }),
        h("div.book-list", {},
          others.map((b) => bookCard(app, b, { onClick: () => bookSheet(app, b) })),
        ),
      )
    : null;

  /* ---- одна строка прогноза: карточка ради двух чисел не нужна, а главная
     кнопка на телефоне должна оставаться видимой без прокрутки */
  const progress = book ? bookProgress(app.state, book) : null;
  const forecast = [];
  if (book && progress.total && progress.left > 0) {
    forecast.push(`до конца ещё ≈${Math.max(1, Math.ceil(progress.left / goal))} ${plural(Math.max(1, Math.ceil(progress.left / goal)), "день", "дня", "дней")} по ${goal} стр.`);
  }
  if (st.pace > 0) forecast.push(`темп ${st.pace} стр. в день`);
  const forecastLine = forecast.length > 0
    ? h("div.hint-caption", { text: forecast.join(" · ") })
    : null;

  /* ---- действия */
  const actions = h("div.actions", {},
    h("button.btn.btn-primary", {
      type: "button",
      text: book ? (done > 0 ? "Записать ещё страницы" : "Записать страницы") : "Добавить книгу",
      on: {
        click: () => {
          haptic("medium");
          playSound("tap");
          if (book) app.startLog(book.id);
          else bookSheet(app, null);
        },
      },
    }),
    book
      ? h("button.btn.btn-ghost", {
          type: "button",
          text: "Дочитал книгу",
          on: { click: () => { haptic("light"); playSound("tap"); finishFlow(app, book); } },
        })
      : null,
    done > 0
      ? h("button.btn.btn-quiet", {
          type: "button",
          text: `Сегодня: ${done} ${plural(done, "страница", "страницы", "страниц")}`,
          on: { click: () => { haptic("light"); daySheet(app, today); } },
        })
      : null,
  );

  const screen = h("div.screen", {}, head, hero, bar, bookBlock, week, forecastLine,
    othersCard, h("div.spacer"), actions);

  requestAnimationFrame(() => countUp(heroNumber, done, { duration: 640 }));

  return screen;
}

/* =================================================================== ЗАПИСЬ */

export function viewLog(app) {
  const draft = app.draft;
  if (!draft) return viewToday(app);

  const book = app.state.books.find((b) => b.id === draft.bookId);
  if (!book) return viewToday(app);

  app.setAccent(book.accent);

  const goal = app.goal();
  const doneEarlier = dayPages(app.state, draft.dayKey);
  const { total } = bookProgress(app.state, book);
  const leftToGoal = Math.max(0, goal - doneEarlier);

  const pagesNode = h("div.hero-number", { text: String(draft.pages) });
  const unitNode = h("div.hero-unit", {
    text: plural(draft.pages, "страница", "страницы", "страниц"),
  });
  const atInput = h("input.input.is-num", {
    type: "number", inputmode: "numeric", min: String(draft.fromPage),
    value: String(draft.fromPage + draft.pages),
  });
  const noteNode = h("div.hero-note", {});
  const saveBtn = h("button.btn.done-btn", { type: "button" },
    h("span", { text: "✓" }), h("span", { text: "Записать" }));

  function paint() {
    pagesNode.textContent = String(draft.pages);
    unitNode.textContent = plural(draft.pages, "страница", "страницы", "страниц");
    atInput.value = String(draft.fromPage + draft.pages);
    const dayTotal = doneEarlier + draft.pages;
    noteNode.textContent = draft.pages === 0
      ? "Поставь, сколько страниц прочитал"
      : `Стр. ${draft.fromPage} → ${draft.fromPage + draft.pages}`
        + (total ? ` из ${total}` : "")
        + ` · за день ${dayTotal} из ${goal}`;
    saveBtn.disabled = draft.pages <= 0;
  }

  // Два способа записать одно и то же: крупным счётчиком (сколько прочитал)
  // и номером страницы, на которой остановился. Читателю ближе то одно, то
  // другое — днём удобнее «+10», перед сном проще списать номер с бумаги.
  function setPages(value) {
    app.updateDraft(value);
    paint();
    pulse(pagesNode);
  }

  function setAtPage(value) {
    setPages(Math.max(0, Math.round(value) - draft.fromPage));
  }

  const top = h("div", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: book.title }),
        h("h1.head-title", { text: "Сколько прочитал" }),
      ),
      h("button.btn.btn-icon", {
        type: "button",
        "aria-label": "Отменить запись",
        text: "✕",
        on: { click: () => { haptic("light"); app.cancelLog(); } },
      }),
    ),
    h("div.progress-track", { style: { "margin-top": "14px" } },
      h("div.progress-value", {
        style: { width: `${Math.min(100, (doneEarlier / goal) * 100)}%` },
      }),
    ),
    h("div.hero-note", {
      style: { "text-align": "left", "margin-top": "8px" },
      text: doneEarlier > 0
        ? `Сегодня уже ${doneEarlier} из ${goal}`
        : `Норма дня — ${goal} стр.`,
    }),
  );

  const quick = h("div.quick-row", {},
    [5, 10, 25].map((step) =>
      h("button.btn.quick-chip", {
        type: "button", text: `+${step}`,
        on: { click: () => { haptic("light"); playSound("tap"); setPages(draft.pages + step); } },
      }),
    ).concat(
      leftToGoal > 0
        ? [h("button.btn.quick-chip.is-strong", {
            type: "button", text: `до нормы: ${leftToGoal}`,
            on: { click: () => { haptic("medium"); playSound("tap"); setPages(leftToGoal); } },
          })]
        : [],
    ),
  );

  const stage = h("div.rep-stage", {},
    h("div.hero-label", { text: "страниц за сегодня" }),
    pagesNode,
    unitNode,
    h("div.stepper", {},
      h("button.btn.stepper-btn", {
        type: "button", "aria-label": "Меньше", text: "−",
        on: { click: () => { haptic("light"); playSound("tap"); setPages(draft.pages - 1); } },
      }),
      h("button.btn.stepper-btn", {
        type: "button", "aria-label": "Больше", text: "+",
        on: { click: () => { haptic("light"); playSound("tap"); setPages(draft.pages + 1); } },
      }),
    ),
    quick,
  );

  const atRow = h("div.page-at", {},
    h("div.page-at-label", { text: "Остановился на стр." }),
    atInput,
    total ? h("div.page-at-total", { text: `из ${total}` }) : null,
  );

  atInput.addEventListener("change", () => setAtPage(Number(atInput.value) || draft.fromPage));
  atInput.addEventListener("blur", () => setAtPage(Number(atInput.value) || draft.fromPage));

  saveBtn.addEventListener("click", () => app.saveLog());

  paint();

  return h("div.screen", {}, top, h("div.spacer"), stage, atRow, noteNode, h("div.spacer"),
    h("div.actions", {},
      saveBtn,
      h("button.btn.btn-quiet", {
        type: "button",
        text: "Отмена",
        on: { click: () => { haptic("light"); app.cancelLog(); } },
      }),
    ),
  );
}

/* ==================================================================== ИТОГ */

export function viewFinish(app) {
  const result = app.lastResult;
  if (!result) return viewToday(app);

  const book = app.state.books.find((b) => b.id === result.bookId);
  const st = stats(app.state);
  const progress = book ? bookProgress(app.state, book) : null;

  // Счётчик дошёл до конца книги — самое время предложить её закрыть, но
  // решает всё равно человек: последние страницы часто оказываются сносками.
  const atEnd = Boolean(book) && book.status === "reading"
    && progress.total > 0 && progress.page >= progress.total;

  const mark = result.justReached ? "✓" : "📖";
  const title = result.justReached ? "Норма дня взята" : "Записано";
  const over = result.dayTotal - result.goal;

  let subtitle = book ? book.title : "";
  if (progress?.total) subtitle += ` · стр. ${progress.page} из ${progress.total}`;

  return h("div.screen.finish", {},
    h("div.finish-mark", { text: mark }),
    h("div.finish-title", { text: title }),
    h("div.finish-sub", { text: subtitle }),
    h("div.finish-stats", {},
      h("div.finish-stat", {},
        h("div.stat-value", { text: String(result.dayTotal) }),
        h("div.stat-label", { text: `из ${result.goal} за день` }),
      ),
      h("div.finish-stat", {},
        h("div.stat-value", { text: String(st.streak.current) }),
        h("div.stat-label", {
          text: `${plural(st.streak.current, "день", "дня", "дней")} подряд`,
        }),
      ),
      h("div.finish-stat", {},
        h("div.stat-value", { text: progress?.total ? `${Math.round(progress.pct * 100)}%` : String(progress?.read ?? 0) }),
        h("div.stat-label", { text: progress?.total ? "книга пройдена" : "страниц в книге" }),
      ),
    ),
    h("div.hero-note", {
      text: atEnd
        ? "Похоже, книга закончилась. Закрыть её и написать отзыв?"
        : result.justReached
          ? over > 0 ? `Сверху нормы ${over} стр.` : "Норма ровно в цель"
          : `До нормы ещё ${Math.max(0, result.goal - result.dayTotal)} стр. — но день уже засчитан в серию`,
    }),
    h("div.actions", { style: { "margin-top": "28px", width: "100%" } },
      atEnd
        ? h("button.btn.btn-primary", {
            type: "button", text: "Дочитал книгу",
            on: { click: () => { haptic("medium"); finishFlow(app, book); } },
          })
        : h("button.btn.btn-primary", {
            type: "button", text: "Отлично",
            on: { click: () => { haptic("light"); app.go("today"); } },
          }),
      h("button.btn.btn-quiet", {
        type: "button",
        text: atEnd ? "Ещё читаю" : "Записать ещё",
        on: {
          click: () => {
            haptic("light");
            if (atEnd) app.go("today");
            else if (book && book.status === "reading") app.startLog(book.id);
            else app.go("today");
          },
        },
      }),
    ),
  );
}

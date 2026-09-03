// Полка: что читаю сейчас, что дочитал, что отложил — и отзыв на каждую книгу.
//
// Главное правило: книгу можно закрыть на любой странице. Сноски, указатели,
// благодарности и оглавление в конце читают единицы, поэтому «дочитал» — это
// решение человека, а не совпадение счётчика с объёмом книги.

import {
  ACCENTS, ACCENT_KEYS, bookProgress, bookSpan, bookPace,
  humanDateYear, readingBooks, shelfBooks, uid, nextAccent,
} from "./core.js?v=1.0.0";
import {
  h, plural, sheet, closeSheet, toast, segmented, labeledField, confirmSheet,
  scaleRow, starsRow, stars,
} from "./ui.js?v=1.0.0";
import { haptic } from "./tg.js?v=1.0.0";
import { playSound } from "./sound.js?v=1.0.0";

function bookStyle(book) {
  const a = ACCENTS[book?.accent] ?? ACCENTS.amber;
  return { "--lvl-1": a.c1, "--lvl-2": a.c2 };
}

function initial(book) {
  return (book.title || "?").trim().slice(0, 1).toUpperCase();
}

const AGAIN_LABEL = { yes: "Да, перечитаю", maybe: "Может быть", no: "Нет" };

/* ------------------------------------------------------------ карточка книги */

/**
 * Одна книга строкой: корешок, название, автор и либо прогресс (если читаю),
 * либо вердикт (если книга уже на полке).
 */
export function bookCard(app, book, { onClick, active = false } = {}) {
  const { page, total, pct, left } = bookProgress(app.state, book);
  const reading = book.status === "reading";

  const meta = [];
  if (reading) {
    meta.push(total ? `стр. ${page} из ${total}` : `прочитано ${page} стр.`);
    if (total) meta.push(`осталось ${left}`);
  } else {
    const span = bookSpan(app.state, book);
    const stopped = book.finishedPage || page;
    meta.push(book.status === "finished" ? "дочитана" : "отложена");
    if (stopped) meta.push(total ? `на стр. ${stopped} из ${total}` : `на стр. ${stopped}`);
    if (book.finishedDay) meta.push(humanDateYear(book.finishedDay));
    if (span.activeDays) meta.push(`${span.activeDays} ${plural(span.activeDays, "день", "дня", "дней")} чтения`);
  }

  // Вердикт — итог закрытой книги. У книги, которую вернули в чтение, отзыв
  // сохраняется, но на карточке ему не место: он ещё не про эту попытку.
  const review = reading ? null : book.review;
  const verdict = review
    ? h("div.book-verdict", {},
        h("span.book-stars", { text: stars(review.rating) }),
        h("span", { text: "  " }),
        h("span.arrowed", {},
          h("span", { text: "интерес" }),
          h("b", { text: String(review.startInterest ?? "—") }),
          h("span", { text: "→" }),
          h("b", { text: String(review.endInterest ?? "—") }),
        ),
      )
    : null;

  return h(`button.btn.book${active ? ".is-active" : ""}`, {
    type: "button",
    style: bookStyle(book),
    on: {
      click: () => {
        haptic("light");
        playSound("tap");
        onClick?.();
      },
    },
  },
    h("div.book-cover", { text: initial(book) }),
    h("div.book-body", {},
      h("div.book-title", { text: book.title }),
      book.author ? h("div.book-author", { text: book.author }) : null,
      h("div.book-meta", { text: meta.join(" · ") }),
      reading && total
        ? h("div.book-bar", {}, h("span", { style: { width: `${Math.round(pct * 100)}%` } }))
        : null,
      verdict,
    ),
  );
}

/* ==================================================================== ПОЛКА */

export function viewBooks(app) {
  const reading = readingBooks(app.state);
  const shelf = shelfBooks(app.state);
  const finished = shelf.filter((b) => b.status === "finished");
  const dropped = shelf.filter((b) => b.status === "dropped");

  app.setAccent(app.book()?.accent ?? "amber");

  const addBtn = h("button.btn.btn-ghost", {
    type: "button",
    text: "+  Добавить книгу",
    on: { click: () => { haptic("medium"); playSound("tap"); bookSheet(app, null); } },
  });

  const section = (title, list) =>
    list.length === 0 ? null : h("div", {},
      h("div.shelf-title", { text: title, style: { "margin-bottom": "12px" } }),
      h("div.book-list", {},
        list.map((book) => bookCard(app, book, {
          active: book.id === app.state.activeBookId,
          onClick: () => bookSheet(app, book),
        })),
      ),
    );

  const empty = reading.length === 0 && shelf.length === 0
    ? h("div.empty", {
        text: "Полка пустая. Добавь книгу, которую читаешь сейчас, — и трекер начнёт считать.",
      })
    : null;

  return h("div.screen", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: `${app.state.books.length} ${plural(app.state.books.length, "книга", "книги", "книг")}` }),
        h("h1.head-title", { text: "Полка" }),
      ),
    ),
    empty,
    section("Читаю сейчас", reading),
    addBtn,
    section("Дочитано", finished),
    section("Отложено", dropped),
  );
}

/* ------------------------------------------------------- карточка / редактор */

/**
 * Лист книги. Для новой — форма. Для существующей — форма плюс всё, что с
 * книгой можно сделать: сделать активной, дочитать, отложить, вернуть, удалить.
 */
export function bookSheet(app, book) {
  const isNew = !book;
  const draft = isNew
    ? { id: uid("b"), title: "", author: "", pages: 0, startFrom: 0, accent: nextAccent(app.state) }
    : { ...book };

  const titleInput = h("input.input", {
    type: "text", value: draft.title, placeholder: "Например, Мастер и Маргарита",
  });
  const authorInput = h("input.input", {
    type: "text", value: draft.author ?? "", placeholder: "Автор (необязательно)",
  });
  const pagesInput = h("input.input.is-num", {
    type: "number", inputmode: "numeric", min: "0", value: String(draft.pages || ""),
    placeholder: "0",
  });
  const startInput = h("input.input.is-num", {
    type: "number", inputmode: "numeric", min: "0", value: String(draft.startFrom || 0),
  });

  const accentRow = h("div.swatches", {},
    ACCENT_KEYS.map((key) => {
      const a = ACCENTS[key];
      const btn = h(`button.btn.swatch${key === draft.accent ? ".is-on" : ""}`, {
        type: "button",
        "aria-label": key,
        style: { background: `linear-gradient(160deg, ${a.c1}, ${a.c2})` },
        on: {
          click: () => {
            draft.accent = key;
            haptic("select");
            accentRow.querySelectorAll(".swatch").forEach((n) => n.classList.remove("is-on"));
            btn.classList.add("is-on");
          },
        },
      });
      return btn;
    }),
  );

  const progress = isNew ? null : bookProgress(app.state, book);
  const reading = !isNew && book.status === "reading";

  const actionButtons = h("div", { style: { display: "flex", "flex-direction": "column", gap: "10px" } },
    !isNew && reading && app.state.activeBookId !== book.id
      ? h("button.btn.btn-ghost", {
          type: "button",
          text: "Читать эту книгу",
          on: {
            click: () => {
              app.setActiveBook(book.id);
              closeSheet();
              haptic("success");
              app.render();
              toast({ icon: "📖", title: "Теперь страницы пишутся сюда", subtitle: book.title });
            },
          },
        })
      : null,
    !isNew && reading
      ? h("button.btn.btn-ghost.is-accent", {
          type: "button",
          text: "Дочитал книгу",
          on: { click: () => { closeSheet(); finishFlow(app, book); } },
        })
      : null,
    !isNew && !reading
      ? h("button.btn.btn-ghost", {
          type: "button",
          text: book.review ? "Посмотреть и поправить отзыв" : "Написать отзыв",
          on: {
            click: () => {
              closeSheet();
              reviewSheet(app, book, { mode: "edit", status: book.status, page: book.finishedPage });
            },
          },
        })
      : null,
    !isNew && !reading
      ? h("button.btn.btn-quiet", {
          type: "button",
          text: "Вернуть в чтение",
          on: { click: () => { closeSheet(); app.reopenBook(book); } },
        })
      : null,
    !isNew
      ? h("button.btn.btn-quiet.btn-danger", {
          type: "button",
          text: "Удалить книгу",
          on: {
            click: () => {
              closeSheet();
              confirmSheet({
                title: `Удалить «${book.title}»?`,
                subtitle: "Записи о чтении этой книги тоже исчезнут — вместе со страницами в общей статистике.",
                confirmLabel: "Удалить",
                danger: true,
                onConfirm: () => app.removeBook(book),
              });
            },
          },
        })
      : null,
  );

  sheet({
    title: isNew ? "Новая книга" : book.title,
    // У закрытой книги важна страница, на которой её закрыли, а не последняя
    // запись: дочитывают обычно раньше формального конца.
    subtitle: isNew
      ? "Объём нужен только для шкалы прогресса — если не знаешь, оставь ноль."
      : reading
        ? progress.total
          ? `Стр. ${progress.page} из ${progress.total} · прочитано ${progress.read}`
          : `Прочитано ${progress.read} стр.`
        : [
            book.status === "finished" ? "Дочитана" : "Отложена",
            progress.total
              ? `на стр. ${book.finishedPage || progress.page} из ${progress.total}`
              : `на стр. ${book.finishedPage || progress.page}`,
            book.finishedDay ? humanDateYear(book.finishedDay) : null,
          ].filter(Boolean).join(" · "),
    body: h("div.sheet-fields", {},
      // У закрытой книги отзыв показывается прямо здесь: полка нужна не для
      // учёта, а чтобы через год вспомнить, что это была за книга.
      !isNew && !reading && book.review
        ? h("div", {},
            h("div.sheet-field-label", { text: "Что ты о ней сказал" }),
            reviewCard(book),
          )
        : null,
      labeledField("Название", titleInput),
      labeledField("Автор", authorInput),
      labeledField("Сколько страниц в книге", h("div.field", {}, pagesInput,
        h("div.row-sub", { text: "0 — объём неизвестен, шкалы не будет" }))),
      isNew
        ? labeledField("С какой страницы начинаешь", h("div.field", {}, startInput,
            h("div.row-sub", { text: "если книга уже начата" })))
        : null,
      labeledField("Цвет книги", accentRow),
      actionButtons,
    ),
    actions: [
      {
        label: "Сохранить",
        kind: "primary",
        onClick: () => {
          const title = titleInput.value.trim();
          if (!title) {
            haptic("error");
            titleInput.focus();
            return true; // лист не закрываем
          }
          const pages = Math.max(0, Number(pagesInput.value) || 0);
          if (isNew) {
            app.addBook({
              title,
              author: authorInput.value.trim(),
              pages,
              startFrom: Math.max(0, Number(startInput.value) || 0),
              accent: draft.accent,
            });
            toast({ icon: "📚", title: "Книга на полке", subtitle: "Теперь записывай страницы" });
          } else {
            book.title = title;
            book.author = authorInput.value.trim();
            book.pages = pages;
            book.accent = draft.accent;
          }
          app.save();
          haptic("success");
          app.render();
          return false;
        },
      },
      { label: "Отмена" },
    ],
  });
}

/* --------------------------------------------------------- завершение книги */

/**
 * Первый шаг закрытия книги: на какой странице закончил и чем это было —
 * «дочитал» или «отложил». Отдельный шаг нужен, потому что решение о конце
 * книги принимает человек, и приложение не должно угадывать его за него.
 */
export function finishFlow(app, book) {
  const { page, total } = bookProgress(app.state, book);
  const pageInput = h("input.input.is-num", {
    type: "number", inputmode: "numeric", min: "0", value: String(page),
  });

  sheet({
    title: "Закрыть книгу",
    subtitle: total
      ? `Остановился на стр. ${page} из ${total}. Дочитать «до последней страницы» не обязательно: сноски, указатель и благодарности можно не считать.`
      : `Прочитано ${page} стр. Закрывай, когда книга закончилась для тебя.`,
    body: h("div.sheet-fields", {},
      labeledField("Последняя прочитанная страница",
        h("div.field", {}, pageInput, total ? h("div.row-sub", { text: `из ${total}` }) : null)),
    ),
    actions: [
      {
        label: "Дочитал",
        kind: "primary",
        onClick: () => {
          const value = Math.max(0, Number(pageInput.value) || 0);
          closeSheet();
          reviewSheet(app, book, { mode: "close", status: "finished", page: value });
          return true;
        },
      },
      {
        label: "Отложил, не дочитав",
        onClick: () => {
          const value = Math.max(0, Number(pageInput.value) || 0);
          closeSheet();
          reviewSheet(app, book, { mode: "close", status: "dropped", page: value });
          return true;
        },
      },
      { label: "Ещё читаю" },
    ],
  });
}

/* ------------------------------------------------------------------ отзыв */

/**
 * Отзыв о книге. Два обязательных вопроса — интерес в начале и в конце: именно
 * их разница показывает, разогналась книга или сдулась. Остальное можно
 * пропустить: отзыв, который заставляют писать, пишут один раз.
 *
 * @param {"close"|"edit"} mode «close» — книга закрывается прямо сейчас,
 *        «edit» — правим отзыв уже стоящей на полке книги.
 */
export function reviewSheet(app, book, { mode = "edit", status = "finished", page = 0 } = {}) {
  const dropped = status === "dropped";
  const prev = book.review ?? {};
  const draft = {
    startInterest: prev.startInterest ?? 0,
    endInterest: prev.endInterest ?? 0,
    rating: prev.rating ?? 0,
    words: prev.words ?? "",
    takeaway: prev.takeaway ?? "",
    again: prev.again ?? "maybe",
    recommend: prev.recommend ?? "",
  };

  const wordsInput = h("textarea.input", {
    placeholder: dropped ? "Почему отложил?" : "Пара слов от себя",
  }, draft.words);
  const takeawayInput = h("input.input", {
    type: "text", value: draft.takeaway, placeholder: "Одна мысль, цитата, вывод",
  });
  const recommendInput = h("input.input", {
    type: "text", value: draft.recommend, placeholder: "Кому — или «никому»",
  });

  const span = bookSpan(app.state, book);
  const paceValue = bookPace(app.state, book);
  const facts = span.activeDays
    ? `Читал ${span.activeDays} ${plural(span.activeDays, "день", "дня", "дней")} · темп ${paceValue} стр. в день`
    : "";

  sheet({
    title: dropped ? "Почему не пошла" : "Как тебе книга?",
    subtitle: [book.title, facts].filter(Boolean).join(" · "),
    body: h("div.sheet-fields", {},
      labeledField(
        dropped ? "Насколько было интересно в начале" : "Насколько было интересно в начале",
        scaleRow(draft.startInterest, (v) => { draft.startInterest = v; }),
      ),
      labeledField(
        dropped ? "Насколько интересно было там, где бросил" : "Насколько было интересно в конце",
        scaleRow(draft.endInterest, (v) => { draft.endInterest = v; }),
      ),
      labeledField("Общая оценка", starsRow(draft.rating, (v) => { draft.rating = v; })),
      labeledField(dropped ? "Что оттолкнуло" : "Пара слов от себя", wordsInput),
      labeledField(dropped ? "Что всё-таки зацепило" : "Мысль, которую забираешь с собой", takeawayInput),
      labeledField(
        dropped ? "Вернёшься к ней когда-нибудь?" : "Перечитаешь когда-нибудь?",
        segmented(
          [{ value: "yes", label: "Да" }, { value: "maybe", label: "Может" }, { value: "no", label: "Нет" }],
          draft.again,
          (v) => { draft.again = v; },
        ),
      ),
      labeledField("Кому посоветуешь", recommendInput),
    ),
    actions: [
      {
        label: mode === "close" ? "Сохранить и закрыть книгу" : "Сохранить отзыв",
        kind: "primary",
        onClick: () => {
          const review = {
            ...draft,
            words: wordsInput.value.trim(),
            takeaway: takeawayInput.value.trim(),
            recommend: recommendInput.value.trim(),
            writtenAt: new Date().toISOString(),
          };
          if (mode === "close") {
            app.closeBook(book, { status, page, review });
          } else {
            book.review = review;
            book.finishedPage = page || book.finishedPage;
            app.save();
            haptic("success");
            app.render();
            toast({ icon: "✍️", title: "Отзыв сохранён" });
          }
          return false;
        },
      },
      mode === "close"
        ? {
            label: "Закрыть без отзыва",
            onClick: () => { app.closeBook(book, { status, page, review: book.review ?? null }); },
          }
        : null,
      { label: mode === "close" ? "Ещё читаю" : "Отмена" },
    ].filter(Boolean),
  });
}

/* ------------------------------------------------------- отзыв как карточка */

// Читаемый вид отзыва — для карточки дня и для полки.
export function reviewCard(book) {
  const r = book.review;
  if (!r) return null;
  const rows = [
    ["Интерес в начале", r.startInterest ? `${r.startInterest} из 10` : null],
    ["Интерес в конце", r.endInterest ? `${r.endInterest} из 10` : null],
    ["Оценка", r.rating ? stars(r.rating) : null],
    ["Своими словами", r.words],
    ["Забираю с собой", r.takeaway],
    ["Перечитаю", AGAIN_LABEL[r.again]],
    ["Посоветую", r.recommend],
  ].filter(([, value]) => Boolean(value));

  return h("div", {},
    rows.map(([q, a]) => h("div.qa", {},
      h("div.qa-q", { text: q }),
      h("div.qa-a", { text: a }),
    )),
  );
}

// Экраны данных: дневник (календарь, статистика, история) и настройки.

import {
  ACCENTS, dayKey, dayPages, dailyGoal, humanDate, humanDateYear,
  WEEKDAYS_SHORT, MONTHS_NOM, stats, sessionsByDay, defaultState, findBook,
  setTimeZone, detectedTimeZone, effectiveTimeZone, clockIn, DEFAULT_GOAL,
} from "./core.js?v=1.0.0";
import {
  h, plural, sheet, closeSheet, toast, switchRow, navRow, segmented, confirmSheet,
} from "./ui.js?v=1.0.0";
import { haptic } from "./tg.js?v=1.0.0";
import { playSound, primeAudio, audioMixMode } from "./sound.js?v=1.0.0";
import { WHATS_NEW } from "./whats-new.js?v=1.0.0";

function bookStyle(book) {
  const a = ACCENTS[book?.accent] ?? ACCENTS.amber;
  return { "--lvl-1": a.c1, "--lvl-2": a.c2 };
}

/* ==================================================================== ДНЕВНИК */

export function viewDiary(app) {
  const st = stats(app.state);
  const byDay = sessionsByDay(app.state);
  const goal = app.goal();

  app.setAccent(app.book()?.accent ?? "amber");

  const statGrid = h("div.stat-grid", {},
    statCard(st.streak.current, `${plural(st.streak.current, "день", "дня", "дней")} подряд`),
    statCard(st.streak.best, "лучшая серия"),
    statCard(st.totalPages, "страниц всего"),
    statCard(st.booksFinished, plural(st.booksFinished, "книга дочитана", "книги дочитано", "книг дочитано")),
    statCard(st.bestDay, "лучший день"),
    statCard(st.pace, "стр. в день"),
  );

  /* ---- звание: растёт от дочитанных книг */
  const rank = st.rank;
  const rankCard = h("div.card", {},
    h("div.rank-row", {},
      h("div.rank-icon", { text: rank.current.icon }),
      h("div", { style: { flex: "1" } },
        h("div.rank-name", { text: rank.current.name }),
        h("div.rank-next", {
          text: rank.next
            ? `до «${rank.next.name}» — ${rank.next.at - st.booksFinished} ${plural(rank.next.at - st.booksFinished, "книга", "книги", "книг")}`
            : "высшее звание достигнуто",
        }),
      ),
    ),
    h("div.progress-track", {},
      h("div.progress-value", { style: { width: `${Math.round(rank.progress * 100)}%` } }),
    ),
  );

  /* ---- календарь месяца */
  const cursor = app.diaryMonth ?? new Date();
  const calendar = monthCalendar(
    app,
    cursor,
    byDay,
    goal,
    (delta) => {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + delta, 1);
      app.diaryMonth = next;
      haptic("select");
      app.render();
    },
    (key) => { haptic("light"); daySheet(app, key); },
  );

  /* ---- журнал */
  const log = [...app.state.sessions]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 60);

  const logCard = h("div.card", {},
    h("div.card-title", { text: "История" }),
    log.length === 0
      ? h("div.empty", { text: "Пока пусто. Запиши первые страницы — они появятся здесь." })
      : h("div.log-list", {},
          log.map((s) => {
            const book = findBook(app.state, s.bookId);
            const dayFull = dayPages(app.state, s.dayKey) >= goal;
            return h("div.log-row.is-tappable", {
              style: bookStyle(book),
              on: { click: () => { haptic("light"); sessionSheet(app, s); } },
            },
              h("div.log-badge", { text: String(s.pages) }),
              h("div.log-main", {},
                h("div.log-title", { text: book?.title ?? "Удалённая книга" }),
                h("div.log-sub", {
                  text: `${humanDate(s.dayKey)} · стр. ${s.fromPage} → ${s.toPage}`,
                }),
              ),
              dayFull ? h("div.log-tag.is-record", { text: "норма" }) : null,
            );
          }),
        ),
  );

  return h("div.screen", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: `${st.days} ${plural(st.days, "день", "дня", "дней")} с чтением` }),
        h("h1.head-title", { text: "Дневник" }),
      ),
    ),
    statGrid,
    rankCard,
    calendar,
    logCard,
  );
}

function statCard(value, label) {
  return h("div.stat", {},
    h("div.stat-value", { text: String(value) }),
    h("div.stat-label", { text: label }),
  );
}

// Календарь различает два состояния: норма взята и «читал, но меньше нормы».
// Второе не менее важно — именно такие дни держат серию.
function monthCalendar(app, cursor, byDay, goal, onNav, onPickDay) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const todayK = dayKey();

  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(h("div.cal-cell.is-empty"));
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = dayKey(new Date(year, month, d));
    const pages = byDay.has(key) ? byDay.get(key).reduce((a, s) => a + s.pages, 0) : 0;
    const full = pages >= goal;
    const part = pages > 0 && !full;
    const future = key > todayK;
    cells.push(
      h(`div.cal-cell${full ? ".is-done" : ""}${part ? ".is-part" : ""}${key === todayK ? ".is-today" : ""}${future ? ".is-future" : ""}`, {
        text: String(d),
        title: pages ? `${pages} стр.` : "",
        on: pages > 0 ? { click: () => onPickDay(key) } : undefined,
      }),
    );
  }

  return h("div.card", {},
    h("div.head", { style: { "align-items": "center", "margin-bottom": "14px" } },
      h("div.rank-name", { text: `${MONTHS_NOM[month]} ${year}` }),
      h("div", { style: { display: "flex", gap: "8px" } },
        h("button.btn.btn-icon", { type: "button", text: "‹", "aria-label": "Прошлый месяц", on: { click: () => onNav(-1) } }),
        h("button.btn.btn-icon", { type: "button", text: "›", "aria-label": "Следующий месяц", on: { click: () => onNav(1) } }),
      ),
    ),
    h("div.calendar", { style: { "margin-bottom": "8px" } },
      WEEKDAYS_SHORT.map((w) => h("div.cal-head", { text: w })),
    ),
    h("div.calendar", {}, cells),
  );
}

/* ------------------------------------------------- карточка дня и удаление */

function sessionsOfDay(app, key) {
  return app.state.sessions
    .filter((s) => s.dayKey === key)
    .sort((a, b) => (a.at < b.at ? -1 : 1));
}

function timeOf(session) {
  const d = new Date(session.at);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Карточка дня: что прочитано и кнопка всё это стереть. Открывается тапом по
// дню календаря и по счётчику «Сегодня» на главной.
export function daySheet(app, key) {
  const sessions = sessionsOfDay(app, key);
  if (sessions.length === 0) return;
  const total = sessions.reduce((a, s) => a + s.pages, 0);
  const goal = app.goal();

  sheet({
    title: humanDate(key),
    subtitle: `${total} ${plural(total, "страница", "страницы", "страниц")} · норма ${goal} ${total >= goal ? "взята" : "не взята"}`,
    body: h("div", { style: { "margin-bottom": "20px" } },
      sessions.map((s) => {
        const book = findBook(app.state, s.bookId);
        return h("div.day-line", {},
          h("div", {},
            h("div", { text: book?.title ?? "Удалённая книга" }),
            h("div.day-line-sub", { text: `${timeOf(s)} · стр. ${s.fromPage} → ${s.toPage}` }),
          ),
          h("div.day-line-num", { text: String(s.pages) }),
        );
      }),
    ),
    actions: [
      {
        label: "Очистить день",
        kind: "primary",
        danger: true,
        onClick: () => app.removeSessions(sessions.map((s) => s.id), {
          title: `${humanDate(key)} очищен`,
          subtitle: `Убрано ${total} ${plural(total, "страница", "страницы", "страниц")}`,
        }),
      },
      { label: "Закрыть" },
    ],
  });
}

// Одна запись: удалить только её или сразу весь день.
function sessionSheet(app, session) {
  const daySessions = sessionsOfDay(app, session.dayKey);
  const dayTotal = daySessions.reduce((a, s) => a + s.pages, 0);
  const book = findBook(app.state, session.bookId);

  sheet({
    title: `${session.pages} ${plural(session.pages, "страница", "страницы", "страниц")}`,
    subtitle: `${book?.title ?? "Удалённая книга"} · ${humanDateYear(session.dayKey)}, ${timeOf(session)} · стр. ${session.fromPage} → ${session.toPage}`,
    actions: [
      {
        label: "Удалить эту запись",
        kind: "primary",
        danger: true,
        onClick: () => app.removeSessions([session.id], {
          title: "Запись удалена",
          subtitle: `${session.pages} ${plural(session.pages, "страница", "страницы", "страниц")}`,
        }),
      },
      daySessions.length > 1
        ? {
            label: `Очистить весь день (${dayTotal})`,
            danger: true,
            onClick: () => app.removeSessions(daySessions.map((s) => s.id), {
              title: `${humanDate(session.dayKey)} очищен`,
              subtitle: `Убрано ${dayTotal} ${plural(dayTotal, "страница", "страницы", "страниц")}`,
            }),
          }
        : null,
      { label: "Отмена" },
    ].filter(Boolean),
  });
}

/* =================================================================== НАСТРОЙКИ */

export function viewSettings(app) {
  const s = app.state.settings;
  app.setAccent(app.book()?.accent ?? "amber");

  /* ---- чтение */
  const readCard = h("div.card", {},
    h("div.card-title", { text: "Чтение" }),
    h("div.rows", {},
      navRow({
        title: "Норма в день",
        subtitle: "фиксированная — трекер её не повышает",
        value: `${dailyGoal(app.state)} стр.`,
        onClick: () => numberSheet(app, {
          title: "Сколько страниц в день",
          subtitle: "Цель намеренно не растёт: смысл трекера — держать привычку, а не разгонять норму. Для серии всё равно хватает одной страницы.",
          value: dailyGoal(app.state),
          min: 1,
          max: 500,
          onSave: (v) => { s.dailyGoal = v; app.save(); app.render(); },
        }),
      }),
      navRow({
        title: "Часовой пояс",
        subtitle: s.timeZone
          ? `вручную · ${clockIn(s.timeZone)}`
          : `с устройства · ${clockIn(detectedTimeZone())}`,
        value: zoneLabel(effectiveTimeZone()),
        onClick: () => timeZoneSheet(app),
      }),
    ),
  );

  /* ---- отклик */
  const feelCard = h("div.card", {},
    h("div.card-title", { text: "Отклик" }),
    h("div.rows", {},
      switchRow({
        title: "Вибро-отклик",
        subtitle: "родная тактильная отдача Telegram",
        value: s.haptics,
        onChange: (v) => { s.haptics = v; app.applyPreferences(); app.save(); },
      }),
      switchRow({
        title: "Звуки",
        subtitle: soundHint(),
        value: s.sound === true,
        onChange: (v) => {
          s.sound = v;
          app.applyPreferences();
          app.save();
          if (v) { primeAudio(); playSound("goal"); }
          app.render();
        },
      }),
      s.sound === true ? volumeRow(app) : null,
      s.sound === true
        ? navRow({
            title: "Проверить звук",
            subtitle: "включи свою музыку и послушай, не перебивает ли",
            onClick: () => soundCheck(),
          })
        : null,
      switchRow({
        title: "Конфетти",
        subtitle: "на взятой норме и дочитанной книге",
        value: s.confetti,
        onChange: (v) => { s.confetti = v; app.applyPreferences(); app.save(); },
      }),
    ),
  );

  /* ---- данные */
  const dataCard = h("div.card", {},
    h("div.card-title", { text: "Данные" }),
    h("div.rows", {},
      navRow({
        title: "Экспорт",
        subtitle: "полка, отзывы и вся история одним текстом",
        onClick: () => exportSheet(app),
      }),
      navRow({
        title: "Импорт",
        subtitle: "вставить ранее сохранённый экспорт",
        onClick: () => importSheet(app),
      }),
      navRow({
        title: "Очистить сегодняшний день",
        subtitle: "убрать записи за сегодня — например, тестовые",
        onClick: () => {
          const key = dayKey();
          if (dayPages(app.state, key) === 0) {
            toast({ icon: "🗓", title: "Сегодня ещё пусто" });
            return;
          }
          daySheet(app, key);
        },
      }),
      navRow({
        title: "Сбросить всё",
        subtitle: "полка, отзывы, история и настройки вернутся к исходным",
        danger: true,
        onClick: () => confirmSheet({
          title: "Сбросить приложение?",
          subtitle: "Книги, отзывы и вся история будут стёрты. Отменить это нельзя — сначала сделай экспорт.",
          confirmLabel: "Стереть всё",
          danger: true,
          onConfirm: () => {
            app.replaceState(defaultState());
            haptic("warning");
            toast({ icon: "🧹", title: "Готово", subtitle: "Приложение как в первый день" });
          },
        }),
      }),
    ),
  );

  /* ---- о приложении */
  const aboutCard = h("div.card", {},
    h("div.card-title", { text: "О приложении" }),
    h("div.rows", {},
      navRow({
        title: "Что нового",
        value: WHATS_NEW[0].version,
        onClick: () => whatsNewSheet(app),
      }),
      h("div.row", {},
        h("div.row-main", {},
          h("div.row-title", { text: "Читопус" }),
          h("div.row-sub", { text: `трекер чтения: ${DEFAULT_GOAL} страниц в день и серия, которую жалко ронять` }),
        ),
      ),
    ),
  );

  const sign = h("div.footer-sign", { html:
    'Powered by <a class="link" href="https://t.me/Denrech" target="_blank" rel="noopener noreferrer">@Denrech</a>' });

  return h("div.screen", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: "настройки" }),
        h("h1.head-title", { text: "Под себя" }),
      ),
    ),
    readCard, feelCard, dataCard, aboutCard, sign,
  );
}

/* ------------------------------------------------------------------- звук */

// Честно объясняем, что будет с чужой музыкой на этом устройстве.
function soundHint() {
  switch (audioMixMode()) {
    case "ambient":
      return "подмешиваются к музыке, не прерывают её";
    case "mixes":
      return "играют поверх музыки, не прерывая её";
    default:
      return "на этом iOS нет режима подмешивания — музыка может прерваться";
  }
}

function volumeRow(app) {
  const s = app.state.settings;
  return h("div.row.is-stacked", {},
    h("div.row-main", { style: { width: "100%" } },
      h("div.row-title", { text: "Громкость" }),
      h("div", { style: { "margin-top": "10px" } },
        segmented(
          [
            { value: "low", label: "Тихо" },
            { value: "mid", label: "Средне" },
            { value: "high", label: "Громко" },
          ],
          s.soundVolume ?? "mid",
          (v) => {
            s.soundVolume = v;
            app.applyPreferences();
            app.save();
            primeAudio();
            playSound("page");
          },
        ),
      ),
    ),
  );
}

// Проигрывает основные звуки по очереди — можно проверить прямо под музыку.
function soundCheck() {
  primeAudio();
  const script = [
    [0, "page"],
    [520, "page"],
    [1100, "goal"],
    [2000, "book"],
  ];
  script.forEach(([delay, name]) => setTimeout(() => playSound(name), delay));
  toast({
    icon: "🔊",
    title: "Играю: страницы, норма дня, дочитанная книга",
    subtitle: audioMixMode() === "risky"
      ? "Если музыка встала — выключи звуки"
      : "Музыка должна продолжать играть",
    duration: 4200,
  });
}

/* ------------------------------------------------------------ часовой пояс */

// Пояс определяет, где проходит граница суток: от неё зависят «сегодня» и
// серия. По умолчанию берётся с устройства — список нужен для поездок.
const TIME_ZONES = [
  { id: "Asia/Nicosia", name: "Кипр" },
  { id: "Europe/Kyiv", name: "Киев" },
  { id: "Europe/Moscow", name: "Москва" },
  { id: "Asia/Almaty", name: "Алматы" },
  { id: "Asia/Tbilisi", name: "Тбилиси" },
  { id: "Europe/Istanbul", name: "Стамбул" },
  { id: "Asia/Dubai", name: "Дубай" },
  { id: "Asia/Bangkok", name: "Бангкок" },
  { id: "Europe/Berlin", name: "Берлин" },
  { id: "Europe/London", name: "Лондон" },
  { id: "America/New_York", name: "Нью-Йорк" },
  { id: "UTC", name: "UTC" },
];

function zoneLabel(id) {
  return TIME_ZONES.find((z) => z.id === id)?.name ?? id;
}

function timeZoneSheet(app) {
  const s = app.state.settings;
  const detected = detectedTimeZone();

  const options = [
    { id: null, name: "Как на устройстве", hint: `${zoneLabel(detected)} · ${detected}` },
    ...(TIME_ZONES.some((z) => z.id === detected) ? [] : [{ id: detected, name: detected }]),
    ...TIME_ZONES,
  ];

  const pick = (id) => {
    s.timeZone = id;
    setTimeZone(id);
    app.save();
    haptic("success");
    closeSheet();
    app.render();
    toast({
      icon: "🕒",
      title: id ? `Часовой пояс: ${zoneLabel(id)}` : "Часовой пояс с устройства",
      subtitle: `Сейчас ${clockIn(id ?? detected)} — от этого зависит, что считается сегодняшним днём`,
      duration: 4200,
    });
  };

  sheet({
    title: "Часовой пояс",
    subtitle: "Определяет границу суток: «сегодня» и серию. Если читаешь заполночь, это важнее, чем кажется.",
    body: h("div.rows", { style: { "margin-bottom": "20px" } },
      options.map((opt) =>
        h("div.row", {
          style: { cursor: "pointer" },
          on: { click: () => { haptic("select"); pick(opt.id); } },
        },
          h("div.row-main", {},
            h("div.row-title", { text: opt.name }),
            opt.hint ? h("div.row-sub", { text: opt.hint }) : null,
          ),
          h("div.row-value", { text: clockIn(opt.id ?? detected) }),
          h("div.level-chevron", {
            text: (s.timeZone ?? null) === opt.id ? "✓" : "",
            style: { color: "var(--accent-1)" },
          }),
        ),
      ),
    ),
    actions: [{ label: "Закрыть" }],
  });
}

/* --------------------------------------------------------- листы настроек */

function numberSheet(app, { title, subtitle, value, min = 0, max = 999, onSave }) {
  const input = h("input.input.is-num", {
    type: "number", inputmode: "numeric", value: String(value), min: String(min), max: String(max),
  });
  sheet({
    title,
    subtitle,
    body: h("div.sheet-fields", {}, h("div.field", { style: { "justify-content": "center" } }, input)),
    actions: [
      {
        label: "Сохранить",
        kind: "primary",
        onClick: () => {
          const v = Math.max(min, Math.min(max, Number(input.value) || min));
          onSave(v);
          haptic("success");
          return false;
        },
      },
      { label: "Отмена" },
    ],
  });
}

function exportSheet(app) {
  const json = JSON.stringify(app.state, null, 2);
  const area = h("textarea.input", { readonly: true }, json);
  sheet({
    title: "Экспорт дневника",
    subtitle: "Скопируй текст и сохрани где угодно — из него полка и отзывы восстанавливаются целиком.",
    body: h("div.sheet-fields", {}, area),
    actions: [
      {
        label: "Скопировать",
        kind: "primary",
        onClick: () => {
          try {
            navigator.clipboard?.writeText(json);
          } catch {
            area.select();
          }
          haptic("success");
          toast({ icon: "📋", title: "Скопировано" });
          return false;
        },
      },
      { label: "Закрыть" },
    ],
  });
}

function importSheet(app) {
  const area = h("textarea.input", { placeholder: "Вставь сюда экспортированный текст" });
  sheet({
    title: "Импорт дневника",
    subtitle: "Текущие данные будут заменены целиком.",
    body: h("div.sheet-fields", {}, area),
    actions: [
      {
        label: "Заменить данные",
        kind: "primary",
        danger: true,
        onClick: () => {
          try {
            const parsed = JSON.parse(area.value);
            if (!parsed || !Array.isArray(parsed.books) || !Array.isArray(parsed.sessions)) {
              throw new Error("bad");
            }
            app.replaceState(parsed);
            haptic("success");
            toast({ icon: "📥", title: "Дневник восстановлен" });
            return false;
          } catch {
            haptic("error");
            toast({ icon: "⚠️", title: "Не получилось", subtitle: "Текст не похож на экспорт Читопуса" });
            return true;
          }
        },
      },
      { label: "Отмена" },
    ],
  });
}

function whatsNewSheet(app) {
  app.state.settings.seenVersion = WHATS_NEW[0].version;
  app.save();

  sheet({
    title: "Что нового",
    body: h("div.sheet-fields", {},
      WHATS_NEW.map((entry) =>
        h("div", {},
          h("div.row-title", { text: `${entry.version} · ${entry.date}` }),
          h("ul", { style: { margin: "8px 0 0", padding: "0 0 0 18px", color: "var(--text-2)", "font-size": "14.5px", "line-height": "1.6" } },
            entry.items.map((item) => h("li", { text: item })),
          ),
        ),
      ),
    ),
    actions: [{ label: "Понятно", kind: "primary" }],
  });
}

// Экраны данных: дневник (история, календарь, ранги) и настройки.

import {
  ACCENTS, ACCENT_KEYS, dayKey, humanDate, keyToDate, weekdayIndex,
  WEEKDAYS_SHORT, stats, sessionsByDay, suggestPlan, uid, defaultState, goalReached,
  levelCompletions, suggestSetCount, splitSets,
  setTimeZone, detectedTimeZone, effectiveTimeZone, clockIn,
} from "./core.js?v=1.5.0";
import {
  h, plural, sheet, closeSheet, toast, switchRow, navRow, segmented, labeledField,
  confirmSheet,
} from "./ui.js?v=1.5.0";
import { haptic } from "./tg.js?v=1.5.0";
import { playSound, primeAudio, audioMixMode, isAppleWebKit } from "./sound.js?v=1.5.0";
import { WHATS_NEW } from "./whats-new.js?v=1.5.0";

const MONTHS_NOM = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function levelStyle(level) {
  const a = ACCENTS[level?.accent] ?? ACCENTS.crimson;
  return { "--lvl-1": a.c1, "--lvl-2": a.c2 };
}

/* ==================================================================== ДНЕВНИК */

export function viewDiary(app) {
  const ex = app.exercise();
  const st = stats(app.state, ex.id);
  const byDay = sessionsByDay(app.state, ex.id);

  app.setAccent(app.level().accent);

  const statGrid = h("div.stat-grid", {},
    statCard(st.streak.current, `${plural(st.streak.current, "день", "дня", "дней")} подряд`),
    statCard(st.sessions, plural(st.sessions, "тренировка", "тренировки", "тренировок")),
    // Подпись-категория, а не согласованная форма: «71 всего повтор» звучало криво.
    statCard(st.totalReps, "всего повторов"),
    statCard(st.best, "личный рекорд"),
  );

  /* ---- ранг */
  const rank = st.rank;
  const rankCard = h("div.card", {},
    h("div.rank-row", {},
      h("div.rank-icon", { text: rank.current.icon }),
      h("div", { style: { flex: "1" } },
        h("div.rank-name", { text: rank.current.name }),
        h("div.rank-next", {
          text: rank.next
            ? `до «${rank.next.name}» — ${rank.next.at - st.sessions} ${plural(rank.next.at - st.sessions, "тренировка", "тренировки", "тренировок")}`
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
    cursor,
    byDay,
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
    .filter((s) => s.finishedAt && s.exerciseId === ex.id)
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
    .slice(0, 40);

  const logCard = h("div.card", {},
    h("div.card-title", { text: "История" }),
    log.length === 0
      ? h("div.empty", { text: "Пока пусто. Закрой первое задание — оно появится здесь." })
      : h("div.log-list", {},
          log.map((s) => {
            const level = app.level(s.levelId);
            const hit = goalReached(s);
            const over = (s.carry ?? 0) + s.doneTotal - s.target;
            const tail = hit
              ? over > 0 ? ` · сверху ${over}` : " · цель взята"
              : " · цель не взята";
            return h("div.log-row.is-tappable", {
              style: levelStyle(level),
              on: { click: () => { haptic("light"); sessionSheet(app, s); } },
            },
              h("div.log-badge", { text: String(s.doneTotal) }),
              h("div.log-main", {},
                h("div.log-title", {
                  text: `${s.levelName} · ${(s.sets ?? []).join(" · ") || s.doneTotal}`,
                }),
                h("div.log-sub", { text: `${humanDate(s.dayKey)} · цель ${s.target}${tail}` }),
              ),
              s.isRecord ? h("div.log-tag.is-record", { text: "рекорд" }) : null,
            );
          }),
        ),
  );

  return h("div.screen", {},
    h("div.head", {},
      h("div", {},
        h("div.eyebrow", { text: ex.name }),
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

function monthCalendar(cursor, byDay, onNav, onPickDay) {
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
    const done = byDay.has(key);
    const future = key > todayK;
    cells.push(
      h(`div.cal-cell${done ? ".is-done" : ""}${key === todayK ? ".is-today" : ""}${future ? ".is-future" : ""}`, {
        text: String(d),
        title: done ? `${byDay.get(key).reduce((a, s) => a + s.doneTotal, 0)} повторов` : "",
        on: done ? { click: () => onPickDay(key) } : undefined,
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

/* =================================================================== НАСТРОЙКИ */

export function viewSettings(app) {
  const ex = app.exercise();
  const s = app.state.settings;
  app.setAccent(app.level().accent);

  /* ---- упражнения */
  const exercisesCard = h("div.card", {},
    h("div.card-title", { text: "Упражнения" }),
    h("div.rows", {},
      app.state.exercises.map((item) =>
        navRow({
          title: `${item.icon ?? "•"}  ${item.name}`,
          subtitle: item.id === ex.id ? "активное" : `${item.levels.length} ${plural(item.levels.length, "уровень", "уровня", "уровней")}`,
          onClick: () => exerciseSheet(app, item),
        }),
      ),
      navRow({
        title: "Добавить упражнение",
        subtitle: "подтягивания, отжимания, планка…",
        onClick: () => exerciseSheet(app, null),
      }),
    ),
  );

  /* ---- уровни активного упражнения */
  const levelsCard = h("div.card", {},
    h("div.card-title", { text: `Уровни · ${ex.name}` }),
    h("div.rows", {},
      ex.levels.map((level) => {
        const plan = suggestPlan(app.state, ex.id, level);
        const desc = level.mode === "progressive"
          ? `растёт: ${level.base} и +${level.step} за взятую цель`
          : `фиксировано: ${level.total}`;
        return navRow({
          title: level.name,
          subtitle: `${desc} · подсказка ${plan.sets.join("·")}`,
          onClick: () => levelSheet(app, ex, level),
        });
      }),
      navRow({
        title: "Добавить уровень",
        subtitle: "свой режим со своей целью",
        onClick: () => levelSheet(app, ex, null),
      }),
    ),
  );

  /* ---- тренировка */
  const trainCard = h("div.card", {},
    h("div.card-title", { text: "Тренировка" }),
    h("div.rows", {},
      switchRow({
        title: "Таймер отдыха",
        subtitle: "пауза между подходами",
        value: s.restEnabled,
        onChange: (v) => { s.restEnabled = v; app.save(); },
      }),
      navRow({
        title: "Длительность отдыха",
        value: `${s.restSeconds} с`,
        onClick: () => numberSheet(app, {
          title: "Отдых между подходами",
          subtitle: "Сколько секунд стоит таймер по умолчанию.",
          value: s.restSeconds,
          min: 10,
          max: 600,
          onSave: (v) => { s.restSeconds = v; app.save(); app.render(); },
        }),
      }),
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
        title: "Конфетти на финише",
        value: s.confetti,
        onChange: (v) => { s.confetti = v; app.applyPreferences(); app.save(); },
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

  /* ---- данные */
  const dataCard = h("div.card", {},
    h("div.card-title", { text: "Данные" }),
    h("div.rows", {},
      navRow({
        title: "Экспорт",
        subtitle: "весь дневник одним текстом",
        onClick: () => exportSheet(app),
      }),
      navRow({
        title: "Импорт",
        subtitle: "вставить ранее сохранённый экспорт",
        onClick: () => importSheet(app),
      }),
      navRow({
        title: "Очистить сегодняшний день",
        subtitle: "убрать тренировки за сегодня — например, тестовые",
        onClick: () => {
          const key = dayKey();
          if (sessionsOfDay(app, key).length === 0) {
            toast({ icon: "🗓", title: "Сегодня ещё пусто" });
            return;
          }
          daySheet(app, key);
        },
      }),
      navRow({
        title: "Сбросить всё",
        subtitle: "история, уровни и настройки вернутся к исходным",
        danger: true,
        onClick: () => confirmSheet({
          title: "Сбросить приложение?",
          subtitle: "Дневник и настройки будут стёрты. Отменить это нельзя — сначала сделай экспорт.",
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
          h("div.row-title", { text: "BurpiOpus" }),
          h("div.row-sub", { text: "дневник тренировок с целью, которая растёт сама" }),
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
    exercisesCard, levelsCard, trainCard, dataCard, aboutCard, sign,
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
            playSound("set", { index: 2 });
          },
        ),
      ),
    ),
  );
}

// Проигрывает основные звуки по очереди — можно проверить прямо под музыку,
// не начиная тренировку.
function soundCheck() {
  primeAudio();
  const script = [
    [0, "set", { index: 0 }],
    [420, "set", { index: 1 }],
    [840, "set", { index: 2 }],
    [1400, "goal", undefined],
    [2300, "finish", undefined],
  ];
  script.forEach(([delay, name, opts]) => {
    setTimeout(() => playSound(name, opts), delay);
  });
  toast({
    icon: "🔊",
    title: "Играю: подход, подход, подход, цель, финиш",
    subtitle: audioMixMode() === "risky"
      ? "Если музыка встала — выключи звуки"
      : "Музыка должна продолжать играть",
    duration: 4200,
  });
}

/* ------------------------------------------------------------ часовой пояс */

// Пояс определяет, где проходит граница суток: от неё зависят «сегодня»,
// серия и перенос незакрытой работы. По умолчанию берётся с устройства —
// список нужен для поездок и для случаев, когда система врёт.
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

  // Определённый системой пояс всегда есть в списке, даже если он не из нашего.
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
    subtitle: "Определяет границу суток: серию, «сегодня» и перенос незакрытого задания. Обычно подходит время устройства.",
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

/* ------------------------------------------------- карточка дня и удаление */

function sessionsOfDay(app, key) {
  const ex = app.exercise();
  return app.state.sessions
    .filter((s) => s.finishedAt && s.exerciseId === ex.id && s.dayKey === key)
    .sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
}

function timeOf(session) {
  const d = new Date(session.finishedAt);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Карточка дня: что сделано и кнопка всё это стереть. Открывается тапом по дню
// календаря, по строке истории и по счётчику «Сегодня» на главной.
export function daySheet(app, key) {
  const sessions = sessionsOfDay(app, key);
  if (sessions.length === 0) return;
  const total = sessions.reduce((a, s) => a + s.doneTotal, 0);

  sheet({
    title: humanDate(key),
    subtitle: `${sessions.length} ${plural(sessions.length, "тренировка", "тренировки", "тренировок")} · ${total} ${plural(total, "повтор", "повтора", "повторов")}`,
    body: h("div", { style: { "margin-bottom": "20px" } },
      sessions.map((s) =>
        h("div.day-line", {},
          h("div", {},
            h("div", { text: `${s.levelName} · ${(s.sets ?? []).join(" · ") || s.doneTotal}` }),
            h("div.day-line-sub", {
              text: `${timeOf(s)} · цель ${s.target} · ${goalReached(s) ? "взята" : "не взята"}`,
            }),
          ),
          h("div.day-line-num", { text: String(s.doneTotal) }),
        ),
      ),
    ),
    actions: [
      {
        label: "Очистить день",
        kind: "primary",
        danger: true,
        onClick: () => app.removeSessions(sessions.map((s) => s.id), {
          title: `${humanDate(key)} очищен`,
          subtitle: `Убрано ${total} ${plural(total, "повтор", "повтора", "повторов")}`,
        }),
      },
      { label: "Закрыть" },
    ],
  });
}

// Одна тренировка: удалить только её или сразу весь день.
function sessionSheet(app, session) {
  const daySessions = sessionsOfDay(app, session.dayKey);
  const dayTotalReps = daySessions.reduce((a, s) => a + s.doneTotal, 0);

  sheet({
    title: `${session.levelName} · ${session.doneTotal}`,
    subtitle: `${humanDate(session.dayKey)}, ${timeOf(session)} · цель ${session.target} · ${goalReached(session) ? "взята" : "не взята"}`,
    actions: [
      {
        label: "Удалить эту тренировку",
        kind: "primary",
        danger: true,
        onClick: () => app.removeSessions([session.id], {
          title: "Тренировка удалена",
          subtitle: `${session.doneTotal} ${plural(session.doneTotal, "повтор", "повтора", "повторов")}`,
        }),
      },
      daySessions.length > 1
        ? {
            label: `Очистить весь день (${dayTotalReps})`,
            danger: true,
            onClick: () => app.removeSessions(daySessions.map((s) => s.id), {
              title: `${humanDate(session.dayKey)} очищен`,
              subtitle: `Убрано ${dayTotalReps} ${plural(dayTotalReps, "повтор", "повтора", "повторов")}`,
            }),
          }
        : null,
      { label: "Отмена" },
    ].filter(Boolean),
  });
}

/* --------------------------------------------------------- листы настроек */

function exerciseSheet(app, exercise) {
  const isNew = !exercise;
  const draft = isNew
    ? { id: uid("ex"), name: "", icon: "💪", seedBest: 0, seedReps: 0, levels: null }
    : { ...exercise };

  const nameInput = h("input.input", { type: "text", value: draft.name, placeholder: "Например, Подтягивания" });
  const iconInput = h("input.input.is-emoji", { type: "text", value: draft.icon ?? "💪", maxlength: "3" });

  const canDelete = !isNew && app.state.exercises.length > 1;

  sheet({
    title: isNew ? "Новое упражнение" : draft.name,
    subtitle: isNew
      ? "Уровни скопируются из текущего упражнения — потом поправишь цифры."
      : "Имя и значок видно на всех экранах.",
    body: h("div.sheet-fields", {},
      labeledField("Значок и название", h("div.field", {}, iconInput, nameInput)),
      !isNew && app.state.activeExerciseId !== draft.id
        ? h("button.btn.btn-ghost", {
            type: "button",
            text: "Сделать активным",
            on: {
              click: () => {
                app.state.activeExerciseId = draft.id;
                app.save();
                closeSheet();
                haptic("success");
                app.render();
              },
            },
          })
        : null,
      canDelete
        ? h("button.btn.btn-ghost.btn-danger", {
            type: "button",
            text: "Удалить упражнение",
            on: {
              click: () => {
                closeSheet();
                confirmSheet({
                  title: `Удалить «${draft.name}»?`,
                  subtitle: "Записи дневника по этому упражнению тоже исчезнут.",
                  confirmLabel: "Удалить",
                  danger: true,
                  onConfirm: () => {
                    app.state.exercises = app.state.exercises.filter((e) => e.id !== draft.id);
                    app.state.sessions = app.state.sessions.filter((s) => s.exerciseId !== draft.id);
                    if (app.state.activeExerciseId === draft.id) {
                      app.state.activeExerciseId = app.state.exercises[0].id;
                    }
                    app.save();
                    app.render();
                  },
                });
              },
            },
          })
        : null,
    ),
    actions: [
      {
        label: "Сохранить",
        kind: "primary",
        onClick: () => {
          const name = nameInput.value.trim();
          if (!name) {
            haptic("error");
            nameInput.focus();
            return true; // лист не закрываем
          }
          if (isNew) {
            const template = app.exercise();
            app.state.exercises.push({
              id: draft.id,
              name,
              icon: iconInput.value.trim() || "💪",
              seedBest: 0,
              seedReps: 0,
              levels: template.levels.map((l) => ({ ...l, id: uid("lvl") })),
            });
            app.state.activeExerciseId = draft.id;
          } else {
            const target = app.state.exercises.find((e) => e.id === draft.id);
            target.name = name;
            target.icon = iconInput.value.trim() || "💪";
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

function levelSheet(app, exercise, level) {
  const isNew = !level;
  const draft = isNew
    ? { id: uid("lvl"), name: "", tagline: "", mode: "fixed", total: 20, base: 20, step: 1, sets: 0, accent: "violet" }
    : { ...level };

  const nameInput = h("input.input", { type: "text", value: draft.name, placeholder: "СРЕДНИЙ" });
  const taglineInput = h("input.input", { type: "text", value: draft.tagline ?? "", placeholder: "короткое пояснение" });
  const totalInput = h("input.input.is-num", { type: "number", inputmode: "numeric", value: String(draft.total ?? 20), min: "1" });
  const baseInput = h("input.input.is-num", { type: "number", inputmode: "numeric", value: String(draft.base ?? 20), min: "1" });
  const stepInput = h("input.input.is-num", { type: "number", inputmode: "numeric", value: String(draft.step ?? 1), min: "0" });
  const setsInput = h("input.input.is-num", { type: "number", inputmode: "numeric", value: String(draft.sets || 0), min: "0" });

  const fixedBlock = labeledField("Цель за тренировку", totalInput);
  const growBlock = h("div", {},
    labeledField("Стартовая цель", baseInput),
    h("div", { style: { height: "12px" } }),
    labeledField("Прибавка после каждой закрытой тренировки", stepInput),
  );

  const modeBox = h("div", {});
  function paintMode() {
    modeBox.replaceChildren(draft.mode === "progressive" ? growBlock : fixedBlock);
  }
  paintMode();

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

  const canDelete = !isNew && exercise.levels.length > 1;

  sheet({
    title: isNew ? "Новый уровень" : draft.name,
    subtitle: "Разбивка — только подсказка. Подходов можно сделать сколько угодно: задание закрывается по сумме повторов.",
    body: h("div.sheet-fields", {},
      labeledField("Название", nameInput),
      labeledField("Подпись", taglineInput),
      labeledField("Тип цели", segmented(
        [{ value: "fixed", label: "Фиксированная" }, { value: "progressive", label: "Растущая" }],
        draft.mode,
        (v) => { draft.mode = v; paintMode(); },
      )),
      modeBox,
      labeledField("Подсказка: на сколько подходов делить (0 — авто)", setsInput),
      labeledField("Цвет", accentRow),
      canDelete
        ? h("button.btn.btn-ghost.btn-danger", {
            type: "button",
            text: "Удалить уровень",
            on: {
              click: () => {
                closeSheet();
                confirmSheet({
                  title: `Удалить «${draft.name}»?`,
                  subtitle: "Записи в дневнике останутся, но выбрать этот уровень будет нельзя.",
                  confirmLabel: "Удалить",
                  danger: true,
                  onConfirm: () => {
                    exercise.levels = exercise.levels.filter((l) => l.id !== draft.id);
                    const last = app.state.settings.lastLevelByExercise ?? {};
                    if (last[exercise.id] === draft.id) last[exercise.id] = exercise.levels[0].id;
                    app.save();
                    app.render();
                  },
                });
              },
            },
          })
        : null,
    ),
    actions: [
      {
        label: "Сохранить",
        kind: "primary",
        onClick: () => {
          const name = nameInput.value.trim();
          if (!name) {
            haptic("error");
            nameInput.focus();
            return true;
          }
          const payload = {
            id: draft.id,
            name,
            tagline: taglineInput.value.trim(),
            mode: draft.mode,
            accent: draft.accent,
            sets: Math.max(0, Number(setsInput.value) || 0),
          };
          if (draft.mode === "progressive") {
            payload.base = Math.max(1, Number(baseInput.value) || 1);
            payload.step = Math.max(0, Number(stepInput.value) || 0);
          } else {
            payload.total = Math.max(1, Number(totalInput.value) || 1);
          }

          if (isNew) exercise.levels.push(payload);
          else {
            const idx = exercise.levels.findIndex((l) => l.id === draft.id);
            exercise.levels[idx] = payload;
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

function numberSheet(app, { title, subtitle, value, min = 0, max = 999, onSave }) {
  const input = h("input.input.is-num", { type: "number", inputmode: "numeric", value: String(value), min: String(min), max: String(max) });
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
    subtitle: "Скопируй текст и сохрани где угодно — из него дневник восстанавливается целиком.",
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
            if (!parsed || !Array.isArray(parsed.exercises)) throw new Error("bad");
            app.replaceState(parsed);
            haptic("success");
            toast({ icon: "📥", title: "Дневник восстановлен" });
            return false;
          } catch {
            haptic("error");
            toast({ icon: "⚠️", title: "Не получилось", subtitle: "Текст не похож на экспорт BurpiOpus" });
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

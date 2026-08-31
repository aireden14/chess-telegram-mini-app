// Мини-слой над DOM: гиперскрипт, нижние листы, тосты, переключатели.
// Без фреймворка — приложение должно оставаться набором статических файлов.

import { haptic } from "./tg.js?v=1.5.1";
import { playSound } from "./sound.js?v=1.5.1";

/**
 * h("button.btn.btn-primary", { text: "Начать", on: { click } })
 * Классы можно писать прямо в теге — так разметка читается ближе к CSS.
 */
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = String(tag).split(".");
  const node = document.createElement(name || "div");
  if (classes.length) node.className = classes.join(" ");

  Object.entries(props || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === "class") {
      node.className = `${node.className} ${value}`.trim();
    } else if (key === "text") {
      node.textContent = String(value);
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (key === "style" && typeof value === "object") {
      Object.entries(value).forEach(([p, v]) => node.style.setProperty(p, v));
    } else if (key === "on") {
      Object.entries(value).forEach(([evt, fn]) => node.addEventListener(evt, fn));
    } else if (key === "dataset") {
      Object.entries(value).forEach(([p, v]) => { node.dataset[p] = v; });
    } else {
      node.setAttribute(key, value === true ? "" : String(value));
    }
  });

  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });

  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ------------------------------------------------------------- иконки табов */

const ICONS = {
  today:
    '<path d="M12 3.6 4.4 9.2v10.2a1 1 0 0 0 1 1h4.1v-5.6h5v5.6h4.1a1 1 0 0 0 1-1V9.2L12 3.6Z"/>',
  diary:
    '<path d="M6.5 3.2h11a2 2 0 0 1 2 2v13.6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V5.2a2 2 0 0 1 2-2Zm2 4.4h7M8.5 12h7M8.5 16.4h4.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  settings:
    '<path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm8.3 3.6c0 .6-.06 1.15-.16 1.7l2 1.55-1.9 3.3-2.4-.95a7.8 7.8 0 0 1-2.94 1.7L14.5 22h-5l-.4-2.7a7.8 7.8 0 0 1-2.94-1.7l-2.4.95-1.9-3.3 2-1.55a8 8 0 0 1 0-3.4l-2-1.55 1.9-3.3 2.4.95A7.8 7.8 0 0 1 9.1 4.7L9.5 2h5l.4 2.7c1.1.36 2.1.94 2.94 1.7l2.4-.95 1.9 3.3-2 1.55c.1.55.16 1.1.16 1.7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
};

export function tabIcon(kind) {
  const filled = kind === "today";
  return `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" aria-hidden="true">${ICONS[kind]}</svg>`;
}

/* -------------------------------------------------------------- нижний лист */

let openSheet = null;

export function sheet({ title, subtitle, body, actions = [] }) {
  closeSheet();

  const panel = h("div.sheet", {},
    h("div.sheet-grip"),
    title ? h("h2.sheet-title", { text: title }) : null,
    subtitle ? h("p.sheet-sub", { text: subtitle }) : null,
    body ?? null,
    actions.length
      ? h("div.actions", {},
          actions.map((a) =>
            h(`button.btn.${a.kind === "primary" ? "btn-primary" : "btn-ghost"}${a.danger ? ".btn-danger" : ""}`, {
              type: "button",
              text: a.label,
              on: {
                click: () => {
                  haptic(a.kind === "primary" ? "medium" : "light");
                  const keep = a.onClick?.();
                  if (!keep) closeSheet();
                },
              },
            }),
          ),
        )
      : null,
  );

  const backdrop = h("div.sheet-backdrop", {
    on: {
      click: (e) => { if (e.target === backdrop) closeSheet(); },
    },
  }, panel);

  document.body.appendChild(backdrop);
  openSheet = backdrop;
  return { close: closeSheet, panel };
}

export function closeSheet() {
  if (!openSheet) return;
  const node = openSheet;
  openSheet = null;
  node.style.animation = "fade-in 200ms var(--ease) reverse both";
  setTimeout(() => node.remove(), 190);
}

export function isSheetOpen() {
  return Boolean(openSheet);
}

export function confirmSheet({ title, subtitle, confirmLabel = "Да", danger = false, onConfirm }) {
  sheet({
    title,
    subtitle,
    actions: [
      { label: confirmLabel, kind: "primary", danger, onClick: onConfirm },
      { label: "Отмена" },
    ],
  });
}

/* ------------------------------------------------------------------- тост */

let toastTimer = 0;

/**
 * @param {{icon?: string, title: string, subtitle?: string, duration?: number,
 *          action?: {label: string, onClick: () => void}}} options
 * `action` превращает тост в отмену действия — так удаление можно делать сразу,
 * не переспрашивая «вы уверены?».
 */
export function toast({ icon = "✨", title, subtitle, duration = 2600, action }) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  clearTimeout(toastTimer);

  const close = () => {
    clearTimeout(toastTimer);
    node.classList.add("is-out");
    setTimeout(() => node.remove(), 320);
  };

  const node = h("div.toast", {},
    h("div.toast-icon", { text: icon }),
    h("div", { style: { flex: "1", "min-width": "0" } },
      h("div.toast-title", { text: title }),
      subtitle ? h("div.toast-sub", { text: subtitle }) : null,
    ),
    action
      ? h("button.btn.toast-action", {
          type: "button",
          text: action.label,
          on: {
            click: () => {
              haptic("medium");
              close();
              action.onClick();
            },
          },
        })
      : null,
  );
  document.body.appendChild(node);

  toastTimer = setTimeout(close, duration);
}

/* --------------------------------------------------------------- элементы */

export function switchRow({ title, subtitle, value, onChange }) {
  const btn = h(`button.switch${value ? ".is-on" : ""}`, {
    type: "button",
    role: "switch",
    "aria-checked": value ? "true" : "false",
    "aria-label": title,
    on: {
      click: () => {
        const next = !btn.classList.contains("is-on");
        btn.classList.toggle("is-on", next);
        btn.setAttribute("aria-checked", next ? "true" : "false");
        haptic("select");
        playSound("tap");
        onChange(next);
      },
    },
  });

  return h("div.row", {},
    h("div.row-main", {},
      h("div.row-title", { text: title }),
      subtitle ? h("div.row-sub", { text: subtitle }) : null,
    ),
    btn,
  );
}

export function navRow({ title, subtitle, value, onClick, danger = false }) {
  return h("div.row", {
    style: { cursor: "pointer" },
    on: { click: () => { haptic("light"); playSound("tap"); onClick?.(); } },
  },
    h("div.row-main", {},
      h("div.row-title", { text: title, class: danger ? "btn-danger" : "" }),
      subtitle ? h("div.row-sub", { text: subtitle }) : null,
    ),
    value ? h("div.row-value", { text: value }) : null,
    h("div.level-chevron", { text: "›" }),
  );
}

export function segmented(options, value, onChange) {
  const wrap = h("div.seg");
  options.forEach((opt) => {
    const btn = h(`button.seg-btn${opt.value === value ? ".is-on" : ""}`, {
      type: "button",
      text: opt.label,
      on: {
        click: () => {
          haptic("select");
          playSound("tap");
          wrap.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-on"));
          btn.classList.add("is-on");
          onChange(opt.value);
        },
      },
    });
    wrap.append(btn);
  });
  return wrap;
}

export function labeledField(label, control) {
  return h("div", {},
    h("div.sheet-field-label", { text: label }),
    control,
  );
}

export function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

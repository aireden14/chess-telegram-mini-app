// Мост к Telegram. Приложение живёт в двух режимах:
//   1) отдельный Mini App — Telegram WebApp SDK доступен напрямую;
//   2) iframe внутри GamePass — SDK в дочернем окне не работает, поэтому
//      родительская оболочка проксирует хаптику и присылает безопасные отступы.
// Наружу отдаём один API, вызывающему коду разница не видна.

const CHANNEL = "burpi-opus";
const embedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

function sdk() {
  return window.Telegram?.WebApp ?? null;
}

// SDK считается рабочим только когда он реально подключён к клиенту Telegram.
function liveSdk() {
  const tg = sdk();
  if (!tg) return null;
  if (embedded) return null;
  return tg.initData || tg.platform ? tg : null;
}

function toParent(message) {
  if (!embedded) return;
  try {
    window.parent.postMessage({ source: CHANNEL, ...message }, "*");
  } catch {
    /* другой origin — молча пропускаем */
  }
}

let hapticsEnabled = true;
export function setHapticsEnabled(value) {
  hapticsEnabled = Boolean(value);
}

/**
 * @param {"light"|"medium"|"heavy"|"rigid"|"soft"|"success"|"warning"|"error"|"select"} kind
 */
export function haptic(kind = "light") {
  if (!hapticsEnabled) return;
  const tg = liveSdk();
  try {
    if (tg?.HapticFeedback) {
      if (kind === "select") tg.HapticFeedback.selectionChanged?.();
      else if (kind === "success" || kind === "warning" || kind === "error") {
        tg.HapticFeedback.notificationOccurred?.(kind);
      } else tg.HapticFeedback.impactOccurred?.(kind);
    }
  } catch {
    /* старый клиент — не критично */
  }
  toParent({ type: "haptic", kind });

  // Вне Telegram (браузер, Android WebView) остаётся системная вибрация:
  // тактильный отклик — часть ощущения тренировки, терять его не хочется.
  if (!tg && "vibrate" in navigator) {
    const pattern =
      kind === "success" ? [14, 26, 34]
      : kind === "warning" || kind === "error" ? [32, 22, 32]
      : kind === "heavy" ? 46
      : kind === "medium" ? 26
      : kind === "select" ? 8
      : 12;
    try { navigator.vibrate(pattern); } catch { /* политика браузера */ }
  }
}

/* --------------------------------------------------------- безопасные зоны */

const SAFE_VARS = ["top", "bottom", "left", "right"];

function applySafeArea(inset) {
  const root = document.documentElement;
  SAFE_VARS.forEach((side) => {
    const value = Number(inset?.[side]);
    root.style.setProperty(`--tg-safe-${side}`, `${Number.isFinite(value) ? Math.max(0, value) : 0}px`);
  });
}

function readSafeAreaFromSdk() {
  const tg = liveSdk();
  if (!tg) return;
  const content = tg.contentSafeAreaInset ?? {};
  const device = tg.safeAreaInset ?? {};
  applySafeArea({
    top: (device.top ?? 0) + (content.top ?? 0),
    bottom: (device.bottom ?? 0) + (content.bottom ?? 0),
    left: (device.left ?? 0) + (content.left ?? 0),
    right: (device.right ?? 0) + (content.right ?? 0),
  });
}

/* ------------------------------------------------------------- инициализация */

export function initTelegram() {
  const tg = liveSdk();

  if (tg) {
    try {
      tg.ready();
      tg.expand?.();
      const atLeast = (v) => {
        try { return tg.isVersionAtLeast ? tg.isVersionAtLeast(v) : false; } catch { return false; }
      };
      // Вызов неподдерживаемого метода SDK не бросает исключение, но пишет
      // ошибку в консоль — поэтому спрашиваем версию заранее.
      if (atLeast("8.0")) tg.requestFullscreen?.();
      if (atLeast("7.7")) tg.disableVerticalSwipes?.();
      tg.setHeaderColor?.("#000000");
      tg.setBackgroundColor?.("#000000");
      tg.onEvent?.("safeAreaChanged", readSafeAreaFromSdk);
      tg.onEvent?.("contentSafeAreaChanged", readSafeAreaFromSdk);
      tg.onEvent?.("fullscreenChanged", readSafeAreaFromSdk);
      tg.onEvent?.("viewportChanged", readSafeAreaFromSdk);
    } catch {
      /* клиент постарше — работаем как обычная веб-страница */
    }
    readSafeAreaFromSdk();
  }

  if (embedded) {
    // Оболочка GamePass знает про отступы Telegram — слушаем её.
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || data.source !== "gamepass-shell") return;
      if (data.type === "safe-area") applySafeArea(data.inset);
    });
    toParent({ type: "ready" });
  }

  return { embedded, native: Boolean(tg) };
}

// Кнопка «Назад» приложения: внутри GamePass выводим наверх, отдельный
// Mini App закрываем средствами Telegram.
export function requestExit() {
  if (embedded) {
    toParent({ type: "exit" });
    return true;
  }
  const tg = liveSdk();
  if (tg?.close) {
    tg.close();
    return true;
  }
  return false;
}

export function isEmbedded() {
  return embedded;
}

// Мост к Telegram (общий с BurpiOpus по устройству, свой канал сообщений). Приложение живёт в двух режимах:
//   1) отдельный Mini App — Telegram WebApp SDK доступен напрямую;
//   2) iframe внутри GamePass — SDK в дочернем окне не работает, поэтому
//      родительская оболочка проксирует хаптику и присылает безопасные отступы.
// Наружу отдаём один API, вызывающему коду разница не видна.

const CHANNEL = "chitopus";
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

/* ------------------------------------------------ окно «на экране Домой» */

// iOS в режиме веб-приложения (добавлено на экран «Домой») иногда отдаёт окно
// короче экрана ровно на высоту статус-бара: снизу остаётся пустая полоса, и
// нижняя панель висит над ней. Растягиваем приложение на весь экран сами.
// navigator.standalone есть только у iOS — Android и десктоп не трогаем.
function fitStandaloneHeight() {
  if (embedded || navigator.standalone !== true) return;
  const root = document.documentElement.style;
  const portrait = window.innerHeight >= window.innerWidth;
  const full = portrait
    ? Math.max(screen.width, screen.height)
    : Math.min(screen.width, screen.height);
  const gap = full - window.innerHeight;
  if (gap > 4 && gap < 90) root.setProperty("--app-height", `${full}px`);
  else root.removeProperty("--app-height");
}

/* ------------------------------------------------------------- инициализация */

export function initTelegram() {
  const tg = liveSdk();

  fitStandaloneHeight();
  window.addEventListener("resize", fitStandaloneHeight);
  window.addEventListener("orientationchange", () => setTimeout(fitStandaloneHeight, 300));
  setTimeout(fitStandaloneHeight, 400);

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
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#000000";
      tg.setHeaderColor?.(bg);
      tg.setBackgroundColor?.(bg);
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

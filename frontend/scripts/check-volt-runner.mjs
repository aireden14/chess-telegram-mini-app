#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const gameUrl = new URL("../public/games/volt-runner/index.html", import.meta.url);
const gamePath = fileURLToPath(gameUrl);

let html;
try {
  html = await readFile(gameUrl, "utf8");
} catch (error) {
  console.error(`ERROR Не удалось прочитать VOLT RUNNER: ${gamePath}`);
  console.error(`      ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const inlineScripts = [];
const scriptTagPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu;
let scriptMatch;

while ((scriptMatch = scriptTagPattern.exec(html)) !== null) {
  const [, attributes, source] = scriptMatch;
  if (/\bsrc\s*=/iu.test(attributes)) continue;

  const type = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/iu)?.[2]?.toLowerCase();
  if (type && !["text/javascript", "application/javascript", "module"].includes(type)) {
    continue;
  }

  inlineScripts.push(source);
}

const js = inlineScripts.join("\n");
const failures = [];
let passed = 0;

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function check(name, assertion) {
  try {
    assertion();
    passed += 1;
    console.log(`OK    ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ name, message });
    console.error(`ERROR ${name}`);
    console.error(`      ${message}`);
  }
}

function functionDefinitionWindow(functionName, length = 2400) {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const definitionPattern = new RegExp(
    String.raw`(?:function\s+${escapedName}\s*\(|(?:const|let|var)\s+${escapedName}\s*=|\b${escapedName}\s*=\s*function\b)`,
    "u",
  );
  const definitionIndex = js.search(definitionPattern);
  return definitionIndex === -1 ? "" : js.slice(definitionIndex, definitionIndex + length);
}

function eventListenerWindow(eventName, length = 2400) {
  const escapedEvent = eventName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const listenerPattern = new RegExp(
    String.raw`(?:\b(?:window|document)\s*\.\s*)?addEventListener\s*\(\s*["']${escapedEvent}["']\s*,\s*([A-Za-z_$][\w$]*)?`,
    "iu",
  );
  const match = listenerPattern.exec(js);
  if (!match) return "";

  let source = js.slice(match.index, match.index + length);
  const callbackName = match[1];
  if (!callbackName) return source;

  const callbackSource = functionDefinitionWindow(callbackName, length);
  if (callbackSource) source += `\n${callbackSource}`;
  return source;
}

check("Найден inline JavaScript", () => {
  requireCondition(inlineScripts.length > 0, "В HTML нет inline <script> для проверки.");
});

check("Inline JavaScript синтаксически корректен", () => {
  inlineScripts.forEach((source, index) => {
    try {
      // VOLT RUNNER intentionally ships as a classic standalone script.
      // new Function parses it without running browser-only code.
      new Function(`${source}\n//# sourceURL=volt-runner-inline-${index + 1}.js`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`inline script #${index + 1}: ${message}`);
    }
  });
});

check("Есть кликабельный бренд Powered by @Denrech", () => {
  requireMatch(
    html,
    /Powered by\s*<a\b[^>]*\bhref\s*=\s*["']https:\/\/t\.me\/Denrech["'][^>]*>\s*@Denrech\s*<\/a>/iu,
    "Ожидалась видимая ссылка «Powered by @Denrech» на https://t.me/Denrech.",
  );
});

check("Есть внутриигровой экран «Что нового» для 1.0.1", () => {
  requireMatch(html, /<section\b[^>]*\bid\s*=\s*["']news["'][^>]*>/iu, "Не найден экран #news.");
  requireMatch(html, /что\s+нового/iu, "Не найден текст «Что нового».");
  requireMatch(html, /\b1\.0\.1\b/u, "Экран «Что нового» не содержит версию 1.0.1.");
});

check("Gameplay защищён от selection и iOS long-press", () => {
  requireMatch(html, /(?<!-)\buser-select\s*:\s*none\b/iu, "Нет CSS user-select: none.");
  requireMatch(html, /-webkit-user-select\s*:\s*none\b/iu, "Нет CSS -webkit-user-select: none.");
  requireMatch(html, /-webkit-touch-callout\s*:\s*none\b/iu, "Нет CSS -webkit-touch-callout: none.");
  const protectionIndex = js.search(/selectionstart/u);
  const protectionSource =
    protectionIndex === -1
      ? ""
      : js.slice(Math.max(0, protectionIndex - 500), protectionIndex + 1800);
  for (const eventName of ["selectionstart", "dragstart", "contextmenu"]) {
    requireCondition(
      protectionSource.includes(eventName),
      `Нет preventDefault-обработчика ${eventName}.`,
    );
  }
  requireMatch(
    protectionSource,
    /\bpreventDefault\s*\(/u,
    "Защитные обработчики не вызывают preventDefault().",
  );
});

check("Сохранение имеет явную версию схемы", () => {
  const versionIdentifier = js.match(/\bSAVE_(?:SCHEMA_)?VERSION\b/u)?.[0];
  requireCondition(
    Boolean(versionIdentifier),
    "Добавьте константу SAVE_VERSION или SAVE_SCHEMA_VERSION.",
  );
  requireMatch(
    js,
    /\bSAVE_(?:SCHEMA_)?VERSION\s*=\s*(?:\d+|["'][^"']+["'])/u,
    "Версия save-schema должна иметь явное значение.",
  );
  requireMatch(
    js,
    /\b(?:version|schemaVersion)\s*:\s*SAVE_(?:SCHEMA_)?VERSION\b/u,
    "Сохраняемый объект должен содержать version/schemaVersion из константы схемы.",
  );
  requireMatch(js, /\blocalStorage\s*\.\s*getItem\s*\(/u, "Нет загрузки сохранения.");
  requireMatch(js, /\blocalStorage\s*\.\s*setItem\s*\(/u, "Нет записи сохранения.");
});

check("Игровая симуляция использует fixed-step accumulator", () => {
  const stepIdentifier = js.match(/\b(?:FIXED_STEP|FIXED_DT|SIMULATION_STEP)\b/u)?.[0];
  requireCondition(
    Boolean(stepIdentifier),
    "Добавьте идентификатор FIXED_STEP, FIXED_DT или SIMULATION_STEP.",
  );
  requireMatch(
    js,
    /\bMAX_(?:FRAME_DT|FRAME_DELTA)\b/u,
    "Не найден идентификатор ограничения frame delta.",
  );
  requireMatch(js, /\baccumulator\b/iu, "Не найден accumulator fixed-step цикла.");
  requireMatch(
    js,
    /\bwhile\s*\(\s*accumulator\s*>=\s*(?:FIXED_STEP|FIXED_DT|SIMULATION_STEP)\b[^)]*\)/u,
    "Ожидался accumulator-loop while (accumulator >= FIXED_STEP).",
  );
  requireMatch(
    js,
    /\b(?:update|simulate|step)\w*\s*\(\s*(?:FIXED_STEP|FIXED_DT|SIMULATION_STEP)\b(?:\s*,|\s*\))/iu,
    "Fixed-step цикл должен передавать постоянный шаг в update/simulate/step.",
  );
  requireMatch(
    js,
    /\baccumulator\s*-=\s*(?:FIXED_STEP|FIXED_DT|SIMULATION_STEP)\b/u,
    "Fixed-step loop не вычитает постоянный шаг из accumulator.",
  );
  requireMatch(js, /\bperformance\s*\.\s*now\s*\(/u, "Монотонные кадры должны опираться на performance.now().");
});

check("Telegram safe area принимается через postMessage", () => {
  const messageHandler = eventListenerWindow("message", 5000);
  requireCondition(messageHandler.length > 0, "Нет addEventListener('message', ...).");
  requireMatch(
    messageHandler,
    /["']gamepass["']/u,
    "Message handler не проверяет source: 'gamepass'.",
  );
  const safeAreaCall = messageHandler.match(
    /["']volt-runner:safe-area["'][\s\S]{0,600}?\b([A-Za-z_$][\w$]*)\s*\(/u,
  );
  requireCondition(
    Boolean(safeAreaCall),
    "Message handler не связывает type 'volt-runner:safe-area' с helper-вызовом.",
  );
  const safeAreaHelper = functionDefinitionWindow(safeAreaCall[1], 3000);
  requireCondition(
    safeAreaHelper.length > 0,
    `Не найдено определение safe-area helper ${safeAreaCall[1]}().`,
  );
  requireMatch(
    `${messageHandler}\n${safeAreaHelper}`,
    /\.style\s*\.\s*setProperty\s*\(\s*["'`]--[^"'`]*(?:safe|inset|tg)/iu,
    "Safe area не передаётся в CSS custom properties через style.setProperty().",
  );
});

check("Потеря видимости ставит активный забег на паузу", () => {
  const handler = eventListenerWindow("visibilitychange");
  requireCondition(handler.length > 0, "Нет visibilitychange handler.");
  requireMatch(handler, /\b(?:hidden|visibilityState)\b/u, "Handler не проверяет скрытое состояние.");
  requireMatch(
    handler,
    /\b(?:pause|suspend|interrupt)\w*\s*\(/iu,
    "visibilitychange handler не вызывает pause/suspend helper.",
  );
});

check("Потеря фокуса ставит активный забег на паузу", () => {
  const handler = eventListenerWindow("blur");
  requireCondition(handler.length > 0, "Нет window blur handler.");
  requireMatch(
    handler,
    /\b(?:pause|suspend|interrupt)\w*\s*\(/iu,
    "blur handler не вызывает pause/suspend helper.",
  );
});

check("Поворот в portrait останавливает активный забег", () => {
  const orientationHandler = eventListenerWindow("orientationchange", 3600);
  const resizeHandler = eventListenerWindow("resize", 3600);
  const portraitMediaQuery = /matchMedia\s*\(\s*["'][^"']*orientation\s*:\s*portrait/iu.test(js);
  const portraitDimensionCheck =
    /\binnerHeight\s*>\s*innerWidth\b/u.test(js) ||
    /\binnerWidth\s*<\s*innerHeight\b/u.test(js);
  requireCondition(
    orientationHandler.length > 0 || portraitMediaQuery || portraitDimensionCheck,
    "Нет orientationchange/matchMedia/dimension проверки portrait.",
  );
  const orientationSource = `${orientationHandler}\n${resizeHandler}\n${js.slice(
    Math.max(0, js.search(/orientation\s*:\s*portrait/iu)),
    Math.max(0, js.search(/orientation\s*:\s*portrait/iu)) + 2400,
  )}`;
  requireMatch(
    orientationSource,
    /\b(?:pause|suspend|interrupt)\w*\s*\(/iu,
    "Portrait/orientation path не вызывает pause/suspend helper.",
  );
});

check("Клавиатура игнорирует keydown.repeat", () => {
  const handler = eventListenerWindow("keydown", 4000);
  requireCondition(handler.length > 0, "Нет keydown handler.");
  requireMatch(handler, /\.\s*repeat\b/u, "keydown handler не проверяет event.repeat.");
  requireMatch(
    handler,
    /(?:if\s*\([^)]*\.repeat[^)]*\)\s*(?:\{\s*)?return\b|if\s*\(\s*!\s*[^)]*\.repeat)/u,
    "Проверка event.repeat не предотвращает повторный ввод.",
  );
});

console.log("");
if (failures.length > 0) {
  console.error(
    `VOLT RUNNER smoke-check: FAILED (${failures.length} ошибок, ${passed} проверок OK).`,
  );
  console.error(`Файл: ${gamePath}`);
  process.exitCode = 1;
} else {
  console.log(`VOLT RUNNER smoke-check: OK (${passed} проверок).`);
  console.log(`Файл: ${gamePath}`);
}

// The React iframe's allow="gamepad" attribute lives outside this standalone
// document, so it is deliberately checked by the shell/build test, not here.

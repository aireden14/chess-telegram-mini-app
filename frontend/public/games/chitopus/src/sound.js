// Звуки действий: короткие, музыкальные, синтезируются на месте.
//
// Читают часто в тишине или под музыку, поэтому палитра здесь тише и мягче,
// чем в тренировочном приложении: шелест страницы вместо удара.
//
// Файлов нет намеренно — приложение остаётся переносимым набором статики, а
// каждый звук можно точно подстроить (длительность, высота, атака).
//
// ГЛАВНОЕ ОГРАНИЧЕНИЕ — фоновая музыка пользователя. По умолчанию веб-страница
// на iOS забирает аудиосессию себе и ставит чужую музыку на паузу. Лечится
// `navigator.audioSession.type = "ambient"` (WebKit, iOS 16.4+): звуки
// подмешиваются к музыке и никого не прерывают. Расплата за ambient —
// аппаратный переключатель «без звука» глушит их, и это правильно для SFX.
// Где API нет, мы честно сообщаем об этом в настройках и не включаем звук сам.

let ctx = null;
let master = null;
let enabled = true;
let volume = 0.35;
let mixMode = "unknown"; // "ambient" | "mixes" | "risky"

const VOLUMES = { low: 0.18, mid: 0.35, high: 0.62 };

export function volumeLevels() {
  return Object.keys(VOLUMES);
}

/* --------------------------------------------------------- аудиосессия iOS */

export function isAppleWebKit() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua)
    || (ua.includes("Macintosh") && "ontouchend" in document);
}

function applyAudioSession() {
  try {
    if (typeof navigator !== "undefined" && navigator.audioSession) {
      // ambient = подмешиваться к чужому звуку, не прерывать его
      navigator.audioSession.type = "ambient";
      mixMode = "ambient";
      return;
    }
  } catch {
    /* доступ к сессии закрыт — работаем как есть */
  }
  // Проблема с захватом аудиосессии — специфика WebKit на устройствах Apple.
  // Android и десктопные браузеры подмешивают звук к чужой музыке сами, там
  // никакого отдельного API не нужно.
  mixMode = isAppleWebKit() ? "risky" : "mixes";
}

/**
 * Как звук уживётся с чужой музыкой:
 *   "ambient" — подмешивается, гарантировано (iOS 16.4+ через audioSession);
 *   "mixes"   — подмешивается, так работает платформа (Android, десктоп);
 *   "risky"   — старый iOS: музыка может встать на паузу.
 */
export function audioMixMode() {
  if (mixMode === "unknown") applyAudioSession();
  return mixMode;
}

/* ------------------------------------------------------------ инициализация */

export function configureSound({ enabled: on, volume: level }) {
  enabled = on !== false;
  volume = VOLUMES[level] ?? VOLUMES.mid;
  if (master) master.gain.value = volume;
}

// Запас перед планированием. Без него события ложатся ровно на currentTime и
// при малейшей задержке оказываются в прошлом — звук просто не звучит.
const LOOKAHEAD = 0.03;

let unlocked = false;

function createContext() {
  if (ctx && ctx.state !== "closed") return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  applyAudioSession();
  try {
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    unlocked = false;
  } catch {
    ctx = null;
  }
}

// Классический разлочиватель WebKit: проиграть пустой буфер внутри жеста.
// Без него первый настоящий звук после старта часто пропадает.
function unlockSilently() {
  if (unlocked || !ctx) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* не вышло — попробуем на следующем жесте */
  }
}

// Вызывается из каждого жеста и при возврате в приложение: iOS усыпляет
// контекст сам (сворачивание, звонок, чужое аудио), и без пробуждения звук
// молча пропадает.
export function primeAudio() {
  createContext();
  if (!ctx) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  unlockSilently();
}

// Слушатели ставятся один раз и живут всё время работы приложения — именно
// поэтому они НЕ `once`: усыпить контекст система может когда угодно.
let unlockInstalled = false;
export function installAudioUnlock() {
  if (unlockInstalled) return;
  unlockInstalled = true;
  const kick = () => primeAudio();
  ["pointerdown", "touchstart", "click", "keydown"].forEach((type) => {
    window.addEventListener(type, kick, { passive: true, capture: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) primeAudio();
  });
}

/**
 * Проигрывает звук, дождавшись живого контекста. Если контекст усыплён,
 * планировать НЕЛЬЗЯ: его currentTime заморожен, и события уедут в прошлое.
 * Поэтому сначала resume, и только в его колбэке — синтез.
 */
function withContext(fn) {
  if (!enabled) return;
  createContext();
  if (!ctx) return;

  if (ctx.state === "running") {
    fn();
    return;
  }
  // Safari умеет ещё и "interrupted" — например, после звонка.
  ctx.resume()
    .then(() => {
      if (ctx && ctx.state === "running") fn();
    })
    .catch(() => {});
}

/* --------------------------------------------------------------- примитивы */

/**
 * Одна нота с мягкой огибающей. Резкая атака щёлкает и утомляет на десятом
 * подходе, поэтому даже у «ударных» звуков атака не нулевая.
 */
function tone({
  freq, dur = 0.18, type = "triangle", gain = 0.5,
  delay = 0, attack = 0.006, sweepTo = null, detune = 0,
}) {
  const t0 = ctx.currentTime + LOOKAHEAD + delay;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  if (detune) osc.detune.setValueAtTime(detune, t0);

  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Короткий шумовой транзиент — «тело» удара под тональной нотой.
function thud({ delay = 0, gain = 0.35, freq = 180, dur = 0.09 }) {
  tone({ freq, dur, type: "sine", gain, delay, attack: 0.003, sweepTo: freq * 0.6 });
}

/* ------------------------------------------------------------------ палитра
   Всё в одной тональности (ре-мажорная пентатоника) — звуки не спорят друг с
   другом, когда идут подряд, и звучат «книжно»: мягкая атака, без щелчков. */

const P = {
  D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440.00, B4: 493.88,
  D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880.00, B5: 987.77,
  D6: 1174.66, Fs6: 1479.98, A6: 1760.00,
};

const SOUNDS = {
  // Страницы записаны — основной звук приложения, мягкий и короткий.
  page: () => {
    tone({ freq: P.A4, dur: 0.14, type: "sine", gain: 0.3, attack: 0.012 });
    tone({ freq: P.D5, dur: 0.2, type: "triangle", gain: 0.24, delay: 0.05, attack: 0.014 });
  },

  // Цель дня взята — светлое трезвучие вверх, без пафоса.
  goal: () => {
    [P.D5, P.Fs5, P.A5].forEach((f, i) => {
      tone({ freq: f, dur: 0.24, type: "triangle", gain: 0.32, delay: i * 0.075, attack: 0.012 });
    });
    tone({ freq: P.D6, dur: 0.34, type: "sine", gain: 0.1, delay: 0.17 });
  },

  // Книга дочитана — самое редкое и самое красивое событие приложения.
  book: () => {
    [P.D4, P.Fs4, P.A4, P.D5, P.Fs5].forEach((f, i) => {
      tone({ freq: f, dur: 0.4, type: "triangle", gain: 0.32, delay: i * 0.085, attack: 0.014 });
    });
    tone({ freq: P.A5, dur: 0.8, type: "sine", gain: 0.14, delay: 0.42 });
    [P.D6, P.Fs6, P.A6].forEach((f, i) => {
      tone({ freq: f, dur: 0.22, type: "sine", gain: 0.11, delay: 0.5 + i * 0.07 });
    });
  },

  // Книга отложена. Тёплое и нейтральное: бросить книгу — нормальное решение.
  drop: () => {
    tone({ freq: P.A4, dur: 0.24, type: "sine", gain: 0.26 });
    tone({ freq: P.Fs4, dur: 0.34, type: "sine", gain: 0.22, delay: 0.12 });
  },

  // Порог серии — быстрый пробег вверх.
  milestone: () => {
    [P.D4, P.E4, P.Fs4, P.A4, P.B4, P.D5].forEach((f, i) => {
      tone({ freq: f, dur: 0.18, type: "triangle", gain: 0.28, delay: i * 0.055 });
    });
    [P.Fs5, P.A5].forEach((f, i) => {
      tone({ freq: f, dur: 0.42, type: "sine", gain: 0.15, delay: 0.33 + i * 0.07 });
    });
  },

  // Нажатие: почти на грани слышимости, чтобы не надоесть.
  tap: () => {
    tone({ freq: P.A4, dur: 0.04, type: "sine", gain: 0.09, attack: 0.003 });
  },

  // Удаление и возврат.
  erase: () => {
    tone({ freq: P.A4, dur: 0.16, type: "sine", gain: 0.2, sweepTo: P.D4 });
  },
  undo: () => {
    tone({ freq: P.D4, dur: 0.16, type: "sine", gain: 0.2, sweepTo: P.A4 });
  },
};

/**
 * @param {"page"|"goal"|"book"|"drop"|"milestone"|"tap"|"erase"|"undo"} name
 */
export function playSound(name, opts) {
  if (!SOUNDS[name]) return;
  withContext(() => {
    try {
      SOUNDS[name](opts);
    } catch {
      /* сессия отвалилась — звук не критичен, молчим */
    }
  });
}

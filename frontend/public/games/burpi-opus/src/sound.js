// Звуки действий: короткие, музыкальные, синтезируются на месте.
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

// AudioContext на iOS создаётся только из жеста, поэтому подготовку вызываем
// из первого касания, а не при загрузке.
export function primeAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;

  applyAudioSession();
  try {
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function ready() {
  if (!enabled) return false;
  if (!ctx) primeAudio();
  if (!ctx) return false;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx.state !== "closed";
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
  const t0 = ctx.currentTime + delay;
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
   Всё в одной тональности (ля-мажорная пентатоника) — поэтому звуки не спорят
   друг с другом, когда идут подряд. */

const P = {
  A4: 440.00, B4: 493.88, Cs5: 554.37, E5: 659.25, Fs5: 739.99,
  A5: 880.00, B5: 987.77, Cs6: 1108.73, E6: 1318.51, Fs6: 1479.98, A6: 1760.00,
};

// Подъём по пентатонике: чем больше подходов подряд, тем выше нота. Простая
// механика, но именно она превращает рутину в «серию» на слух.
const CLIMB = [P.A4, P.B4, P.Cs5, P.E5, P.Fs5, P.A5, P.B5, P.Cs6, P.E6];

const SOUNDS = {
  // Подход записан — рабочая лошадка, звучит десятки раз за тренировку.
  set: (opts = {}) => {
    const step = Math.min(CLIMB.length - 1, Math.max(0, opts.index ?? 0));
    const note = CLIMB[step];
    thud({ gain: 0.3 });
    tone({ freq: note, dur: 0.16, type: "triangle", gain: 0.42 });
    tone({ freq: note * 2, dur: 0.1, type: "sine", gain: 0.12, delay: 0.008 });
  },

  // Цель взята — светлое трезвучие вверх, без пафоса: тренировка продолжается.
  goal: () => {
    [P.A5, P.Cs6, P.E6].forEach((f, i) => {
      tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.34, delay: i * 0.075 });
    });
    tone({ freq: P.A6, dur: 0.3, type: "sine", gain: 0.1, delay: 0.16 });
  },

  // Тренировка закрыта с целью — короткая фанфара.
  finish: () => {
    [P.A4, P.Cs5, P.E5, P.A5].forEach((f, i) => {
      tone({ freq: f, dur: 0.26, type: "triangle", gain: 0.36, delay: i * 0.07 });
    });
    tone({ freq: P.A5, dur: 0.5, type: "sine", gain: 0.12, delay: 0.24 });
  },

  // Личный рекорд — та же фанфара плюс «искры» сверху.
  record: () => {
    SOUNDS.finish();
    [P.E6, P.A6, P.Fs6, P.A6].forEach((f, i) => {
      tone({ freq: f, dur: 0.16, type: "sine", gain: 0.14, delay: 0.3 + i * 0.055 });
    });
  },

  // Закончил раньше цели. Тёплое и нейтральное: не наказываем за честность.
  partial: () => {
    tone({ freq: P.E5, dur: 0.2, type: "sine", gain: 0.3 });
    tone({ freq: P.Cs5, dur: 0.3, type: "sine", gain: 0.26, delay: 0.1 });
  },

  // Отдых закончился — мягкое «пора».
  restDone: () => {
    tone({ freq: P.Cs5, dur: 0.18, type: "triangle", gain: 0.3 });
    tone({ freq: P.Fs5, dur: 0.26, type: "triangle", gain: 0.28, delay: 0.11 });
  },

  // Последние секунды отдыха — тихий отсчёт, чтобы собраться.
  tick: () => {
    tone({ freq: P.A5, dur: 0.05, type: "sine", gain: 0.14, attack: 0.002 });
  },

  // Порог серии — быстрый пробег вверх.
  milestone: () => {
    [P.A4, P.B4, P.Cs5, P.E5, P.Fs5, P.A5].forEach((f, i) => {
      tone({ freq: f, dur: 0.18, type: "triangle", gain: 0.3, delay: i * 0.055 });
    });
    [P.Cs6, P.E6].forEach((f, i) => {
      tone({ freq: f, dur: 0.4, type: "sine", gain: 0.16, delay: 0.33 + i * 0.07 });
    });
  },

  // Нажатие: почти на грани слышимости, чтобы не надоесть.
  tap: () => {
    tone({ freq: P.E5, dur: 0.04, type: "sine", gain: 0.1, attack: 0.002 });
  },

  // Удаление и возврат.
  erase: () => {
    tone({ freq: P.E5, dur: 0.16, type: "sine", gain: 0.22, sweepTo: P.A4 });
  },
  undo: () => {
    tone({ freq: P.A4, dur: 0.16, type: "sine", gain: 0.22, sweepTo: P.E5 });
  },
};

/**
 * @param {"set"|"goal"|"finish"|"record"|"partial"|"restDone"|"tick"|"milestone"|"tap"|"erase"|"undo"} name
 */
export function playSound(name, opts) {
  if (!SOUNDS[name]) return;
  if (!ready()) return;
  try {
    SOUNDS[name](opts);
  } catch {
    /* сессия отвалилась — звук не критичен, молчим */
  }
}

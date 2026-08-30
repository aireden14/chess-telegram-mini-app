// Визуальные эффекты: конфетти на победе, анимация чисел, кольцо прогресса.
// Всё считается вручную на canvas/SVG — никаких сторонних библиотек,
// приложение остаётся одним переносимым набором файлов.

let confettiEnabled = true;
export function setConfettiEnabled(value) {
  confettiEnabled = Boolean(value);
}

const reduceMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/* ------------------------------------------------------------- конфетти */

let canvas = null;
let ctx = null;
let particles = [];
let raf = 0;
let sweepTimer = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function tick() {
  raf = 0;
  if (!ctx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  particles = particles.filter((p) => p.life > 0 && p.y < h + 60);
  particles.forEach((p) => {
    p.vy += 0.34;           // гравитация
    p.vx *= 0.994;
    p.x += p.vx;
    p.y += p.vy;
    p.spin += p.spinSpeed;
    p.life -= 1;

    const alpha = Math.max(0, Math.min(1, p.life / 26));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  if (particles.length > 0) raf = requestAnimationFrame(tick);
  else ctx.clearRect(0, 0, w, h);
}

export function confetti({ colors = ["#ff4d6d", "#ffb340", "#4aa4ff", "#3ddcac", "#ffffff"], power = 1 } = {}) {
  if (!confettiEnabled || reduceMotion()) return;
  ensureCanvas();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = Math.round(70 * power);

  // Два источника по нижним углам — салют «вверх и внутрь», а не дождь сверху.
  [[w * 0.12, h * 0.92, 1], [w * 0.88, h * 0.92, -1]].forEach(([ox, oy, dir]) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (-Math.PI / 2) + dir * (Math.random() * 0.62 - 0.06);
      const speed = 10 + Math.random() * 13;
      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed * dir * -1 + dir * 2.4,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 8,
        color: colors[(Math.random() * colors.length) | 0],
        shape: Math.random() > 0.35 ? "rect" : "dot",
        spin: Math.random() * Math.PI,
        spinSpeed: (Math.random() - 0.5) * 0.3,
        life: 90 + Math.random() * 60,
      });
    }
  });

  if (!raf) raf = requestAnimationFrame(tick);

  // requestAnimationFrame замирает, когда приложение свёрнуто. Без страховки
  // вернувшийся пользователь увидел бы конфетти, застывшее в воздухе.
  clearTimeout(sweepTimer);
  sweepTimer = setTimeout(() => {
    particles = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }, 5000);
}

/* --------------------------------------------------------- анимация числа */

export function countUp(node, to, { from = 0, duration = 700 } = {}) {
  if (!node) return;
  if (reduceMotion() || duration <= 0) {
    node.textContent = String(to);
    return;
  }
  const start = performance.now();
  const delta = to - from;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    // easeOutExpo — быстро стартует, мягко замирает, как счётчики в iOS.
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t);
    node.textContent = String(Math.round(from + delta * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ------------------------------------------------------- кольцо прогресса */

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

export function ringSvg(progress, { accent = "var(--accent-1)", track = "rgba(255,255,255,.09)" } = {}) {
  const p = Math.max(0, Math.min(1, progress));
  return `
    <svg class="ring" viewBox="0 0 128 128" aria-hidden="true">
      <circle class="ring-track" cx="64" cy="64" r="${RING_R}" stroke="${track}" />
      <circle class="ring-value" cx="64" cy="64" r="${RING_R}" stroke="${accent}"
        stroke-dasharray="${RING_C.toFixed(2)}"
        stroke-dashoffset="${(RING_C * (1 - p)).toFixed(2)}" />
    </svg>`;
}

export function setRingProgress(root, progress) {
  const el = root?.querySelector(".ring-value");
  if (!el) return;
  const p = Math.max(0, Math.min(1, progress));
  el.style.strokeDashoffset = String(RING_C * (1 - p));
}

/* ------------------------------------------------------------ мелочи UI */

// Короткий «пульс» элемента — подтверждение нажатия без звука.
export function pulse(node, className = "is-pulse") {
  if (!node || reduceMotion()) return;
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  node.addEventListener("animationend", () => node.classList.remove(className), { once: true });
}

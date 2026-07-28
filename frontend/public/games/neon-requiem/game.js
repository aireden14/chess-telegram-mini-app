(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d", { alpha: false });
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var W = 0;
  var H = 0;
  var TAU = Math.PI * 2;
  var SAVE_KEY = "gamepass.neon-requiem.v1";

  var ui = {};
  [
    "hud", "missionLabel", "objectiveLabel", "score", "combo", "hearts", "ammo",
    "soundBtn", "pauseBtn", "alertBanner", "toast", "touchControls", "moveStick",
    "aimStick", "dashBtn", "meleeBtn", "reloadBtn", "menu", "missionGrid",
    "startBtn", "helpBtn", "newsBtn", "menuSoundBtn", "helpModal", "newsModal",
    "missionIntro", "introNumber", "introTitle", "introObjective", "pauseModal",
    "resumeBtn", "restartBtn", "quitBtn", "deathModal", "deathStats",
    "deathRestartBtn", "deathMenuBtn", "resultModal", "resultTitle", "resultRank",
    "resultScore", "resultTime", "resultCombo", "newRecord", "nextBtn",
    "resultReplayBtn", "resultMenuBtn"
  ].forEach(function (id) {
    ui[id] = document.getElementById(id);
  });

  function wall(x, y, w, h) {
    return { x: x, y: y, w: w, h: h };
  }

  function prop(x, y, w, h, type, hue) {
    return { x: x, y: y, w: w, h: h, type: type, hue: hue || 190 };
  }

  function guard(x, y, angle, patrol) {
    return { x: x, y: y, angle: angle || 0, kind: "guard", patrol: patrol || [] };
  }

  function gunner(x, y, angle, patrol) {
    return { x: x, y: y, angle: angle || 0, kind: "gunner", patrol: patrol || [] };
  }

  function brute(x, y, angle, patrol) {
    return { x: x, y: y, angle: angle || 0, kind: "brute", patrol: patrol || [] };
  }

  var MISSIONS = [
    {
      id: "club-404",
      number: "КОНТРАКТ 01",
      title: "Клуб 404",
      subtitle: "Неоновый подвал · 7 целей",
      objective: "Курьер прячется в VIP-зале. Зачисти клуб и уйди через кухню.",
      color: "#ff174f",
      accent: "#00f0ff",
      bpm: 112,
      par: 92,
      width: 1780,
      height: 1120,
      start: { x: 140, y: 850 },
      exit: { x: 1630, y: 170, r: 54 },
      walls: [
        wall(0, 0, 1780, 42), wall(0, 1078, 1780, 42),
        wall(0, 0, 42, 1120), wall(1738, 0, 42, 1120),
        wall(420, 42, 36, 280), wall(420, 440, 36, 638),
        wall(820, 42, 36, 170), wall(820, 330, 36, 410), wall(820, 850, 36, 228),
        wall(1230, 42, 36, 310), wall(1230, 468, 36, 610),
        wall(42, 330, 230, 34), wall(392, 330, 428, 34),
        wall(856, 740, 220, 34), wall(1196, 740, 542, 34)
      ],
      props: [
        prop(104, 118, 220, 78, "sofa", 330), prop(514, 112, 230, 64, "bar", 190),
        prop(510, 560, 180, 104, "table", 42), prop(930, 116, 190, 92, "dance", 330),
        prop(1320, 90, 290, 92, "sofa", 190), prop(1350, 875, 230, 78, "bar", 42),
        prop(930, 900, 100, 100, "plant", 120), prop(85, 955, 92, 92, "plant", 120)
      ],
      enemies: [
        guard(280, 220, 1.1, [[180, 220], [340, 220]]),
        gunner(640, 245, 2.7, [[520, 245], [735, 245]]),
        guard(620, 720, -1.4, [[620, 520], [620, 870]]),
        guard(1030, 500, 0, [[930, 500], [1140, 500]]),
        gunner(1460, 580, Math.PI, [[1340, 580], [1630, 580]]),
        brute(1060, 930, -1.6, [[960, 930], [1160, 930]]),
        gunner(1500, 200, 2.5, [[1360, 200], [1610, 200]])
      ]
    },
    {
      id: "mirage-motel",
      number: "КОНТРАКТ 02",
      title: "Мотель «Мираж»",
      subtitle: "Трасса 7 · 10 целей",
      objective: "Свидетель занял номер 13. Пройди двор, оба крыла и закрой контракт.",
      color: "#9d4edd",
      accent: "#ff9e00",
      bpm: 124,
      par: 128,
      width: 2080,
      height: 1320,
      start: { x: 170, y: 660 },
      exit: { x: 1900, y: 1120, r: 58 },
      walls: [
        wall(0, 0, 2080, 44), wall(0, 1276, 2080, 44),
        wall(0, 0, 44, 1320), wall(2036, 0, 44, 1320),
        wall(400, 44, 38, 450), wall(400, 618, 38, 658),
        wall(820, 44, 38, 260), wall(820, 426, 38, 430), wall(820, 978, 38, 298),
        wall(1260, 44, 38, 440), wall(1260, 605, 38, 671),
        wall(1640, 44, 38, 260), wall(1640, 430, 38, 480), wall(1640, 1030, 38, 246),
        wall(44, 330, 245, 34), wall(410, 330, 410, 34),
        wall(858, 856, 260, 34), wall(1240, 856, 400, 34),
        wall(1298, 520, 235, 34), wall(1652, 520, 384, 34)
      ],
      props: [
        prop(110, 160, 200, 86, "car", 190), prop(500, 120, 210, 82, "bed", 330),
        prop(500, 720, 205, 82, "bed", 280), prop(910, 555, 190, 96, "pool", 190),
        prop(930, 1030, 210, 82, "bed", 35), prop(1360, 168, 180, 74, "bed", 330),
        prop(1760, 180, 180, 82, "car", 42), prop(1740, 680, 190, 74, "bed", 190),
        prop(1380, 1040, 150, 92, "table", 280), prop(190, 980, 86, 86, "plant", 120)
      ],
      enemies: [
        guard(290, 520, 1.2, [[150, 520], [330, 520]]),
        gunner(620, 260, 1.7, [[520, 260], [730, 260]]),
        guard(620, 560, -1.1, [[520, 560], [720, 560]]),
        brute(620, 1030, -1.8, [[520, 1030], [730, 1030]]),
        gunner(1040, 300, 2.4, [[930, 300], [1160, 300]]),
        guard(1040, 730, .4, [[930, 730], [1160, 730]]),
        gunner(1440, 420, -1.2, [[1370, 340], [1540, 450]]),
        guard(1470, 740, 2.2, [[1370, 740], [1560, 740]]),
        gunner(1840, 650, Math.PI, [[1740, 650], [1950, 650]]),
        brute(1840, 1080, Math.PI, [[1730, 1080], [1950, 1080]])
      ]
    },
    {
      id: "helios-tower",
      number: "КОНТРАКТ 03",
      title: "Башня «Гелиос»",
      subtitle: "Пентхаус · 13 целей",
      objective: "Поднимись на последний этаж. Отключи охрану и останови Архитектора.",
      color: "#00f0ff",
      accent: "#ff174f",
      bpm: 136,
      par: 165,
      width: 2280,
      height: 1420,
      start: { x: 180, y: 1220 },
      exit: { x: 2100, y: 160, r: 62 },
      walls: [
        wall(0, 0, 2280, 46), wall(0, 1374, 2280, 46),
        wall(0, 0, 46, 1420), wall(2234, 0, 46, 1420),
        wall(460, 46, 40, 300), wall(460, 475, 40, 510), wall(460, 1110, 40, 264),
        wall(920, 46, 40, 520), wall(920, 690, 40, 684),
        wall(1400, 46, 40, 265), wall(1400, 440, 40, 520), wall(1400, 1080, 40, 294),
        wall(1840, 46, 40, 475), wall(1840, 650, 40, 724),
        wall(46, 370, 270, 36), wall(440, 370, 480, 36),
        wall(960, 650, 240, 36), wall(1320, 650, 520, 36),
        wall(500, 1020, 280, 36), wall(900, 1020, 500, 36),
        wall(1440, 990, 240, 36), wall(1800, 990, 434, 36)
      ],
      props: [
        prop(120, 1080, 220, 90, "elevator", 190), prop(580, 150, 220, 82, "sofa", 330),
        prop(590, 720, 190, 98, "server", 190), prop(1040, 160, 200, 102, "table", 42),
        prop(1050, 790, 210, 96, "server", 280), prop(1510, 120, 210, 84, "bar", 190),
        prop(1530, 760, 190, 108, "dance", 330), prop(1970, 740, 170, 92, "server", 0),
        prop(1960, 210, 190, 112, "throne", 42), prop(610, 1200, 90, 90, "plant", 120)
      ],
      enemies: [
        guard(300, 930, -1, [[170, 930], [380, 930]]),
        gunner(700, 1240, Math.PI, [[580, 1240], [820, 1240]]),
        guard(690, 500, -1.4, [[580, 500], [820, 500]]),
        gunner(690, 260, 2.7, [[580, 260], [820, 260]]),
        brute(1110, 1180, -1.8, [[1020, 1180], [1300, 1180]]),
        gunner(1130, 520, .7, [[1030, 520], [1290, 520]]),
        guard(1130, 820, 2.5, [[1030, 820], [1300, 820]]),
        gunner(1580, 1180, -2.2, [[1510, 1180], [1740, 1180]]),
        guard(1600, 560, 1.9, [[1510, 560], [1740, 560]]),
        brute(1600, 300, .7, [[1500, 300], [1740, 300]]),
        gunner(2050, 1160, Math.PI, [[1940, 1160], [2160, 1160]]),
        guard(2050, 600, 2.8, [[1940, 600], [2160, 600]]),
        { x: 2060, y: 250, angle: Math.PI, kind: "boss", patrol: [[1980, 250], [2140, 250]] }
      ]
    }
  ];

  var save = {
    unlocked: 1,
    bestScores: [0, 0, 0],
    bestRanks: ["", "", ""],
    sound: true
  };

  try {
    var stored = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (stored && typeof stored === "object") {
      save.unlocked = Math.max(1, Math.min(MISSIONS.length, Number(stored.unlocked) || 1));
      if (Array.isArray(stored.bestScores)) save.bestScores = stored.bestScores.slice(0, 3);
      if (Array.isArray(stored.bestRanks)) save.bestRanks = stored.bestRanks.slice(0, 3);
      if (typeof stored.sound === "boolean") save.sound = stored.sound;
    }
  } catch (_) {}

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_) {}
  }

  var state = {
    mode: "menu",
    missionIndex: 0,
    world: null,
    player: null,
    enemies: [],
    bullets: [],
    particles: [],
    corpses: [],
    pickups: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    elapsed: 0,
    damageTaken: 0,
    shake: 0,
    flash: 0,
    introTimer: 0,
    exitReady: false,
    toastTimer: 0,
    camera: { x: 0, y: 0 },
    lastFrame: performance.now()
  };

  var keys = Object.create(null);
  var mouse = { x: 0, y: 0, down: false, active: false };
  var moveInput = { x: 0, y: 0 };
  var aimInput = { x: 1, y: 0, firing: false };
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function normalize(x, y) {
    var length = Math.hypot(x, y);
    return length > 0.0001 ? { x: x / length, y: y / length, length: length } : { x: 0, y: 0, length: 0 };
  }

  function angleDelta(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () {
    window.setTimeout(resize, 120);
  });
  resize();

  function show(element, visible) {
    element.classList.toggle("hidden", !visible);
  }

  function formatScore(value) {
    return String(Math.max(0, Math.round(value))).padStart(6, "0");
  }

  function formatTime(seconds) {
    var total = Math.max(0, Math.floor(seconds));
    return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
  }

  function renderMissionCards() {
    ui.missionGrid.innerHTML = "";
    MISSIONS.forEach(function (mission, index) {
      var locked = index >= save.unlocked;
      var card = document.createElement("button");
      card.className = "mission-card" + (index === state.missionIndex ? " selected" : "") + (locked ? " locked" : "");
      card.style.setProperty("--mission", mission.color);
      card.disabled = locked;
      var best = save.bestScores[index] || 0;
      card.innerHTML =
        "<small>" + (locked ? "ЗАКРЫТО" : mission.number) + "</small>" +
        "<strong>" + mission.title + "</strong>" +
        "<em>" + (locked ? "Заверши предыдущий контракт" : mission.subtitle + (best ? " · " + save.bestRanks[index] + " / " + formatScore(best) : "")) + "</em>";
      card.addEventListener("click", function () {
        state.missionIndex = index;
        renderMissionCards();
        sfx("tick");
      });
      ui.missionGrid.appendChild(card);
    });
  }

  function syncSoundButtons() {
    ui.menuSoundBtn.textContent = save.sound ? "Музыка: вкл" : "Музыка: выкл";
    ui.soundBtn.textContent = save.sound ? "♫" : "×";
    ui.soundBtn.setAttribute("aria-label", save.sound ? "Выключить музыку" : "Включить музыку");
    if (audio.master && audio.ctx) {
      audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
      audio.master.gain.setTargetAtTime(save.sound ? 0.78 : 0, audio.ctx.currentTime, 0.025);
    }
  }

  function closeAllOverlays() {
    [ui.menu, ui.helpModal, ui.newsModal, ui.missionIntro, ui.pauseModal, ui.deathModal, ui.resultModal].forEach(function (element) {
      show(element, false);
    });
  }

  function showMenu() {
    state.mode = "menu";
    closeAllOverlays();
    show(ui.menu, true);
    show(ui.hud, false);
    show(ui.touchControls, false);
    show(ui.alertBanner, false);
    show(ui.toast, false);
    renderMissionCards();
    syncSoundButtons();
    setMusicMood("menu");
  }

  function cloneMission(index) {
    var mission = MISSIONS[index];
    return {
      id: mission.id,
      number: mission.number,
      title: mission.title,
      subtitle: mission.subtitle,
      objective: mission.objective,
      color: mission.color,
      accent: mission.accent,
      bpm: mission.bpm,
      par: mission.par,
      width: mission.width,
      height: mission.height,
      start: { x: mission.start.x, y: mission.start.y },
      exit: { x: mission.exit.x, y: mission.exit.y, r: mission.exit.r },
      walls: mission.walls.map(function (item) { return Object.assign({}, item); }),
      props: mission.props.map(function (item) { return Object.assign({}, item); })
    };
  }

  function createEnemy(template, index) {
    var hp = template.kind === "boss" ? 6 : template.kind === "brute" ? 2 : 1;
    return {
      id: index,
      x: template.x,
      y: template.y,
      angle: template.angle,
      kind: template.kind,
      patrol: (template.patrol || []).map(function (point) { return point.slice(); }),
      patrolIndex: 0,
      state: "patrol",
      hp: hp,
      maxHp: hp,
      radius: template.kind === "boss" ? 26 : template.kind === "brute" ? 22 : 17,
      cooldown: random(.2, 1.1),
      hitFlash: 0,
      alive: true,
      alertPulse: 0,
      step: random(0, TAU),
      strafe: Math.random() < .5 ? -1 : 1
    };
  }

  function startMission(index) {
    index = clamp(index, 0, save.unlocked - 1);
    state.missionIndex = index;
    state.world = cloneMission(index);
    var mission = MISSIONS[index];
    state.player = {
      x: mission.start.x,
      y: mission.start.y,
      radius: 17,
      angle: 0,
      hp: 3,
      maxHp: 3,
      ammo: 8,
      magazine: 8,
      fireCooldown: 0,
      meleeCooldown: 0,
      meleeTime: 0,
      reloadTime: 0,
      dashTime: 0,
      dashCooldown: 0,
      dashX: 1,
      dashY: 0,
      invulnerable: 0,
      alive: true,
      moving: false
    };
    state.enemies = mission.enemies.map(createEnemy);
    state.bullets = [];
    state.particles = [];
    state.corpses = [];
    state.pickups = [];
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.comboTimer = 0;
    state.elapsed = 0;
    state.damageTaken = 0;
    state.shake = 0;
    state.flash = 0;
    state.exitReady = false;
    state.introTimer = 2.45;
    state.camera.x = clamp(state.player.x - W * .5, 0, Math.max(0, state.world.width - W));
    state.camera.y = clamp(state.player.y - H * .5, 0, Math.max(0, state.world.height - H));
    state.mode = "intro";
    closeAllOverlays();
    show(ui.missionIntro, true);
    show(ui.hud, false);
    show(ui.touchControls, false);
    ui.introNumber.textContent = mission.number;
    ui.introTitle.textContent = mission.title;
    ui.introObjective.textContent = mission.objective;
    updateHud();
    ensureAudio();
    setMusicMood("stealth");
    sfx("start");
  }

  function beginPlay() {
    state.mode = "playing";
    show(ui.missionIntro, false);
    show(ui.hud, true);
    show(ui.touchControls, coarsePointer);
    toast("УСТРАНИ ЦЕЛИ · НАЙДИ ВЫХОД", 2.8);
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    mouse.down = false;
    aimInput.firing = false;
    clearTouchInputs();
    show(ui.pauseModal, true);
    show(ui.touchControls, false);
    setMusicMood("paused");
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    ensureAudio();
    state.mode = "playing";
    show(ui.pauseModal, false);
    show(ui.touchControls, coarsePointer);
    setMusicMood(alertedEnemies() ? "alert" : "stealth");
    state.lastFrame = performance.now();
  }

  function toast(message, duration) {
    ui.toast.textContent = message;
    state.toastTimer = duration || 2;
    show(ui.toast, true);
  }

  function updateHud() {
    if (!state.player || !state.world) return;
    var alive = state.enemies.filter(function (enemy) { return enemy.alive; }).length;
    ui.missionLabel.textContent = state.world.number + " · " + state.world.title;
    ui.objectiveLabel.textContent = state.exitReady ? "ВЫХОД ОТКРЫТ" : "ЦЕЛЕЙ: " + alive;
    ui.score.textContent = formatScore(state.score);
    ui.combo.textContent = "ЦЕПЬ ×" + Math.max(1, comboMultiplier());
    ui.hearts.textContent = "♥".repeat(Math.max(0, state.player.hp)) + "♡".repeat(Math.max(0, state.player.maxHp - state.player.hp));
    if (state.player.reloadTime > 0) {
      ui.ammo.textContent = "ПЕРЕЗАРЯДКА";
    } else {
      ui.ammo.textContent = state.player.ammo + " / ∞";
    }
  }

  function comboMultiplier() {
    return Math.min(8, 1 + Math.floor(Math.max(0, state.combo - 1) / 2));
  }

  function alertedEnemies() {
    return state.enemies.some(function (enemy) {
      return enemy.alive && enemy.state === "alert";
    });
  }

  function rectCircleOverlap(rect, x, y, radius) {
    var nx = clamp(x, rect.x, rect.x + rect.w);
    var ny = clamp(y, rect.y, rect.y + rect.h);
    var dx = x - nx;
    var dy = y - ny;
    return dx * dx + dy * dy < radius * radius;
  }

  function blockers() {
    return state.world ? state.world.walls.concat(state.world.props) : [];
  }

  function circleBlocked(x, y, radius) {
    if (!state.world) return false;
    if (x - radius < 0 || y - radius < 0 || x + radius > state.world.width || y + radius > state.world.height) return true;
    var list = blockers();
    for (var i = 0; i < list.length; i += 1) {
      if (rectCircleOverlap(list[i], x, y, radius)) return true;
    }
    return false;
  }

  function moveActor(actor, dx, dy) {
    var moved = false;
    if (!circleBlocked(actor.x + dx, actor.y, actor.radius)) {
      actor.x += dx;
      moved = moved || Math.abs(dx) > .001;
    }
    if (!circleBlocked(actor.x, actor.y + dy, actor.radius)) {
      actor.y += dy;
      moved = moved || Math.abs(dy) > .001;
    }
    return moved;
  }

  function segmentIntersectsRect(x1, y1, x2, y2, rect) {
    var minX = rect.x;
    var maxX = rect.x + rect.w;
    var minY = rect.y;
    var maxY = rect.y + rect.h;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var t0 = 0;
    var t1 = 1;
    var p = [-dx, dx, -dy, dy];
    var q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];

    for (var i = 0; i < 4; i += 1) {
      if (Math.abs(p[i]) < .000001) {
        if (q[i] < 0) return false;
      } else {
        var ratio = q[i] / p[i];
        if (p[i] < 0) {
          if (ratio > t1) return false;
          if (ratio > t0) t0 = ratio;
        } else {
          if (ratio < t0) return false;
          if (ratio < t1) t1 = ratio;
        }
      }
    }
    return true;
  }

  function lineBlocked(x1, y1, x2, y2) {
    var list = blockers();
    for (var i = 0; i < list.length; i += 1) {
      if (segmentIntersectsRect(x1, y1, x2, y2, list[i])) return true;
    }
    return false;
  }

  function spawnParticles(x, y, color, count, speed) {
    for (var i = 0; i < count; i += 1) {
      var angle = random(0, TAU);
      var velocity = random(speed * .25, speed);
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random(.25, .8),
        maxLife: random(.55, .95),
        size: random(2, 6),
        color: color,
        drag: random(2.5, 5)
      });
    }
  }

  function raiseAlarmAt(x, y, radius) {
    state.enemies.forEach(function (enemy) {
      if (enemy.alive && distance(x, y, enemy.x, enemy.y) < radius) {
        enemy.state = "alert";
        enemy.alertPulse = .8;
      }
    });
  }

  function firePlayer() {
    var player = state.player;
    if (!player || !player.alive || state.mode !== "playing") return;
    if (player.reloadTime > 0 || player.fireCooldown > 0 || player.dashTime > 0) return;
    if (player.ammo <= 0) {
      reloadPlayer();
      sfx("empty");
      return;
    }

    player.ammo -= 1;
    player.fireCooldown = .17;
    var spread = random(-.018, .018);
    var angle = player.angle + spread;
    state.bullets.push({
      x: player.x + Math.cos(angle) * 24,
      y: player.y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * 980,
      vy: Math.sin(angle) * 980,
      life: 1.25,
      owner: "player",
      color: "#00f0ff",
      radius: 4
    });
    spawnParticles(player.x + Math.cos(angle) * 25, player.y + Math.sin(angle) * 25, "#ffd166", 4, 100);
    state.shake = Math.max(state.shake, 4);
    raiseAlarmAt(player.x, player.y, 760);
    sfx("shot");
    updateHud();
  }

  function reloadPlayer() {
    var player = state.player;
    if (!player || player.reloadTime > 0 || player.ammo === player.magazine || !player.alive) return;
    player.reloadTime = .72;
    sfx("reload");
  }

  function meleePlayer() {
    var player = state.player;
    if (!player || !player.alive || player.meleeCooldown > 0 || state.mode !== "playing") return;
    player.meleeCooldown = .43;
    player.meleeTime = .18;
    var hit = false;

    state.enemies.forEach(function (enemy) {
      if (!enemy.alive) return;
      var dx = enemy.x - player.x;
      var dy = enemy.y - player.y;
      var dist = Math.hypot(dx, dy);
      var targetAngle = Math.atan2(dy, dx);
      if (dist < 82 + enemy.radius && Math.abs(angleDelta(targetAngle, player.angle)) < 1.0 && !lineBlocked(player.x, player.y, enemy.x, enemy.y)) {
        damageEnemy(enemy, enemy.kind === "boss" ? 2 : 3, "melee");
        hit = true;
      }
    });

    for (var i = state.bullets.length - 1; i >= 0; i -= 1) {
      var bullet = state.bullets[i];
      if (bullet.owner !== "enemy") continue;
      var bd = distance(player.x, player.y, bullet.x, bullet.y);
      var ba = Math.atan2(bullet.y - player.y, bullet.x - player.x);
      if (bd < 92 && Math.abs(angleDelta(ba, player.angle)) < 1.15) {
        bullet.owner = "player";
        bullet.vx *= -1.18;
        bullet.vy *= -1.18;
        bullet.color = "#ffd166";
        bullet.life = .9;
        hit = true;
        state.score += 250;
      }
    }

    spawnParticles(
      player.x + Math.cos(player.angle) * 42,
      player.y + Math.sin(player.angle) * 42,
      hit ? "#ffd166" : "#ff174f",
      hit ? 12 : 6,
      180
    );
    state.shake = Math.max(state.shake, hit ? 8 : 3);
    sfx(hit ? "hit" : "swing");
  }

  function dashPlayer() {
    var player = state.player;
    if (!player || !player.alive || player.dashCooldown > 0 || state.mode !== "playing") return;
    var input = normalize(moveInput.x, moveInput.y);
    if (!input.length) input = { x: Math.cos(player.angle), y: Math.sin(player.angle), length: 1 };
    player.dashX = input.x;
    player.dashY = input.y;
    player.dashTime = .16;
    player.dashCooldown = .9;
    player.invulnerable = Math.max(player.invulnerable, .22);
    spawnParticles(player.x, player.y, "#00f0ff", 16, 210);
    state.shake = Math.max(state.shake, 5);
    sfx("dash");
  }

  function damageEnemy(enemy, amount, method) {
    if (!enemy.alive) return;
    enemy.hp -= amount;
    enemy.hitFlash = .12;
    enemy.state = "alert";
    enemy.alertPulse = .8;
    spawnParticles(enemy.x, enemy.y, enemy.kind === "boss" ? "#ffd166" : "#ff174f", 10, 220);
    if (enemy.hp <= 0) killEnemy(enemy, method);
    else sfx("armor");
  }

  function killEnemy(enemy, method) {
    enemy.alive = false;
    state.corpses.push({
      x: enemy.x,
      y: enemy.y,
      angle: enemy.angle,
      kind: enemy.kind,
      color: enemy.kind === "boss" ? "#ffd166" : "#9d153b"
    });

    if (state.comboTimer > 0) state.combo += 1;
    else state.combo = 1;
    state.comboTimer = 3.4;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    var base = enemy.kind === "boss" ? 6500 : enemy.kind === "brute" ? 1800 : enemy.kind === "gunner" ? 1300 : 1000;
    if (method === "melee") base += 450;
    state.score += base * comboMultiplier();
    state.shake = Math.max(state.shake, enemy.kind === "boss" ? 18 : 10);
    state.flash = Math.max(state.flash, enemy.kind === "boss" ? .34 : .12);
    spawnParticles(enemy.x, enemy.y, "#ff174f", enemy.kind === "boss" ? 42 : 24, enemy.kind === "boss" ? 420 : 290);

    if (Math.random() < .22 && state.player.hp < state.player.maxHp) {
      state.pickups.push({ x: enemy.x, y: enemy.y, type: "health", pulse: 0 });
    }

    var remaining = state.enemies.filter(function (item) { return item.alive; }).length;
    if (remaining === 0) {
      state.exitReady = true;
      toast("ЭТАЖ ЧИСТ · ДОБЕРИСЬ ДО ВЫХОДА", 3.2);
      setMusicMood("escape");
      sfx("clear");
    } else if (enemy.kind === "boss") {
      toast("АРХИТЕКТОР УСТРАНЁН", 2.4);
    }
    sfx(enemy.kind === "boss" ? "bossDown" : "kill");
    updateHud();
  }

  function damagePlayer(amount, sourceX, sourceY) {
    var player = state.player;
    if (!player || !player.alive || player.invulnerable > 0 || player.dashTime > 0) return;
    player.hp -= amount;
    player.invulnerable = 1.0;
    state.damageTaken += amount;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 15;
    state.flash = .36;
    var away = normalize(player.x - sourceX, player.y - sourceY);
    moveActor(player, away.x * 24, away.y * 24);
    spawnParticles(player.x, player.y, "#00f0ff", 24, 300);
    sfx("hurt");
    updateHud();
    if (player.hp <= 0) playerDeath();
  }

  function playerDeath() {
    state.player.alive = false;
    state.mode = "dead";
    mouse.down = false;
    aimInput.firing = false;
    show(ui.touchControls, false);
    window.setTimeout(function () {
      if (state.mode !== "dead") return;
      ui.deathStats.textContent = "Счёт " + formatScore(state.score) + " · время " + formatTime(state.elapsed) + " · лучшая цепь ×" + Math.max(1, state.bestCombo);
      show(ui.deathModal, true);
    }, 550);
    setMusicMood("dead");
    sfx("death");
  }

  function completeMission() {
    if (state.mode !== "playing") return;
    state.mode = "result";
    mouse.down = false;
    aimInput.firing = false;
    show(ui.touchControls, false);
    show(ui.alertBanner, false);
    setMusicMood("result");
    sfx("complete");

    var mission = MISSIONS[state.missionIndex];
    var timePenalty = Math.max(0, state.elapsed - mission.par) * 24;
    var performanceScore = state.score - timePenalty - state.damageTaken * 850;
    var maxTargets = mission.enemies.length;
    var rank = performanceScore >= maxTargets * 1500 ? "S" :
      performanceScore >= maxTargets * 1220 ? "A" :
      performanceScore >= maxTargets * 980 ? "B" :
      performanceScore >= maxTargets * 760 ? "C" : "D";
    var wasRecord = state.score > (save.bestScores[state.missionIndex] || 0);

    if (wasRecord) {
      save.bestScores[state.missionIndex] = state.score;
      save.bestRanks[state.missionIndex] = rank;
    }
    if (state.missionIndex + 1 < MISSIONS.length) {
      save.unlocked = Math.max(save.unlocked, state.missionIndex + 2);
    }
    persist();

    ui.resultTitle.textContent = state.missionIndex === MISSIONS.length - 1 ? "ГОРОД ЗАМОЛЧАЛ" : "ЧИСТАЯ РАБОТА";
    ui.resultRank.textContent = rank;
    ui.resultScore.textContent = formatScore(state.score);
    ui.resultTime.textContent = formatTime(state.elapsed);
    ui.resultCombo.textContent = "×" + Math.max(1, state.bestCombo);
    show(ui.newRecord, wasRecord);
    ui.nextBtn.textContent = state.missionIndex < MISSIONS.length - 1 ? "Следующий контракт" : "В меню";
    show(ui.resultModal, true);
  }

  function updatePlayer(dt) {
    var player = state.player;
    if (!player || !player.alive) return;

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.meleeCooldown = Math.max(0, player.meleeCooldown - dt);
    player.meleeTime = Math.max(0, player.meleeTime - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);

    if (player.reloadTime > 0) {
      player.reloadTime -= dt;
      if (player.reloadTime <= 0) {
        player.ammo = player.magazine;
        sfx("loaded");
        updateHud();
      }
    }

    var keyboardX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    var keyboardY = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    var mx = Math.abs(moveInput.x) > .05 ? moveInput.x : keyboardX;
    var my = Math.abs(moveInput.y) > .05 ? moveInput.y : keyboardY;
    var movement = normalize(mx, my);
    player.moving = movement.length > .1;

    if (mouse.active) {
      var worldPointer = screenToWorld(mouse.x, mouse.y);
      player.angle = Math.atan2(worldPointer.y - player.y, worldPointer.x - player.x);
    } else if (Math.hypot(aimInput.x, aimInput.y) > .2) {
      player.angle = Math.atan2(aimInput.y, aimInput.x);
    }

    if (player.dashTime > 0) {
      player.dashTime -= dt;
      moveActor(player, player.dashX * 820 * dt, player.dashY * 820 * dt);
      if (Math.random() < .8) {
        state.particles.push({
          x: player.x,
          y: player.y,
          vx: -player.dashX * random(40, 120),
          vy: -player.dashY * random(40, 120),
          life: .2,
          maxLife: .2,
          size: random(6, 12),
          color: "#00f0ff",
          drag: 6
        });
      }
    } else {
      var speed = 235;
      moveActor(player, movement.x * speed * dt, movement.y * speed * dt);
    }

    if ((mouse.down || aimInput.firing) && player.reloadTime <= 0) firePlayer();

    state.pickups.forEach(function (pickup) {
      if (pickup.dead) return;
      if (distance(player.x, player.y, pickup.x, pickup.y) < 34) {
        if (pickup.type === "health" && player.hp < player.maxHp) {
          player.hp += 1;
          pickup.dead = true;
          spawnParticles(pickup.x, pickup.y, "#65ff9b", 20, 220);
          toast("ЗДОРОВЬЕ ВОССТАНОВЛЕНО", 1.5);
          sfx("pickup");
          updateHud();
        }
      }
    });
    state.pickups = state.pickups.filter(function (pickup) { return !pickup.dead; });

    if (state.exitReady && distance(player.x, player.y, state.world.exit.x, state.world.exit.y) < state.world.exit.r + player.radius) {
      completeMission();
    }
  }

  function moveEnemyToward(enemy, tx, ty, speed, dt) {
    var direction = normalize(tx - enemy.x, ty - enemy.y);
    if (!direction.length) return;
    enemy.angle = Math.atan2(direction.y, direction.x);
    var dx = direction.x * speed * dt;
    var dy = direction.y * speed * dt;
    var beforeX = enemy.x;
    var beforeY = enemy.y;
    moveActor(enemy, dx, dy);

    if (Math.abs(enemy.x - beforeX) + Math.abs(enemy.y - beforeY) < speed * dt * .25) {
      var side = enemy.strafe;
      moveActor(enemy, -direction.y * speed * dt * side, direction.x * speed * dt * side);
      if (Math.random() < dt * 2) enemy.strafe *= -1;
    }
  }

  function enemyFire(enemy, angleOffset) {
    var angle = enemy.angle + (angleOffset || 0) + random(-.045, .045);
    var speed = enemy.kind === "boss" ? 610 : 520;
    state.bullets.push({
      x: enemy.x + Math.cos(angle) * (enemy.radius + 8),
      y: enemy.y + Math.sin(angle) * (enemy.radius + 8),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.55,
      owner: "enemy",
      color: enemy.kind === "boss" ? "#ffd166" : "#ff174f",
      radius: enemy.kind === "boss" ? 5 : 4
    });
  }

  function updateEnemies(dt) {
    var player = state.player;
    if (!player || !player.alive) return;

    state.enemies.forEach(function (enemy) {
      if (!enemy.alive) return;
      enemy.cooldown -= dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.alertPulse = Math.max(0, enemy.alertPulse - dt);
      enemy.step += dt * 4;

      var dx = player.x - enemy.x;
      var dy = player.y - enemy.y;
      var dist = Math.hypot(dx, dy);
      var targetAngle = Math.atan2(dy, dx);
      var visible = !lineBlocked(enemy.x, enemy.y, player.x, player.y);
      var inCone = Math.abs(angleDelta(targetAngle, enemy.angle)) < 1.08;
      var range = enemy.kind === "boss" ? 720 : enemy.kind === "gunner" ? 570 : 470;

      if (visible && ((dist < 112) || (dist < range && inCone))) {
        if (enemy.state !== "alert") {
          enemy.alertPulse = .9;
          sfx("alert");
        }
        enemy.state = "alert";
      }

      if (enemy.state === "patrol") {
        if (enemy.patrol.length) {
          var point = enemy.patrol[enemy.patrolIndex % enemy.patrol.length];
          if (distance(enemy.x, enemy.y, point[0], point[1]) < 18) {
            enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
            point = enemy.patrol[enemy.patrolIndex];
          }
          moveEnemyToward(enemy, point[0], point[1], enemy.kind === "brute" ? 72 : 82, dt);
        } else {
          enemy.angle += Math.sin(enemy.step * .35) * dt * .3;
        }
        return;
      }

      enemy.angle = targetAngle;
      var ranged = enemy.kind === "gunner" || enemy.kind === "boss";
      if (ranged) {
        if (dist > 330 || !visible) {
          moveEnemyToward(enemy, player.x, player.y, enemy.kind === "boss" ? 125 : 112, dt);
        } else if (dist < 175) {
          moveEnemyToward(enemy, enemy.x - dx, enemy.y - dy, enemy.kind === "boss" ? 118 : 104, dt);
        } else {
          moveActor(enemy, -Math.sin(targetAngle) * enemy.strafe * 55 * dt, Math.cos(targetAngle) * enemy.strafe * 55 * dt);
        }

        if (visible && dist < 610 && enemy.cooldown <= 0) {
          if (enemy.kind === "boss") {
            enemyFire(enemy, -.13);
            enemyFire(enemy, 0);
            enemyFire(enemy, .13);
            enemy.cooldown = .84;
          } else {
            enemyFire(enemy, 0);
            enemy.cooldown = random(.82, 1.18);
          }
          state.shake = Math.max(state.shake, 2);
          sfx("enemyShot");
        }
      } else {
        moveEnemyToward(enemy, player.x, player.y, enemy.kind === "brute" ? 172 : 152, dt);
        if (dist < enemy.radius + player.radius + 7 && enemy.cooldown <= 0) {
          damagePlayer(enemy.kind === "brute" ? 2 : 1, enemy.x, enemy.y);
          enemy.cooldown = enemy.kind === "brute" ? 1.45 : .95;
        }
      }
    });
  }

  function updateBullets(dt) {
    for (var i = state.bullets.length - 1; i >= 0; i -= 1) {
      var bullet = state.bullets[i];
      var ox = bullet.x;
      var oy = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      var hitWall = false;
      var list = blockers();
      for (var w = 0; w < list.length; w += 1) {
        if (segmentIntersectsRect(ox, oy, bullet.x, bullet.y, list[w])) {
          hitWall = true;
          break;
        }
      }

      if (hitWall || bullet.life <= 0) {
        if (hitWall) spawnParticles(bullet.x, bullet.y, bullet.color, 5, 120);
        state.bullets.splice(i, 1);
        continue;
      }

      if (bullet.owner === "player") {
        var enemyHit = null;
        for (var e = 0; e < state.enemies.length; e += 1) {
          var enemy = state.enemies[e];
          if (!enemy.alive) continue;
          if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.radius + bullet.radius) {
            enemyHit = enemy;
            break;
          }
        }
        if (enemyHit) {
          damageEnemy(enemyHit, 1, "shot");
          state.bullets.splice(i, 1);
        }
      } else if (state.player && state.player.alive && distance(bullet.x, bullet.y, state.player.x, state.player.y) < state.player.radius + bullet.radius) {
        damagePlayer(1, ox, oy);
        state.bullets.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    state.particles.forEach(function (particle) {
      particle.life -= dt;
      var damping = Math.exp(-particle.drag * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    });
    state.particles = state.particles.filter(function (particle) { return particle.life > 0; });
    state.pickups.forEach(function (pickup) {
      pickup.pulse += dt * 5;
    });
  }

  function update(dt) {
    if (state.mode === "intro") {
      state.introTimer -= dt;
      if (state.introTimer <= 0) beginPlay();
      return;
    }
    if (state.mode !== "playing") return;

    state.elapsed += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        updateHud();
      }
    }
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) show(ui.toast, false);
    }
    state.shake = Math.max(0, state.shake - dt * 28);
    state.flash = Math.max(0, state.flash - dt * 1.7);

    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateParticles(dt);
    updateCamera(dt);

    var alert = alertedEnemies();
    show(ui.alertBanner, alert && !state.exitReady);
    if (!state.exitReady) setMusicMood(alert ? "alert" : "stealth");
  }

  function updateCamera(dt) {
    var player = state.player;
    if (!player || !state.world) return;
    var leadX = Math.cos(player.angle) * Math.min(105, W * .13);
    var leadY = Math.sin(player.angle) * Math.min(85, H * .11);
    var targetX = clamp(player.x - W * .5 + leadX, 0, Math.max(0, state.world.width - W));
    var targetY = clamp(player.y - H * .5 + leadY, 0, Math.max(0, state.world.height - H));
    var follow = 1 - Math.exp(-dt * 7);
    state.camera.x = lerp(state.camera.x, targetX, follow);
    state.camera.y = lerp(state.camera.y, targetY, follow);
  }

  function screenToWorld(x, y) {
    return { x: x + state.camera.x, y: y + state.camera.y };
  }

  function drawAttract(time) {
    var gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#080318");
    gradient.addColorStop(.52, "#100521");
    gradient.addColorStop(1, "#02030d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = .24;
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1;
    var horizon = H * .4;
    for (var i = -10; i <= 10; i += 1) {
      ctx.beginPath();
      ctx.moveTo(W * .5, horizon);
      ctx.lineTo(W * .5 + i * W * .13, H);
      ctx.stroke();
    }
    for (var y = 0; y < 14; y += 1) {
      var p = (y / 14 + (time * .08) % (1 / 14)) % 1;
      var yy = horizon + Math.pow(p, 1.8) * (H - horizon);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy);
      ctx.stroke();
    }
    ctx.restore();

    for (var r = 0; r < 42; r += 1) {
      var rx = (r * 139.7 + time * (18 + r % 7)) % (W + 80) - 40;
      var ry = (r * 83.3 + time * (38 + r % 9)) % (H + 120) - 60;
      ctx.strokeStyle = r % 3 ? "rgba(0,240,255,.17)" : "rgba(255,23,79,.22)";
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 12, ry + 38);
      ctx.stroke();
    }
  }

  function drawWorld(time) {
    if (!state.world) {
      drawAttract(time);
      return;
    }

    var shakeX = state.shake ? random(-state.shake, state.shake) : 0;
    var shakeY = state.shake ? random(-state.shake, state.shake) : 0;
    ctx.save();
    ctx.translate(-state.camera.x + shakeX, -state.camera.y + shakeY);

    var palette = state.missionIndex === 0
      ? ["#15091d", "#1e0d25", "#35102b"]
      : state.missionIndex === 1
        ? ["#130d22", "#24122d", "#32192c"]
        : ["#06131d", "#0b1b26", "#152533"];

    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, state.world.width, state.world.height);

    var tile = 64;
    var startX = Math.max(0, Math.floor(state.camera.x / tile) * tile);
    var startY = Math.max(0, Math.floor(state.camera.y / tile) * tile);
    var endX = Math.min(state.world.width, state.camera.x + W + tile);
    var endY = Math.min(state.world.height, state.camera.y + H + tile);
    for (var x = startX; x < endX; x += tile) {
      for (var y = startY; y < endY; y += tile) {
        ctx.fillStyle = ((x / tile + y / tile) % 2) ? palette[1] : palette[0];
        ctx.fillRect(x, y, tile, tile);
        ctx.strokeStyle = "rgba(255,255,255,.022)";
        ctx.strokeRect(x + .5, y + .5, tile - 1, tile - 1);
      }
    }

    drawExit(time);

    state.corpses.forEach(drawCorpse);
    state.world.props.forEach(drawProp);
    state.world.walls.forEach(drawWall);
    state.pickups.forEach(drawPickup);
    state.enemies.forEach(function (enemy) {
      if (enemy.alive) drawVision(enemy);
    });
    state.bullets.forEach(drawBullet);
    state.enemies.forEach(function (enemy) {
      if (enemy.alive) drawEnemy(enemy, time);
    });
    if (state.player) drawPlayer(state.player, time);
    state.particles.forEach(drawParticle);

    ctx.restore();
    drawLighting();
    drawCrosshair();

    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255,23,79," + (state.flash * .32) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawExit(time) {
    var exit = state.world.exit;
    var pulse = .55 + Math.sin(time * 6) * .2;
    ctx.save();
    ctx.translate(exit.x, exit.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = state.exitReady ? "rgba(0,240,255," + (.16 + pulse * .12) + ")" : "rgba(255,23,79,.055)";
    ctx.strokeStyle = state.exitReady ? "#00f0ff" : "rgba(255,23,79,.2)";
    ctx.lineWidth = state.exitReady ? 4 : 2;
    ctx.shadowColor = state.exitReady ? "#00f0ff" : "#ff174f";
    ctx.shadowBlur = state.exitReady ? 26 : 8;
    ctx.fillRect(-36, -36, 72, 72);
    ctx.strokeRect(-36, -36, 72, 72);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = state.exitReady ? "#dffeff" : "rgba(255,255,255,.25)";
    ctx.font = "900 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(state.exitReady ? "ВЫХОД" : "ЗАКРЫТО", 0, 4);
    ctx.restore();
  }

  function drawWall(item) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#050611";
    ctx.fillRect(item.x, item.y, item.w, item.h);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    var gradient = ctx.createLinearGradient(item.x, item.y, item.x, item.y + Math.min(28, item.h));
    gradient.addColorStop(0, "rgba(255,255,255,.16)");
    gradient.addColorStop(1, "rgba(255,255,255,.025)");
    ctx.fillStyle = gradient;
    ctx.fillRect(item.x, item.y, item.w, Math.min(18, item.h));
    ctx.strokeStyle = state.world.accent + "44";
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x + 1, item.y + 1, item.w - 2, item.h - 2);
    ctx.restore();
  }

  function drawProp(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.shadowColor = "hsla(" + item.hue + ",100%,60%,.4)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "hsla(" + item.hue + ",55%,18%,.92)";
    ctx.strokeStyle = "hsla(" + item.hue + ",100%,72%,.55)";
    ctx.lineWidth = 2;
    var radius = Math.min(16, item.w * .16, item.h * .16);
    roundRect(ctx, 0, 0, item.w, item.h, radius);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (item.type === "plant") {
      ctx.fillStyle = "#153b2a";
      ctx.beginPath();
      ctx.arc(item.w / 2, item.h / 2, Math.min(item.w, item.h) * .3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#68ff9a";
      for (var i = 0; i < 8; i += 1) {
        var a = i / 8 * TAU;
        ctx.beginPath();
        ctx.moveTo(item.w / 2, item.h / 2);
        ctx.lineTo(item.w / 2 + Math.cos(a) * item.w * .34, item.h / 2 + Math.sin(a) * item.h * .34);
        ctx.stroke();
      }
    } else if (item.type === "dance" || item.type === "pool") {
      var cols = 5;
      var rows = 3;
      for (var cx = 0; cx < cols; cx += 1) {
        for (var cy = 0; cy < rows; cy += 1) {
          ctx.fillStyle = ((cx + cy) % 2) ? "rgba(255,23,79,.22)" : "rgba(0,240,255,.2)";
          ctx.fillRect(8 + cx * (item.w - 16) / cols, 8 + cy * (item.h - 16) / rows, (item.w - 20) / cols, (item.h - 20) / rows);
        }
      }
    } else if (item.type === "server") {
      for (var sy = 12; sy < item.h - 8; sy += 15) {
        ctx.fillStyle = sy % 30 ? "#00f0ff" : "#ff174f";
        ctx.fillRect(11, sy, item.w - 22, 3);
      }
    } else if (item.type === "car") {
      ctx.fillStyle = "rgba(255,255,255,.13)";
      roundRect(ctx, item.w * .18, item.h * .18, item.w * .64, item.h * .64, 12);
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.strokeRect(10, 10, item.w - 20, item.h - 20);
    }
    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawVision(enemy) {
    if (enemy.state === "alert") return;
    var radius = enemy.kind === "gunner" ? 540 : 440;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    var gradient = ctx.createRadialGradient(0, 0, 20, 0, 0, radius);
    gradient.addColorStop(0, "rgba(255,209,102,.12)");
    gradient.addColorStop(1, "rgba(255,209,102,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -1.02, 1.02);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    var color = enemy.kind === "boss" ? "#ffd166" : enemy.kind === "brute" ? "#ff7b00" : enemy.kind === "gunner" ? "#ff174f" : "#ff527f";
    if (enemy.hitFlash > 0) color = "#ffffff";
    ctx.shadowColor = color;
    ctx.shadowBlur = enemy.state === "alert" ? 14 : 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#160512";
    ctx.beginPath();
    ctx.arc(5, 0, enemy.radius * .58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(7, -4, enemy.radius + (enemy.kind === "boss" ? 14 : 8), 8);
    if (enemy.kind === "brute" || enemy.kind === "boss") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(-enemy.radius - 4, -enemy.radius - 4, enemy.radius * 2 + 8, enemy.radius * 2 + 8);
    }
    ctx.restore();

    if (enemy.state === "alert" || enemy.alertPulse > 0) {
      ctx.save();
      ctx.fillStyle = enemy.kind === "boss" ? "#ffd166" : "#ff174f";
      ctx.font = "1000 17px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("!", enemy.x, enemy.y - enemy.radius - 15 - Math.sin(time * 9) * 3);
      ctx.restore();
    }

    if (enemy.hp < enemy.maxHp && enemy.alive) {
      var width = enemy.kind === "boss" ? 70 : 42;
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(enemy.x - width / 2, enemy.y + enemy.radius + 10, width, 5);
      ctx.fillStyle = color;
      ctx.fillRect(enemy.x - width / 2, enemy.y + enemy.radius + 10, width * enemy.hp / enemy.maxHp, 5);
    }
  }

  function drawPlayer(player, time) {
    if (!player.alive && Math.floor(time * 10) % 2) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 16) % 2) ctx.globalAlpha = .42;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#00f0ff";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#08202c";
    ctx.beginPath();
    ctx.arc(-4, 0, player.radius * .62, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e9fdff";
    ctx.fillRect(7, -4, 28, 8);
    ctx.fillStyle = "#ff174f";
    ctx.beginPath();
    ctx.moveTo(7, -10);
    ctx.lineTo(18, 0);
    ctx.lineTo(7, 10);
    ctx.closePath();
    ctx.fill();

    if (player.meleeTime > 0) {
      var progress = 1 - player.meleeTime / .18;
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 66, -1.2 + progress * .3, 1.2 + progress * .45);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCorpse(corpse) {
    ctx.save();
    ctx.translate(corpse.x, corpse.y);
    ctx.rotate(corpse.angle + Math.PI * .35);
    ctx.globalAlpha = .68;
    ctx.fillStyle = corpse.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, corpse.kind === "boss" ? 34 : 26, corpse.kind === "boss" ? 20 : 14, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-18, -18);
    ctx.lineTo(18, 18);
    ctx.moveTo(18, -18);
    ctx.lineTo(-18, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawBullet(bullet) {
    ctx.save();
    ctx.strokeStyle = bullet.color;
    ctx.lineWidth = bullet.radius;
    ctx.lineCap = "round";
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 12;
    var norm = normalize(bullet.vx, bullet.vy);
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - norm.x * 19, bullet.y - norm.y * 19);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticle(particle) {
    var alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(pickup) {
    var pulse = 1 + Math.sin(pickup.pulse) * .13;
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#65ff9b";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#65ff9b";
    ctx.fillRect(-5, -14, 10, 28);
    ctx.fillRect(-14, -5, 28, 10);
    ctx.restore();
  }

  function drawLighting() {
    if (!state.player || state.mode === "menu") return;
    var px = state.player.x - state.camera.x;
    var py = state.player.y - state.camera.y;
    ctx.save();
    var vignette = ctx.createRadialGradient(px, py, Math.min(W, H) * .16, px, py, Math.max(W, H) * .75);
    vignette.addColorStop(0, "rgba(1,0,8,0)");
    vignette.addColorStop(.55, "rgba(1,0,8,.12)");
    vignette.addColorStop(1, "rgba(1,0,8,.65)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawCrosshair() {
    if (!mouse.active || state.mode !== "playing") return;
    ctx.save();
    ctx.translate(mouse.x, mouse.y);
    ctx.strokeStyle = "rgba(0,240,255,.88)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.moveTo(-17, 0); ctx.lineTo(-6, 0);
    ctx.moveTo(17, 0); ctx.lineTo(6, 0);
    ctx.moveTo(0, -17); ctx.lineTo(0, -6);
    ctx.moveTo(0, 17); ctx.lineTo(0, 6);
    ctx.stroke();
    ctx.restore();
  }

  var audio = {
    ctx: null,
    master: null,
    music: null,
    sfx: null,
    noise: null,
    timer: null,
    nextStep: 0,
    step: 0,
    mood: "menu",
    bpm: 112
  };

  function ensureAudio() {
    if (!audio.ctx) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audio.ctx = new AudioContextClass();
      audio.master = audio.ctx.createGain();
      audio.music = audio.ctx.createGain();
      audio.sfx = audio.ctx.createGain();
      var compressor = audio.ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = .003;
      compressor.release.value = .22;
      audio.music.gain.value = .34;
      audio.sfx.gain.value = .68;
      audio.master.gain.value = save.sound ? .78 : 0;
      audio.music.connect(compressor);
      audio.sfx.connect(compressor);
      compressor.connect(audio.master);
      audio.master.connect(audio.ctx.destination);

      var noiseLength = Math.floor(audio.ctx.sampleRate * .35);
      audio.noise = audio.ctx.createBuffer(1, noiseLength, audio.ctx.sampleRate);
      var data = audio.noise.getChannelData(0);
      for (var i = 0; i < noiseLength; i += 1) data[i] = Math.random() * 2 - 1;

      audio.nextStep = audio.ctx.currentTime + .06;
      audio.timer = window.setInterval(scheduleMusic, 25);
    }
    if (audio.ctx.state === "suspended") audio.ctx.resume().catch(function () {});
  }

  function setMusicMood(mood) {
    if (audio.mood === mood) return;
    audio.mood = mood;
    if (!audio.ctx || !audio.music) return;
    var targets = { menu: .24, stealth: .31, alert: .46, escape: .52, paused: .09, dead: .14, result: .27 };
    audio.music.gain.cancelScheduledValues(audio.ctx.currentTime);
    audio.music.gain.setTargetAtTime(targets[mood] || .28, audio.ctx.currentTime, .12);
  }

  function oscillator(time, frequency, duration, type, gain, destination, glide) {
    if (!audio.ctx) return;
    var osc = audio.ctx.createOscillator();
    var amp = audio.ctx.createGain();
    osc.type = type || "sawtooth";
    osc.frequency.setValueAtTime(Math.max(35, frequency), time);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(35, glide), time + duration);
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), time + .008);
    amp.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(amp);
    amp.connect(destination || audio.sfx);
    osc.start(time);
    osc.stop(time + duration + .03);
  }

  function noiseHit(time, duration, gain, highpass) {
    if (!audio.ctx || !audio.noise) return;
    var source = audio.ctx.createBufferSource();
    var filter = audio.ctx.createBiquadFilter();
    var amp = audio.ctx.createGain();
    source.buffer = audio.noise;
    filter.type = "highpass";
    filter.frequency.value = highpass || 4000;
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(audio.music);
    source.start(time);
    source.stop(time + duration);
  }

  function kick(time) {
    if (!audio.ctx) return;
    var osc = audio.ctx.createOscillator();
    var amp = audio.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(43, time + .15);
    amp.gain.setValueAtTime(.7, time);
    amp.gain.exponentialRampToValueAtTime(.0001, time + .22);
    osc.connect(amp);
    amp.connect(audio.music);
    osc.start(time);
    osc.stop(time + .24);
  }

  function scheduleMusic() {
    if (!audio.ctx || audio.ctx.state !== "running") return;
    var mission = MISSIONS[state.missionIndex] || MISSIONS[0];
    audio.bpm = audio.mood === "menu" ? 106 : mission.bpm;
    var stepDuration = 60 / audio.bpm / 4;
    while (audio.nextStep < audio.ctx.currentTime + .12) {
      scheduleStep(audio.step, audio.nextStep, mission);
      audio.nextStep += stepDuration;
      audio.step = (audio.step + 1) % 64;
    }
  }

  function scheduleStep(step, time, mission) {
    var active = audio.mood !== "paused" && audio.mood !== "dead";
    var roots = [55, 65.41, 73.42];
    var root = roots[state.missionIndex] || 55;
    var bassPattern = [0, 0, 7, 0, 3, 3, 10, 7, 0, 0, 12, 10, 3, 7, 10, 7];
    var interval = bassPattern[step % 16];
    if (step % 4 === 0) kick(time);
    if (step % 8 === 4) noiseHit(time, .16, .28, 1100);
    if (active && step % 2 === 0) noiseHit(time, .035, audio.mood === "alert" ? .1 : .055, 5200);
    if (active && step % 2 === 0) {
      oscillator(time, root * Math.pow(2, interval / 12), .19, "sawtooth", .075, audio.music);
    }
    if ((audio.mood === "alert" || audio.mood === "escape") && step % 4 === 2) {
      var leadIntervals = [12, 15, 19, 22, 19, 15, 10, 7];
      var lead = leadIntervals[Math.floor(step / 2) % leadIntervals.length];
      oscillator(time, root * 2 * Math.pow(2, lead / 12), .11, "square", .035, audio.music, root * 2 * Math.pow(2, (lead + 2) / 12));
    }
    if (audio.mood === "result" && step % 8 === 0) {
      oscillator(time, root * 2 * Math.pow(2, [0, 7, 12, 15][Math.floor(step / 8) % 4] / 12), .55, "triangle", .06, audio.music);
    }
  }

  function sfx(name) {
    if (!audio.ctx || !save.sound) return;
    var now = audio.ctx.currentTime;
    if (name === "shot") {
      noiseSfx(now, .08, .18, 1600);
      oscillator(now, 155, .09, "square", .11, audio.sfx, 72);
    } else if (name === "enemyShot") {
      oscillator(now, 105, .11, "sawtooth", .055, audio.sfx, 55);
    } else if (name === "hit" || name === "kill") {
      oscillator(now, name === "kill" ? 96 : 180, .14, "sawtooth", .12, audio.sfx, 48);
      noiseSfx(now, .09, .12, 500);
    } else if (name === "swing") {
      noiseSfx(now, .1, .08, 2500);
    } else if (name === "dash") {
      oscillator(now, 680, .16, "sine", .08, audio.sfx, 120);
    } else if (name === "hurt" || name === "death") {
      oscillator(now, name === "death" ? 170 : 240, name === "death" ? .65 : .26, "sawtooth", .14, audio.sfx, 45);
    } else if (name === "alert") {
      oscillator(now, 740, .11, "square", .07, audio.sfx, 980);
    } else if (name === "reload" || name === "loaded" || name === "tick") {
      oscillator(now, name === "loaded" ? 520 : 340, .055, "square", .035, audio.sfx);
    } else if (name === "clear" || name === "complete" || name === "start") {
      [0, 4, 7, 12].forEach(function (interval, index) {
        oscillator(now + index * .07, 220 * Math.pow(2, interval / 12), .28, "triangle", .065, audio.sfx);
      });
    } else if (name === "bossDown") {
      [160, 120, 80, 48].forEach(function (frequency, index) {
        oscillator(now + index * .08, frequency, .3, "sawtooth", .14, audio.sfx, frequency * .6);
      });
      noiseSfx(now, .42, .18, 300);
    } else if (name === "pickup") {
      oscillator(now, 440, .18, "sine", .07, audio.sfx, 880);
    } else if (name === "armor") {
      oscillator(now, 92, .09, "square", .09, audio.sfx);
    } else if (name === "empty") {
      oscillator(now, 70, .045, "square", .03, audio.sfx);
    }
  }

  function noiseSfx(time, duration, gain, highpass) {
    if (!audio.ctx || !audio.noise) return;
    var source = audio.ctx.createBufferSource();
    var filter = audio.ctx.createBiquadFilter();
    var amp = audio.ctx.createGain();
    source.buffer = audio.noise;
    filter.type = "highpass";
    filter.frequency.value = highpass || 1200;
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(audio.sfx);
    source.start(time);
    source.stop(time + duration);
  }

  function toggleSound() {
    ensureAudio();
    save.sound = !save.sound;
    persist();
    syncSoundButtons();
    if (save.sound) sfx("tick");
  }

  function bindStick(element, output, aiming) {
    var pointerId = null;
    var knob = element.querySelector(".knob");

    function updatePointer(event) {
      var rect = element.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = event.clientX - cx;
      var dy = event.clientY - cy;
      var maxRadius = rect.width * .34;
      var normalized = normalize(dx, dy);
      var magnitude = clamp(normalized.length / maxRadius, 0, 1);
      output.x = normalized.x * magnitude;
      output.y = normalized.y * magnitude;
      if (aiming) output.firing = magnitude > .28;
      knob.style.transform = "translate(calc(-50% + " + (output.x * maxRadius) + "px), calc(-50% + " + (output.y * maxRadius) + "px))";
    }

    function reset() {
      pointerId = null;
      output.x = 0;
      output.y = 0;
      if (aiming) output.firing = false;
      knob.style.transform = "translate(-50%, -50%)";
    }

    element.addEventListener("pointerdown", function (event) {
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      mouse.active = false;
      element.setPointerCapture(pointerId);
      updatePointer(event);
      event.preventDefault();
    });
    element.addEventListener("pointermove", function (event) {
      if (event.pointerId !== pointerId) return;
      updatePointer(event);
      event.preventDefault();
    });
    element.addEventListener("pointerup", function (event) {
      if (event.pointerId === pointerId) reset();
    });
    element.addEventListener("pointercancel", function (event) {
      if (event.pointerId === pointerId) reset();
    });
    return reset;
  }

  var resetMoveStick = bindStick(ui.moveStick, moveInput, false);
  var resetAimStick = bindStick(ui.aimStick, aimInput, true);

  function clearTouchInputs() {
    resetMoveStick();
    resetAimStick();
    moveInput.x = 0;
    moveInput.y = 0;
    aimInput.firing = false;
  }

  window.addEventListener("keydown", function (event) {
    keys[event.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(event.code) >= 0) event.preventDefault();
    if (event.repeat) return;
    if (event.code === "Space") meleePlayer();
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") dashPlayer();
    if (event.code === "KeyR") reloadPlayer();
    if (event.code === "Escape" || event.code === "KeyP") {
      if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
    }
  });

  window.addEventListener("keyup", function (event) {
    keys[event.code] = false;
  });

  canvas.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse") {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    }
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse" && event.button === 0) {
      mouse.down = true;
      mouse.active = true;
      ensureAudio();
      firePlayer();
    }
  });

  window.addEventListener("pointerup", function (event) {
    if (event.pointerType === "mouse" && event.button === 0) mouse.down = false;
  });

  window.addEventListener("blur", function () {
    Object.keys(keys).forEach(function (key) { keys[key] = false; });
    mouse.down = false;
    clearTouchInputs();
    pauseGame();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      pauseGame();
      if (audio.ctx && audio.ctx.state === "running") audio.ctx.suspend().catch(function () {});
    }
  });

  ["selectionstart", "dragstart", "contextmenu"].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      var tag = event.target && event.target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") event.preventDefault();
    });
  });

  ui.startBtn.addEventListener("click", function () {
    ensureAudio();
    startMission(state.missionIndex);
  });
  ui.helpBtn.addEventListener("click", function () { show(ui.helpModal, true); sfx("tick"); });
  ui.newsBtn.addEventListener("click", function () { show(ui.newsModal, true); sfx("tick"); });
  ui.menuSoundBtn.addEventListener("click", toggleSound);
  ui.soundBtn.addEventListener("click", toggleSound);
  ui.pauseBtn.addEventListener("click", pauseGame);
  ui.resumeBtn.addEventListener("click", resumeGame);
  ui.restartBtn.addEventListener("click", function () { startMission(state.missionIndex); });
  ui.quitBtn.addEventListener("click", showMenu);
  ui.deathRestartBtn.addEventListener("click", function () { startMission(state.missionIndex); });
  ui.deathMenuBtn.addEventListener("click", showMenu);
  ui.resultReplayBtn.addEventListener("click", function () { startMission(state.missionIndex); });
  ui.resultMenuBtn.addEventListener("click", showMenu);
  ui.nextBtn.addEventListener("click", function () {
    if (state.missionIndex < MISSIONS.length - 1) startMission(state.missionIndex + 1);
    else showMenu();
  });

  document.querySelectorAll("[data-close]").forEach(function (button) {
    button.addEventListener("click", function () {
      show(document.getElementById(button.getAttribute("data-close")), false);
      sfx("tick");
    });
  });

  [
    [ui.meleeBtn, meleePlayer],
    [ui.dashBtn, dashPlayer],
    [ui.reloadBtn, reloadPlayer]
  ].forEach(function (entry) {
    entry[0].addEventListener("pointerdown", function (event) {
      event.preventDefault();
      ensureAudio();
      entry[1]();
    });
  });

  function frame(now) {
    var dt = Math.min(.034, Math.max(0, (now - state.lastFrame) / 1000));
    state.lastFrame = now;
    update(dt);
    if (state.mode === "menu") drawAttract(now / 1000);
    else drawWorld(now / 1000);
    requestAnimationFrame(frame);
  }

  renderMissionCards();
  syncSoundButtons();
  showMenu();
  requestAnimationFrame(frame);
})();

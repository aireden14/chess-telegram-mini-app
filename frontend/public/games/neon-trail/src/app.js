import { levels, keyFor } from "./levels.js";
import { createGame, nextHint, progress, starsFor, tryVisit, undo } from "./engine.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const SVG_NS = "http://www.w3.org/2000/svg";
const STORAGE_KEY = "neon-trail-progress-v1";

const refs = {
  board: $("#board"),
  boardWrap: $("#boardWrap"),
  boardMessage: $("#boardMessage"),
  deviceFrame: $("#deviceFrame"),
  levelNumber: $("#levelNumber"),
  levelTitle: $("#levelTitle"),
  instruction: $("#instruction"),
  progressPercent: $("#progressPercent"),
  orbitValue: $("#orbitValue"),
  undoButton: $("#undoButton"),
  resetButton: $("#resetButton"),
  hintButton: $("#hintButton"),
  soundButton: $("#soundButton"),
  levelGrid: $("#levelGrid"),
  winModal: $("#winModal"),
  winStars: $("#winStars"),
  winSummary: $("#winSummary"),
  nextButton: $("#nextButton"),
  replayButton: $("#replayButton"),
};

const loadProgress = () => {
  try {
    return { unlocked: 1, completed: {}, sound: true, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { unlocked: 1, completed: {}, sound: true };
  }
};

let saved = loadProgress();
let levelIndex = Math.min(Math.max(0, Number(saved.lastLevel || 0)), levels.length - 1);
let game = createGame(levels[levelIndex]);
let dragging = false;
let pointerPosition = null;
let messageTimer = null;
let audioContext = null;

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

const createSvg = (tag, attributes = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  return node;
};

const tone = (frequency, duration = 0.06, type = "sine", volume = 0.025) => {
  if (!saved.sound) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is an enhancement; the game remains fully playable without it.
  }
};

const haptic = (pattern = 8) => navigator.vibrate?.(pattern);

const pointLayout = () => {
  const { rows, cols } = game.level;
  const margin = 13;
  const xStep = cols > 1 ? (100 - margin * 2) / (cols - 1) : 0;
  const yStep = rows > 1 ? (100 - margin * 2) / (rows - 1) : 0;
  const active = new Set(game.level.solution.map(keyFor));
  return game.level.solution.map(([row, column]) => ({
    point: [row, column],
    key: keyFor([row, column]),
    x: margin + column * xStep,
    y: margin + row * yStep,
    active: active.has(keyFor([row, column])),
  }));
};

const showMessage = (text, toneName = "neutral") => {
  clearTimeout(messageTimer);
  refs.boardMessage.textContent = text;
  refs.boardMessage.dataset.tone = toneName;
  refs.boardMessage.classList.add("is-visible");
  messageTimer = setTimeout(() => refs.boardMessage.classList.remove("is-visible"), 1200);
};

function drawBoard() {
  const layout = pointLayout();
  const byKey = new Map(layout.map((item) => [item.key, item]));
  refs.board.replaceChildren();
  refs.board.setAttribute("viewBox", "0 0 100 100");

  const gridLayer = createSvg("g", { class: "grid-layer", "aria-hidden": "true" });
  for (let row = 0; row < game.level.rows; row += 1) {
    for (let column = 0; column < game.level.cols; column += 1) {
      const current = byKey.get(keyFor([row, column]));
      if (!current) continue;
      [[row, column + 1], [row + 1, column]].forEach((neighborPoint) => {
        const neighbor = byKey.get(keyFor(neighborPoint));
        if (neighbor) gridLayer.append(createSvg("line", { x1: current.x, y1: current.y, x2: neighbor.x, y2: neighbor.y }));
      });
    }
  }
  refs.board.append(gridLayer);

  const trailLayer = createSvg("g", { class: "trail-layer", "aria-hidden": "true" });
  game.path.slice(1).forEach((point, index) => {
    const from = byKey.get(keyFor(game.path[index]));
    const to = byKey.get(keyFor(point));
    trailLayer.append(createSvg("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
  });
  if (dragging && pointerPosition && game.path.length) {
    const from = byKey.get(keyFor(game.path.at(-1)));
    trailLayer.append(createSvg("line", {
      class: "preview-line",
      x1: from.x,
      y1: from.y,
      x2: pointerPosition.x,
      y2: pointerPosition.y,
    }));
  }
  refs.board.append(trailLayer);

  const startKey = keyFor(game.level.solution[0]);
  layout.forEach((item) => {
    const visitedIndex = game.path.findIndex((point) => keyFor(point) === item.key);
    const group = createSvg("g", {
      class: `dot ${visitedIndex >= 0 ? "is-visited" : ""} ${item.key === startKey && !game.path.length ? "is-start" : ""}`,
      transform: `translate(${item.x} ${item.y})`,
      "data-key": item.key,
      role: "button",
      tabindex: "-1",
      "aria-label": visitedIndex >= 0 ? `Точка ${visitedIndex + 1}, соединена` : item.key === startKey ? "Стартовая точка" : "Свободная точка",
    });
    if (item.key === startKey && !game.path.length) group.append(createSvg("circle", { class: "start-ring", r: 6.8 }));
    group.append(createSvg("circle", { class: "dot-halo", r: 4.2 }));
    group.append(createSvg("circle", { class: "dot-core", r: 2.6 }));
    refs.board.append(group);
  });

  updateHud();
}

function updateHud() {
  const percent = Math.round(progress(game) * 100);
  refs.progressPercent.textContent = `${percent}%`;
  refs.orbitValue.style.strokeDashoffset = String(113.1 * (1 - progress(game)));
  refs.undoButton.disabled = game.path.length === 0 || game.completed;
  refs.instruction.textContent = game.completed
    ? "Все точки соединены"
    : game.path.length
      ? `${game.path.length} из ${game.level.solution.length} точек соединено`
      : "Проведи одну линию через все точки";
}

const boardCoordinates = (event) => {
  const rect = refs.board.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
};

const nearestPoint = (position, radius = 7.5) => {
  let nearest = null;
  let nearestDistance = radius;
  pointLayout().forEach((item) => {
    const distance = Math.hypot(item.x - position.x, item.y - position.y);
    if (distance < nearestDistance) {
      nearest = item.point;
      nearestDistance = distance;
    }
  });
  return nearest;
};

function visit(point) {
  const result = tryVisit(game, point);
  game = result.game;

  if (["started", "visited"].includes(result.status)) {
    tone(360 + game.path.length * 12);
    haptic();
  } else if (result.status === "backtracked") {
    tone(220, 0.05, "sine", 0.018);
  } else if (result.status === "wrong-start") {
    tone(120, 0.1, "square", 0.018);
    haptic([12, 30, 12]);
    showMessage("Начни с зелёной точки", "warning");
  } else if (result.status === "already-visited") {
    showMessage("Эта точка уже была в пути", "warning");
  }

  drawBoard();
  if (result.status === "won") completeLevel();
}

function handlePointerDown(event) {
  if (game.completed) return;
  const point = nearestPoint(boardCoordinates(event));
  if (!point) return;
  event.preventDefault();
  refs.board.setPointerCapture?.(event.pointerId);
  dragging = true;
  pointerPosition = boardCoordinates(event);
  visit(point);
}

function handlePointerMove(event) {
  if (!dragging || game.completed) return;
  event.preventDefault();
  pointerPosition = boardCoordinates(event);
  const point = nearestPoint(pointerPosition);
  if (point) visit(point);
  else drawBoard();
}

function handlePointerEnd(event) {
  if (!dragging) return;
  dragging = false;
  pointerPosition = null;
  refs.board.releasePointerCapture?.(event.pointerId);
  drawBoard();
}

function resetLevel({ quiet = false } = {}) {
  game = createGame(levels[levelIndex]);
  dragging = false;
  pointerPosition = null;
  clearTimeout(messageTimer);
  refs.boardMessage.classList.remove("is-visible");
  refs.boardMessage.textContent = "";
  refs.deviceFrame.classList.remove("is-complete", "show-hint");
  refs.winModal.hidden = true;
  drawBoard();
  if (!quiet) {
    showMessage("Путь очищен");
    tone(180, 0.07, "sine", 0.02);
  }
}

function selectLevel(index) {
  if (index + 1 > saved.unlocked) {
    showMessage("Сначала пройди предыдущий уровень", "warning");
    return;
  }
  levelIndex = index;
  saved.lastLevel = index;
  save();
  refs.levelNumber.textContent = String(levelIndex + 1).padStart(2, "0");
  refs.levelTitle.textContent = levels[levelIndex].title;
  switchView("gameView");
  resetLevel({ quiet: true });
}

function completeLevel() {
  const stars = starsFor(game);
  const previous = Number(saved.completed[game.level.id] || 0);
  saved.completed[game.level.id] = Math.max(previous, stars);
  saved.unlocked = Math.min(levels.length, Math.max(saved.unlocked, game.level.id + 1));
  save();
  refs.deviceFrame.classList.add("is-complete");
  refs.winStars.textContent = "★ ".repeat(stars).trim() + (stars < 3 ? ` ${"☆ ".repeat(3 - stars).trim()}` : "");
  refs.winStars.setAttribute("aria-label", `Результат: ${stars} из 3 звёзд`);
  refs.winSummary.textContent = stars === 3
    ? "Идеально: ни одного лишнего движения."
    : stars === 2
      ? "Отлично! В следующий раз получится ещё чище."
      : "Готово! Теперь попробуй пройти без возвратов.";
  refs.nextButton.innerHTML = game.level.id === levels.length ? "К карте уровней <span aria-hidden=\"true\">→</span>" : "Следующий уровень <span aria-hidden=\"true\">→</span>";
  tone(523, 0.12, "sine", 0.035);
  setTimeout(() => tone(659, 0.15, "sine", 0.03), 100);
  setTimeout(() => tone(784, 0.22, "sine", 0.025), 210);
  haptic([20, 45, 20]);
  setTimeout(() => {
    refs.winModal.hidden = false;
    refs.nextButton.focus();
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520);
  renderLevelGrid();
}

function showHint() {
  const hint = nextHint(game);
  if (!hint) return;
  const key = keyFor(hint);
  refs.deviceFrame.classList.remove("show-hint");
  drawBoard();
  requestAnimationFrame(() => {
    const dot = refs.board.querySelector(`[data-key="${key}"]`);
    dot?.classList.add("is-hint");
    refs.deviceFrame.classList.add("show-hint");
    showMessage(game.path.length ? "Попробуй эту точку" : "Начни отсюда");
    tone(440, 0.1, "sine", 0.02);
    setTimeout(() => {
      dot?.classList.remove("is-hint");
      refs.deviceFrame.classList.remove("show-hint");
    }, 1800);
  });
}

function renderLevelGrid() {
  refs.levelGrid.replaceChildren();
  levels.forEach((levelItem, index) => {
    const button = document.createElement("button");
    const stars = Number(saved.completed[levelItem.id] || 0);
    const locked = levelItem.id > saved.unlocked;
    button.type = "button";
    button.className = `level-tile ${locked ? "is-locked" : ""} ${stars ? "is-complete" : ""} ${index === levelIndex ? "is-current" : ""}`;
    button.disabled = locked;
    button.setAttribute("aria-label", locked ? `Уровень ${levelItem.id}, закрыт` : `Уровень ${levelItem.id}: ${levelItem.title}${stars ? `, ${stars} звезды` : ""}`);
    button.innerHTML = `
      <span class="level-tile-number">${String(levelItem.id).padStart(2, "0")}</span>
      <span class="mini-path" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="level-stars">${locked ? "◆" : stars ? `${"★".repeat(stars)}${"·".repeat(3 - stars)}` : levelItem.group}</span>
    `;
    button.addEventListener("click", () => selectLevel(index));
    refs.levelGrid.append(button);
  });
  const scores = Object.values(saved.completed).map(Number);
  $("#completedStat").textContent = String(scores.length);
  $("#starsStat").textContent = String(scores.reduce((sum, value) => sum + value, 0));
  $("#bestStreakStat").textContent = String(Math.min(scores.length, 18));
}

function switchView(viewId) {
  ["gameView", "levelsView", "updatesView"].forEach((id) => {
    const view = document.getElementById(id);
    view.hidden = id !== viewId;
  });
  $$(".nav-button").forEach((button) => {
    const active = button.dataset.view === viewId;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (viewId === "levelsView") renderLevelGrid();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function keyboardMove(event) {
  const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (event.key in directions) {
    event.preventDefault();
    if (!game.path.length) visit(game.level.solution[0]);
    else {
      const [row, column] = game.path.at(-1);
      const [dr, dc] = directions[event.key];
      visit([row + dr, column + dc]);
    }
  } else if (["Backspace", "u", "U", "z", "Z"].includes(event.key)) {
    event.preventDefault();
    game = undo(game);
    drawBoard();
  } else if (["r", "R"].includes(event.key)) resetLevel();
  else if (["h", "H"].includes(event.key)) showHint();
  else if ((event.key === "Enter" || event.key === " ") && !game.path.length) {
    event.preventDefault();
    visit(game.level.solution[0]);
  }
}

refs.board.addEventListener("pointerdown", handlePointerDown);
refs.board.addEventListener("pointermove", handlePointerMove);
refs.board.addEventListener("pointerup", handlePointerEnd);
refs.board.addEventListener("pointercancel", handlePointerEnd);
refs.board.addEventListener("keydown", keyboardMove);
refs.undoButton.addEventListener("click", () => { game = undo(game); drawBoard(); tone(220, 0.05); });
refs.resetButton.addEventListener("click", () => resetLevel());
refs.hintButton.addEventListener("click", showHint);
refs.soundButton.addEventListener("click", () => {
  saved.sound = !saved.sound;
  save();
  refs.soundButton.classList.toggle("is-muted", !saved.sound);
  refs.soundButton.setAttribute("aria-label", saved.sound ? "Выключить звук" : "Включить звук");
  if (saved.sound) tone(440, 0.08);
});
$("#levelsButton").addEventListener("click", () => switchView("levelsView"));
refs.nextButton.addEventListener("click", () => {
  refs.winModal.hidden = true;
  if (game.level.id === levels.length) switchView("levelsView");
  else selectLevel(levelIndex + 1);
});
refs.replayButton.addEventListener("click", () => resetLevel({ quiet: true }));
$$('[data-view]').forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$$('[data-close-panel]').forEach((button) => button.addEventListener("click", () => switchView("gameView")));

["selectionstart", "dragstart"].forEach((eventName) => {
  refs.boardWrap.addEventListener(eventName, (event) => event.preventDefault());
});
refs.boardWrap.addEventListener("contextmenu", (event) => event.preventDefault());

refs.soundButton.classList.toggle("is-muted", !saved.sound);
refs.levelNumber.textContent = String(levelIndex + 1).padStart(2, "0");
refs.levelTitle.textContent = game.level.title;
renderLevelGrid();
drawBoard();

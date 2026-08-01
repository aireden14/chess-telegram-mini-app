import {
  STEPS, MAX_PARTS, MAX_SONG, DRUM_IDS, SYNTH_IDS, WAVES, WOB_RATES, WOB_SHAPES, SCALES, ROOT_NAMES,
  defaultTrack, normalizeTrack, scaleLadder, emptyPart,
  renderLoop, encodeWav, encodeTrackCode, decodeTrackCode,
} from "./synth-core.js";
import { PRESETS, applyPreset } from "./presets.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const DRUM_META = {
  kick: { label: "KICK", emoji: "🥁", color: "#ff2d78" },
  snare: { label: "SNARE", emoji: "✴️", color: "#ff8a3d" },
  hat: { label: "HAT", emoji: "🎩", color: "#3df0ff" },
  clap: { label: "CLAP", emoji: "👏", color: "#b47bff" },
};
const SYNTH_META = {
  bass: { label: "BASS", emoji: "🎸", color: "#5b8cff" },
  lead: { label: "LEAD", emoji: "🎹", color: "#ff5bd0" },
  arp: { label: "ARP", emoji: "✨", color: "#3dffa8" },
};
const SCALE_LABELS = {
  minorPentatonic: "Минор пентатоника",
  majorPentatonic: "Мажор пентатоника",
  minor: "Минор",
  major: "Мажор",
  dorian: "Дориан",
  japanese: "Японская (wave)",
};
const NOTE_ROWS = 8;
const LS_KEY = "gamepass.beat-maker.tracks.v1";
const LS_CUR = "gamepass.beat-maker.current.v1";

let track = normalizeTrack(loadCurrent() || defaultTrack());
let activeSynth = "lead";
let activePart = 0; // which part page the grid is editing
let playMode = "song"; // "song" = вся композиция, "part" = зациклить текущую часть
let playing = false;
let currentStep = -1; // global step across the whole playing arrangement
let playSong = [0]; // arrangement snapshot the current loopBuffer was built from

const PART_LETTERS = "АБВГДЕЖЗИКЛМНОПР";
const curPart = () => track.parts[Math.min(activePart, track.parts.length - 1)];
const songDurationSec = (entries) => entries * STEPS * (60 / track.bpm / 4);
const fmtDur = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

// backend bridge (filled by parent GamePass shell if present)
let cloudTracks = null; // array from server, or null if not connected

// ---------------------------------------------------------------------------
// Audio engine — render whole loop with synth-core, play looped, re-render on edit
// ---------------------------------------------------------------------------
let ac = null;
let master = null;
let loopSource = null;
let loopBuffer = null;
let loopStartTime = 0;
let rafId = 0;

function ensureAudio() {
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
}

function buildLoopBuffer() {
  ensureAudio();
  playSong = playMode === "part" ? [activePart] : track.song.slice();
  const { left, right, frames, sampleRate } = renderLoop(track, ac.sampleRate, { song: playSong });
  const buf = ac.createBuffer(2, frames, sampleRate);
  buf.copyToChannel(left, 0);
  buf.copyToChannel(right, 1);
  return buf;
}

function startPlayback() {
  ensureAudio();
  if (ac.state === "suspended") ac.resume();
  loopBuffer = buildLoopBuffer();
  spawnSource(0);
  playing = true;
  loopStartTime = ac.currentTime;
  document.body.classList.add("is-playing");
  syncTransport();
  tick();
}

function spawnSource(offset) {
  if (loopSource) { try { loopSource.onended = null; loopSource.stop(); } catch {} }
  const src = ac.createBufferSource();
  src.buffer = loopBuffer;
  src.loop = true;
  src.connect(master);
  src.start(0, offset || 0);
  loopSource = src;
}

function stopPlayback() {
  playing = false;
  if (loopSource) { try { loopSource.stop(); } catch {} loopSource = null; }
  cancelAnimationFrame(rafId);
  currentStep = -1;
  document.body.classList.remove("is-playing");
  clearPlayhead();
  syncTransport();
}

// re-render the loop on the fly while playing so edits are heard immediately,
// keeping phase so the swap is seamless.
function refreshLoop() {
  if (!playing) return;
  const elapsed = (ac.currentTime - loopStartTime) % (loopBuffer ? loopBuffer.duration : 1);
  loopBuffer = buildLoopBuffer();
  loopStartTime = ac.currentTime - elapsed;
  spawnSource(elapsed % loopBuffer.duration);
}

function tick() {
  if (!playing) return;
  const dur = loopBuffer.duration;
  const pos = ((ac.currentTime - loopStartTime) % dur) / dur;
  const total = playSong.length * STEPS;
  const step = Math.floor(pos * total) % total;
  if (step !== currentStep) {
    currentStep = step;
    paintPlayhead(step);
  }
  rafId = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

// ---------------------------------------------------------------------------
// Render UI
// ---------------------------------------------------------------------------
function render() {
  renderPresets();
  renderTransport();
  renderSongPanel();
  renderDrums();
  renderSynthTabs();
  renderPianoRoll();
  renderScaleBar();
}

function renderPresets() {
  const styleWrap = $("#presets");
  const trackWrap = $("#presetTracks");
  if (!styleWrap || styleWrap.childElementCount) return; // presets are static — build once
  for (const p of PRESETS) {
    const b = el("button", "preset-chip");
    const em = el("span", "preset-emoji", p.emoji);
    b.append(em, document.createTextNode(p.label));
    b.onclick = () => {
      applyPreset(track, p);
      activePart = 0;
      playMode = "song";
      persist();
      render();
      if (!playing) startPlayback(); else refreshLoop();
      toast(p.group === "track"
        ? `Трек «${p.label}» загружен ${p.emoji} · ${fmtDur(songDurationSec(track.song.length))}`
        : `Стиль «${p.label}» загружен ${p.emoji}`);
    };
    (p.group === "track" ? trackWrap : styleWrap).append(b);
  }
}

// ---------------------------------------------------------------------------
// Song panel — parts (А/Б/В…) + arrangement order + play mode
// ---------------------------------------------------------------------------
function renderSongPanel() {
  const partBar = $("#partBar");
  const songRow = $("#songRow");
  const songCtl = $("#songCtl");
  if (!partBar) return;
  partBar.innerHTML = "";
  songRow.innerHTML = "";
  songCtl.innerHTML = "";

  // part chips
  track.parts.forEach((_, i) => {
    const b = el("button", "part-chip" + (i === activePart ? " active" : ""), PART_LETTERS[i] || String(i + 1));
    b.title = "Часть " + (PART_LETTERS[i] || i + 1);
    b.onclick = () => {
      activePart = i;
      if (playMode === "part") refreshLoop();
      render();
    };
    partBar.append(b);
  });
  if (track.parts.length < MAX_PARTS) {
    const add = el("button", "part-chip ghost", "＋");
    add.title = "Новая часть (копия текущей)";
    add.onclick = () => {
      const src = curPart();
      track.parts.push({
        drums: Object.fromEntries(DRUM_IDS.map((id) => [id, src.drums[id].slice()])),
        notes: Object.fromEntries(SYNTH_IDS.map((id) => [id, src.notes[id].slice()])),
      });
      activePart = track.parts.length - 1;
      persist(); render();
      toast(`Часть ${PART_LETTERS[activePart]} создана (копия) — меняй её и добавляй в порядок`);
    };
    partBar.append(add);
  }
  if (track.parts.length > 1) {
    const del = el("button", "part-chip ghost danger", "🗑");
    del.title = "Удалить текущую часть";
    del.onclick = () => {
      track.parts.splice(activePart, 1);
      track.song = track.song.filter((i) => i !== activePart).map((i) => (i > activePart ? i - 1 : i));
      if (!track.song.length) track.song = [0];
      activePart = Math.max(0, activePart - 1);
      persist(); refreshLoop(); render();
    };
    partBar.append(del);
  }

  // arrangement row: tap a chip to remove it from the order
  track.song.forEach((pi, idx) => {
    const b = el("button", "song-chip", PART_LETTERS[pi] || String(pi + 1));
    b.onclick = () => {
      if (track.song.length <= 1) return;
      track.song.splice(idx, 1);
      persist(); refreshLoop(); renderSongPanel();
    };
    songRow.append(b);
  });

  // controls
  const addBtn = el("button", "tbtn mini-add", `➕ ${PART_LETTERS[activePart] || activePart + 1} в конец`);
  addBtn.onclick = () => {
    if (track.song.length >= MAX_SONG) { toast("Композиция уже максимальной длины"); return; }
    track.song.push(activePart);
    persist(); refreshLoop(); renderSongPanel();
  };
  const dblBtn = el("button", "tbtn", "×2 длина");
  dblBtn.onclick = () => {
    if (track.song.length * 2 > MAX_SONG) { toast("Больше некуда — максимум " + MAX_SONG + " частей"); return; }
    track.song = track.song.concat(track.song);
    persist(); refreshLoop(); renderSongPanel();
  };
  const modeBtn = el("button", "tbtn mode" + (playMode === "part" ? " on" : ""), playMode === "part" ? "🔁 Часть" : "🎬 Весь трек");
  modeBtn.title = "Что играет: вся композиция или только текущая часть";
  modeBtn.onclick = () => {
    playMode = playMode === "song" ? "part" : "song";
    refreshLoop(); renderSongPanel();
  };
  const dur = el("span", "song-dur", "⏱ " + fmtDur(songDurationSec(track.song.length)));
  songCtl.append(addBtn, dblBtn, modeBtn, dur);
}

function renderTransport() {
  $("#bpmVal").textContent = track.bpm;
  $("#swingVal").textContent = Math.round(track.swing * 100) + "%";
  $("#trackName").value = track.name;
}
function syncTransport() {
  const btn = $("#playBtn");
  btn.textContent = playing ? "⏸" : "▶";
  btn.classList.toggle("playing", playing);
}

function renderDrums() {
  const wrap = $("#drums");
  wrap.innerHTML = "";
  for (const id of DRUM_IDS) {
    const meta = DRUM_META[id];
    const row = el("div", "row drum-row");
    row.style.setProperty("--accent", meta.color);
    if (track.drumMute[id]) row.classList.add("muted");

    const head = el("div", "row-head");
    const mute = el("button", "mute-btn", meta.emoji);
    mute.title = "Выкл/вкл дорожку";
    mute.onclick = () => { track.drumMute[id] = !track.drumMute[id]; persist(); refreshLoop(); renderDrums(); };
    const name = el("span", "row-name", meta.label);
    head.append(mute, name);
    row.append(head);

    const cells = el("div", "cells");
    const rows = curPart().drums;
    for (let i = 0; i < STEPS; i++) {
      const c = el("button", "cell" + (rows[id][i] ? " on" : "") + (i % 4 === 0 ? " beat" : ""));
      c.dataset.step = i;
      c.onclick = () => {
        rows[id][i] = rows[id][i] ? 0 : 1;
        c.classList.toggle("on", !!rows[id][i]);
        persist(); refreshLoop();
      };
      cells.append(c);
    }
    row.append(cells);
    wrap.append(row);
  }
}

function renderSynthTabs() {
  const tabs = $("#synthTabs");
  tabs.innerHTML = "";
  for (const id of SYNTH_IDS) {
    const meta = SYNTH_META[id];
    const b = el("button", "synth-tab" + (id === activeSynth ? " active" : ""));
    b.style.setProperty("--accent", meta.color);
    b.innerHTML = `<span>${meta.emoji}</span>${meta.label}`;
    if (track.synths[id].mute) b.classList.add("muted");
    b.onclick = () => { activeSynth = id; render(); };
    tabs.append(b);
  }
}

function renderPianoRoll() {
  const s = track.synths[activeSynth];
  const notes = curPart().notes[activeSynth];
  const meta = SYNTH_META[activeSynth];
  const roll = $("#pianoRoll");
  roll.innerHTML = "";
  roll.style.setProperty("--accent", meta.color);
  const ladder = scaleLadder(track.scale, track.root, NOTE_ROWS);
  // rows top→bottom = high→low
  for (let r = NOTE_ROWS - 1; r >= 0; r--) {
    const midi = ladder[r] + s.octave * 12;
    const rowEl = el("div", "pr-row");
    const lab = el("div", "pr-note", ROOT_NAMES[((midi % 12) + 12) % 12]);
    rowEl.append(lab);
    const cells = el("div", "cells");
    for (let i = 0; i < STEPS; i++) {
      const on = notes[i] === r;
      const c = el("button", "cell pr-cell" + (on ? " on" : "") + (i % 4 === 0 ? " beat" : ""));
      c.onclick = () => {
        notes[i] = notes[i] === r ? -1 : r; // one note per column
        persist(); refreshLoop(); renderPianoRoll();
      };
      cells.append(c);
    }
    rowEl.append(cells);
    roll.append(rowEl);
  }
  // synth controls
  $("#synthCtl").innerHTML = "";
  const waveSel = labeledSelect("Волна", WAVES, s.wave, (v) => { s.wave = v; persist(); refreshLoop(); });
  const octSel = labeledSelect("Октава", ["-2", "-1", "0", "1", "2", "3"], String(s.octave), (v) => { s.octave = parseInt(v, 10); persist(); refreshLoop(); renderPianoRoll(); });
  const crush = labeledRange("8-бит", 0, 1, 0.05, s.crush, (v) => { s.crush = v; persist(); refreshLoop(); });
  const vol = labeledRange("Громкость", 0, 1.2, 0.05, s.vol, (v) => { s.vol = v; persist(); refreshLoop(); });
  const muteBtn = el("button", "ctl-btn" + (s.mute ? " on" : ""), s.mute ? "🔇 Выкл" : "🔊 Вкл");
  muteBtn.onclick = () => { s.mute = !s.mute; persist(); refreshLoop(); render(); };
  $("#synthCtl").append(waveSel, octSel, crush, vol, muteBtn);

  // --- filter / wobble section (the dubstep controls) ---
  const ctl2 = $("#synthCtl2");
  ctl2.innerHTML = "";
  const cutoff = labeledRange("Срез", 0, 1, 0.02, s.cutoff, (v) => { s.cutoff = v; persist(); refreshLoop(); });
  const reso = labeledRange("Резонанс", 0, 1, 0.02, s.reso, (v) => { s.reso = v; persist(); refreshLoop(); });
  const wobSel = labeledSelectVals("Вобл", WOB_RATES.map((r) => ({ value: String(r.v), label: r.label })), String(s.wob), (v) => { s.wob = parseFloat(v); persist(); refreshLoop(); });
  const wobDepth = labeledRange("Глубина", 0, 1, 0.05, s.wobDepth, (v) => { s.wobDepth = v; persist(); refreshLoop(); });
  const wobShape = labeledSelect("Форма", WOB_SHAPES, s.wobShape, (v) => { s.wobShape = v; persist(); refreshLoop(); });
  const drive = labeledRange("Драйв", 0, 1, 0.05, s.drive, (v) => { s.drive = v; persist(); refreshLoop(); });
  const detune = labeledRange("Детюн", 0, 1, 0.05, s.detune, (v) => { s.detune = v; persist(); refreshLoop(); });
  const sub = labeledRange("Саб", 0, 1, 0.05, s.sub, (v) => { s.sub = v; persist(); refreshLoop(); });
  ctl2.append(cutoff, reso, wobSel, wobDepth, wobShape, drive, detune, sub);
}

function renderScaleBar() {
  const bar = $("#scaleBar");
  bar.innerHTML = "";
  const rootSel = labeledSelect("Тоника", ROOT_NAMES.map((n, i) => n), ROOT_NAMES[track.root % 12], (v) => {
    const pc = ROOT_NAMES.indexOf(v);
    const oct = Math.floor(track.root / 12);
    track.root = oct * 12 + pc;
    persist(); refreshLoop(); render();
  });
  const scaleSel = labeledSelect("Лад", Object.keys(SCALES), track.scale, (v) => { track.scale = v; persist(); refreshLoop(); render(); }, (k) => SCALE_LABELS[k] || k);
  bar.append(rootSel, scaleSel);
}

function labeledSelect(label, values, current, onChange, fmt) {
  const wrap = el("label", "ctl");
  wrap.append(el("span", "ctl-lab", label));
  const sel = el("select");
  for (const v of values) {
    const o = el("option", null, fmt ? fmt(v) : v);
    o.value = v;
    if (v === current) o.selected = true;
    sel.append(o);
  }
  sel.onchange = () => onChange(sel.value);
  wrap.append(sel);
  return wrap;
}
// like labeledSelect but options carry separate value/label pairs
function labeledSelectVals(label, options, current, onChange) {
  const wrap = el("label", "ctl");
  wrap.append(el("span", "ctl-lab", label));
  const sel = el("select");
  for (const o of options) {
    const opt = el("option", null, o.label);
    opt.value = o.value;
    if (o.value === current) opt.selected = true;
    sel.append(opt);
  }
  sel.onchange = () => onChange(sel.value);
  wrap.append(sel);
  return wrap;
}
function labeledRange(label, min, max, step, current, onChange) {
  const wrap = el("label", "ctl");
  wrap.append(el("span", "ctl-lab", label));
  const inp = el("input");
  inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.value = current;
  inp.oninput = () => onChange(parseFloat(inp.value));
  wrap.append(inp);
  return wrap;
}

// ---------------------------------------------------------------------------
// Playhead paint
// ---------------------------------------------------------------------------
function paintPlayhead(globalStep) {
  clearPlayhead();
  const songPos = Math.floor(globalStep / STEPS);
  const step = globalStep % STEPS;
  // grid cursor only when the part being played is the part on screen
  if (playSong[songPos] === activePart) {
    document.querySelectorAll(`.cells .cell:nth-child(${step + 1})`).forEach((c) => c.classList.add("playing"));
  }
  // arrangement cursor
  if (playMode === "song") {
    const chips = document.querySelectorAll("#songRow .song-chip");
    if (chips[songPos]) chips[songPos].classList.add("now");
  }
  const bars = document.querySelectorAll("#viz .viz-bar");
  bars.forEach((b) => {
    b.style.transform = `scaleY(${0.2 + Math.random() * 0.9})`;
  });
}
function clearPlayhead() {
  document.querySelectorAll(".cell.playing").forEach((c) => c.classList.remove("playing"));
  document.querySelectorAll("#songRow .song-chip.now").forEach((c) => c.classList.remove("now"));
}

// ---------------------------------------------------------------------------
// Persistence (local + cloud bridge)
// ---------------------------------------------------------------------------
function persist() {
  try { localStorage.setItem(LS_CUR, JSON.stringify(track)); } catch {}
}
function loadCurrent() {
  try { const s = localStorage.getItem(LS_CUR); return s ? JSON.parse(s) : null; } catch { return null; }
}
function loadLibrary() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveLibrary(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

function saveTrackToLibrary(name) {
  const snapshot = normalizeTrack({ ...track, name });
  const lib = loadLibrary();
  const id = "loc_" + Date.now();
  lib.unshift({ id, name, data: snapshot, updatedAt: Date.now() });
  saveLibrary(lib.slice(0, 100));
  track.name = name;
  persist();
  // push to cloud if connected
  postToParent({ type: "beat:save", track: snapshot, name });
  return id;
}

// ---------------------------------------------------------------------------
// Parent (GamePass) bridge — lets tracks sync to the user's account so the
// agent can pull them later. Falls back to localStorage when standalone.
// ---------------------------------------------------------------------------
function postToParent(msg) {
  if (window.parent && window.parent !== window) {
    // parent (GamePass shell) is same-origin — target it explicitly
    window.parent.postMessage({ source: "beat-maker", ...msg }, window.location.origin);
  }
}
window.addEventListener("message", (e) => {
  if (e.origin !== window.location.origin) return;
  const d = e.data;
  if (!d || d.target !== "beat-maker") return;
  if (d.type === "cloud:list") {
    cloudTracks = Array.isArray(d.tracks) ? d.tracks : [];
    if ($("#libModal").classList.contains("open")) renderLibrary();
  }
});
// tell parent we're ready
postToParent({ type: "beat:ready" });

// ---------------------------------------------------------------------------
// Library modal
// ---------------------------------------------------------------------------
function openLibrary() {
  postToParent({ type: "beat:requestList" });
  $("#libModal").classList.add("open");
  renderLibrary();
}
function renderLibrary() {
  const list = $("#libList");
  list.innerHTML = "";
  const local = loadLibrary();
  const cloud = cloudTracks || [];
  const seen = new Set();
  const items = [];
  for (const c of cloud) items.push({ ...c, origin: "cloud" });
  for (const l of local) if (!seen.has(l.name)) items.push({ ...l, origin: "local" });

  if (!items.length) {
    list.append(el("div", "lib-empty", "Пока нет сохранённых треков. Набей бит и нажми «Сохранить»."));
    return;
  }
  for (const it of items) {
    const data = normalizeTrack(it.data || it);
    const card = el("div", "lib-card");
    const info = el("div", "lib-info");
    info.append(el("div", "lib-name", it.name || data.name));
    const durSec = data.song.length * STEPS * (60 / data.bpm / 4);
    info.append(el("div", "lib-meta", `${data.bpm} BPM · ${fmtDur(durSec)} · ${SCALE_LABELS[data.scale] || data.scale} · ${it.origin === "cloud" ? "☁ в аккаунте" : "📱 на устройстве"}`));
    card.append(info);
    const acts = el("div", "lib-acts");
    const load = el("button", "mini", "Открыть");
    load.onclick = () => { track = normalizeTrack(data); activePart = 0; playMode = "song"; persist(); render(); if (playing) refreshLoop(); closeLibrary(); };
    const del = el("button", "mini danger", "🗑");
    del.onclick = () => {
      if (it.origin === "local") { saveLibrary(loadLibrary().filter((x) => x.id !== it.id)); }
      else { postToParent({ type: "beat:delete", id: it.id }); cloudTracks = cloud.filter((x) => x.id !== it.id); }
      renderLibrary();
    };
    acts.append(load, del);
    card.append(acts);
    list.append(card);
  }
}
function closeLibrary() { $("#libModal").classList.remove("open"); }

// ---------------------------------------------------------------------------
// Export: WAV + track code
// ---------------------------------------------------------------------------
function exportWav() {
  const sr = 44100;
  const { left, right } = renderLoop(track, sr);
  const wav = encodeWav(left, right, sr);
  const blob = new Blob([wav], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (track.name || "wave-forge").replace(/[^\w\-а-яА-Я ]+/g, "").trim().replace(/\s+/g, "_") + ".wav";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyCode() {
  const code = encodeTrackCode(track);
  try { await navigator.clipboard.writeText(code); toast("Код трека скопирован — вставь его агенту в чат"); }
  catch { prompt("Скопируй код трека:", code); }
  postToParent({ type: "beat:code", code, name: track.name });
}

// ---------------------------------------------------------------------------
// Random / generate — the "прикольно и легко" button
// ---------------------------------------------------------------------------
function genPart(kind) {
  const rnd = Math.random;
  const p = emptyPart();
  const { kick, snare, hat, clap } = p.drums;
  for (let i = 0; i < STEPS; i++) {
    if (kind !== "break") {
      if (i % 4 === 0) kick[i] = 1;              // four-on-floor base
      else if (rnd() < (kind === "b" ? 0.22 : 0.15)) kick[i] = 1;
      if (i % 8 === 4) snare[i] = 1;             // backbeat
    }
    if (rnd() < (kind === "break" ? 0.4 : 0.7)) hat[i] = 1;
    if (i === 12 && rnd() < 0.5 && kind !== "break") clap[i] = 1;
  }
  for (const id of SYNTH_IDS) {
    const notes = p.notes[id];
    if (id === "bass") {
      if (kind !== "break") for (let i = 0; i < STEPS; i += 4) notes[i] = [0, 0, 3, 2][(i / 4) | 0] ?? 0;
      else notes[0] = 0;
    } else if (id === "lead") {
      if (kind === "break") continue; // break = только арп и хэты
      let last = 4;
      for (let i = 0; i < STEPS; i++) {
        if (rnd() < 0.35) { last = Math.max(0, Math.min(NOTE_ROWS - 1, last + (Math.round(rnd() * 4) - 2))); notes[i] = last; }
      }
    } else {
      for (let i = 0; i < STEPS; i += 2) if (rnd() < (kind === "break" ? 0.85 : 0.6)) notes[i] = (i % 8 === 0) ? 4 : (rnd() < 0.5 ? 2 : 6);
    }
  }
  return p;
}

function generate() {
  const rnd = Math.random;
  track.seed = (Math.random() * 1e6) | 0;
  // a whole mini-arrangement: A (groove), B (variation), C (break)
  track.parts = [genPart("a"), genPart("b"), genPart("break")];
  track.song = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 0, 1];
  activePart = 0;
  playMode = "song";
  // occasionally reroll scale/root for variety
  if (rnd() < 0.5) {
    const scales = Object.keys(SCALES);
    track.scale = scales[(rnd() * scales.length) | 0];
  }
  persist();
  render();
  if (!playing) startPlayback(); else refreshLoop();
  toast(`Свежий трек готов 🎲 3 части · ${fmtDur(songDurationSec(track.song.length))}`);
}

function clearAll() {
  track.parts = [emptyPart()];
  track.song = [0];
  activePart = 0;
  persist(); render(); if (playing) refreshLoop();
  toast("Чистый лист — одна пустая часть");
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
let toastTimer = 0;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ---------------------------------------------------------------------------
// Wire up transport buttons
// ---------------------------------------------------------------------------
function wire() {
  $("#playBtn").onclick = () => { playing ? stopPlayback() : startPlayback(); };
  $("#diceBtn").onclick = generate;
  $("#clearBtn").onclick = clearAll;
  $("#bpmDown").onclick = () => { track.bpm = Math.max(40, track.bpm - 2); persist(); renderTransport(); renderSongPanel(); refreshLoop(); };
  $("#bpmUp").onclick = () => { track.bpm = Math.min(220, track.bpm + 2); persist(); renderTransport(); renderSongPanel(); refreshLoop(); };
  $("#swingDown").onclick = () => { track.swing = Math.max(0, +(track.swing - 0.04).toFixed(2)); persist(); renderTransport(); refreshLoop(); };
  $("#swingUp").onclick = () => { track.swing = Math.min(0.6, +(track.swing + 0.04).toFixed(2)); persist(); renderTransport(); refreshLoop(); };

  $("#trackName").oninput = (e) => { track.name = e.target.value; persist(); };

  $("#saveBtn").onclick = () => {
    const name = (track.name || "").trim() || "Мой трек " + new Date().toLocaleDateString("ru-RU");
    saveTrackToLibrary(name);
    toast("Сохранено ✓ (в аккаунт и на устройство)");
  };
  $("#libBtn").onclick = openLibrary;
  $("#libClose").onclick = closeLibrary;
  $("#libModal").addEventListener("click", (e) => { if (e.target.id === "libModal") closeLibrary(); });

  $("#wavBtn").onclick = exportWav;
  $("#codeBtn").onclick = copyCode;

  // "Что нового"
  $("#newsBtn").onclick = () => $("#newsModal").classList.add("open");
  $("#newsClose").onclick = () => $("#newsModal").classList.remove("open");
  $("#newsModal").addEventListener("click", (e) => { if (e.target.id === "newsModal") e.currentTarget.classList.remove("open"); });

  // keyboard: space toggles play
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "INPUT") { e.preventDefault(); playing ? stopPlayback() : startPlayback(); }
  });

  // block accidental selection / context menu on the play surface
  const stop = (e) => e.preventDefault();
  document.querySelectorAll("#drums, #pianoRoll, #viz, #partBar, #songRow").forEach((n) => {
    n.addEventListener("selectstart", stop);
    n.addEventListener("dragstart", stop);
    n.addEventListener("contextmenu", stop);
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
render();
wire();

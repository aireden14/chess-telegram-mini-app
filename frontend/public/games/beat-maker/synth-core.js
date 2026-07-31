// WAVE FORGE — shared synth core.
// Pure JS, no DOM, no WebAudio. Runs identically in the browser (module import)
// and in Node (render.mjs). Renders a whole loop of a track into an interleaved
// stereo Float32Array so what you hear, the exported WAV, and the agent-side
// render are byte-for-byte the same.

export const STEPS = 16;

// ---- music theory -------------------------------------------------------
export const SCALES = {
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  japanese: [0, 1, 5, 7, 8], // in-sen, very "wave"
};
export const ROOT_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Build a ladder of scale degrees (rows) around a root, low → high.
export function scaleLadder(scaleName, rootMidi, rows) {
  const scale = SCALES[scaleName] || SCALES.minorPentatonic;
  const out = [];
  let deg = 0;
  while (out.length < rows) {
    const oct = Math.floor(deg / scale.length);
    const note = rootMidi + scale[deg % scale.length] + oct * 12;
    out.push(note);
    deg++;
  }
  return out; // index 0 = lowest
}

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ---- deterministic noise ------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- default track ------------------------------------------------------
export const DRUM_IDS = ["kick", "snare", "hat", "clap"];
export const SYNTH_IDS = ["bass", "lead", "arp"];

export const WAVES = ["square", "pulse25", "triangle", "saw"];

export function emptyRow(len = STEPS) {
  return new Array(len).fill(0);
}
export function emptyNoteRow(len = STEPS) {
  return new Array(len).fill(-1); // -1 = no note, else ladder row index
}

export function defaultTrack() {
  return {
    version: 1,
    name: "Новый трек",
    bpm: 92,
    swing: 0.16,
    steps: STEPS,
    seed: 1,
    root: 57, // A3
    scale: "minorPentatonic",
    drums: {
      kick: emptyRow(),
      snare: emptyRow(),
      hat: emptyRow(),
      clap: emptyRow(),
    },
    drumVol: { kick: 1, snare: 0.9, hat: 0.55, clap: 0.8 },
    drumMute: { kick: false, snare: false, hat: false, clap: false },
    synths: {
      bass: { wave: "square", notes: emptyNoteRow(), vol: 0.85, octave: 0, crush: 0, mute: false },
      lead: { wave: "pulse25", notes: emptyNoteRow(), vol: 0.6, octave: 1, crush: 0.35, mute: false },
      arp: { wave: "triangle", notes: emptyNoteRow(), vol: 0.5, octave: 1, crush: 0, mute: false },
    },
  };
}

// Migrate/repair a possibly-partial track object into a full valid one.
export function normalizeTrack(raw) {
  const t = defaultTrack();
  if (!raw || typeof raw !== "object") return t;
  const clampRow = (row, filler) => {
    const out = filler === -1 ? emptyNoteRow() : emptyRow();
    if (Array.isArray(row)) for (let i = 0; i < STEPS; i++) if (row[i] != null) out[i] = row[i];
    return out;
  };
  t.name = typeof raw.name === "string" ? raw.name : t.name;
  t.bpm = clampNum(raw.bpm, 40, 220, t.bpm);
  t.swing = clampNum(raw.swing, 0, 0.6, t.swing);
  t.seed = Number.isFinite(raw.seed) ? raw.seed | 0 : t.seed;
  t.root = clampNum(raw.root, 24, 84, t.root) | 0;
  t.scale = SCALES[raw.scale] ? raw.scale : t.scale;
  if (raw.drums) for (const id of DRUM_IDS) t.drums[id] = clampRow(raw.drums[id], 0);
  if (raw.drumVol) for (const id of DRUM_IDS) t.drumVol[id] = clampNum(raw.drumVol[id], 0, 1.5, t.drumVol[id]);
  if (raw.drumMute) for (const id of DRUM_IDS) t.drumMute[id] = !!raw.drumMute[id];
  if (raw.synths)
    for (const id of SYNTH_IDS) {
      const s = raw.synths[id] || {};
      const d = t.synths[id];
      d.wave = WAVES.includes(s.wave) ? s.wave : d.wave;
      d.notes = clampRow(s.notes, -1);
      d.vol = clampNum(s.vol, 0, 1.5, d.vol);
      d.octave = clampNum(s.octave, -2, 3, d.octave) | 0;
      d.crush = clampNum(s.crush, 0, 1, d.crush);
      d.mute = !!s.mute;
    }
  return t;
}

function clampNum(v, lo, hi, dflt) {
  if (!Number.isFinite(v)) return dflt;
  return Math.max(lo, Math.min(hi, v));
}

// ---- envelope + waveshape -----------------------------------------------
function env(tRel, dur, a, d, s, r) {
  // simple ADSR over a note of length `dur`; release starts at dur.
  if (tRel < 0) return 0;
  if (tRel < a) return tRel / a;
  if (tRel < a + d) return 1 - (1 - s) * ((tRel - a) / d);
  if (tRel < dur) return s;
  const rt = tRel - dur;
  if (rt < r) return s * (1 - rt / r);
  return 0;
}

function osc(wave, phase) {
  // phase in [0,1)
  switch (wave) {
    case "square":
      return phase < 0.5 ? 1 : -1;
    case "pulse25":
      return phase < 0.25 ? 1 : -1;
    case "triangle":
      return 4 * Math.abs(phase - 0.5) - 1;
    case "saw":
      return 2 * phase - 1;
    default:
      return Math.sin(phase * Math.PI * 2);
  }
}

// ---- core render --------------------------------------------------------
// Returns { left, right, frames } (Float32Array mono channels).
export function renderLoop(rawTrack, sampleRate) {
  const t = normalizeTrack(rawTrack);
  const secPerBeat = 60 / t.bpm;
  const secPer16 = secPerBeat / 4;
  const loopSec = secPer16 * STEPS;
  const frames = Math.ceil(loopSec * sampleRate);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const rand = mulberry32(t.seed || 1);

  const stepTime = (i) => {
    // swing pushes odd 16ths later
    const base = i * secPer16;
    return i % 2 === 1 ? base + t.swing * secPer16 : base;
  };

  const addMono = (dst, start, buf, pan) => {
    // pan: -1..1 → applied by caller choosing dst; here dst is one channel already scaled
    for (let i = 0; i < buf.length; i++) {
      const idx = (start + i) % frames; // wrap so tails loop cleanly
      dst[idx] += buf[i];
    }
  };
  const place = (start, buf, pan) => {
    const lg = Math.min(1, 1 - pan) * 0.5 + 0.5; // pan -1 → left 1
    const rg = Math.min(1, 1 + pan) * 0.5 + 0.5;
    // simpler equal-ish law:
    const l = (1 - Math.max(0, pan)) ;
    const r = (1 + Math.min(0, pan));
    for (let i = 0; i < buf.length; i++) {
      const idx = (start + i) % frames;
      left[idx] += buf[i] * l;
      right[idx] += buf[i] * r;
    }
  };

  // --- drums ---
  const drumPan = { kick: 0, snare: 0.05, hat: -0.25, clap: 0.2 };
  for (const id of DRUM_IDS) {
    if (t.drumMute[id]) continue;
    const vol = t.drumVol[id];
    const row = t.drums[id];
    for (let i = 0; i < STEPS; i++) {
      if (!row[i]) continue;
      const start = Math.floor(stepTime(i) * sampleRate);
      const buf = renderDrum(id, sampleRate, vol, rand);
      place(start, buf, drumPan[id]);
    }
  }

  // --- synths ---
  const ladder = scaleLadder(t.scale, t.root, 8);
  const synthPan = { bass: 0, lead: 0.28, arp: -0.3 };
  for (const id of SYNTH_IDS) {
    const s = t.synths[id];
    if (s.mute) continue;
    const notes = s.notes;
    // note length: hold until next note (legato) for bass, else 1 step-ish
    for (let i = 0; i < STEPS; i++) {
      if (notes[i] < 0) continue;
      let len = 1;
      if (id === "bass") {
        // sustain until the next note
        let j = i + 1;
        while (j < STEPS && notes[j] < 0) { len++; j++; }
      }
      const rowIdx = Math.max(0, Math.min(ladder.length - 1, notes[i]));
      const midi = ladder[rowIdx] + s.octave * 12;
      const start = Math.floor(stepTime(i) * sampleRate);
      const durSec = len * secPer16 * (id === "bass" ? 0.95 : id === "lead" ? 0.9 : 0.6);
      const buf = renderVoice(id, s.wave, midiToFreq(midi), durSec, sampleRate, s.vol, s.crush);
      place(start, buf, synthPan[id]);
    }
  }

  // master soft-clip
  const drive = 1.05;
  for (let i = 0; i < frames; i++) {
    left[i] = Math.tanh(left[i] * drive);
    right[i] = Math.tanh(right[i] * drive);
  }
  return { left, right, frames, sampleRate, loopSec };
}

function renderDrum(id, sr, vol, rand) {
  const len = Math.floor((id === "kick" ? 0.32 : id === "snare" ? 0.2 : id === "clap" ? 0.3 : 0.06) * sr);
  const buf = new Float32Array(len);
  const N = (rand() * 1e9) | 0; // not used, keep rand progressing deterministically per hit
  void N;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    if (id === "kick") {
      const f = 48 + (150 - 48) * Math.exp(-t * 34);
      const amp = Math.exp(-t * 9);
      s = Math.sin(2 * Math.PI * f * t) * amp;
      s += Math.sin(2 * Math.PI * f * 0.5 * t) * amp * 0.3;
    } else if (id === "snare") {
      const noise = rand() * 2 - 1;
      const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 26);
      s = (noise * 0.8 * Math.exp(-t * 22) + tone * 0.6);
    } else if (id === "hat") {
      const noise = rand() * 2 - 1;
      s = noise * Math.exp(-t * 90); // very short metallic tick
    } else if (id === "clap") {
      const noise = rand() * 2 - 1;
      // three bursts
      const burst = Math.exp(-((t % 0.012)) * 400) * (t < 0.05 ? 1 : Math.exp(-(t - 0.05) * 30));
      s = noise * burst * 0.9;
    }
    buf[i] = s * vol * 0.9;
  }
  return buf;
}

function renderVoice(id, wave, freq, durSec, sr, vol, crush) {
  const rel = id === "bass" ? 0.04 : 0.08;
  const total = Math.floor((durSec + rel) * sr);
  const buf = new Float32Array(total);
  // envelope shape per instrument
  const a = id === "bass" ? 0.006 : 0.004;
  const d = id === "lead" ? 0.12 : id === "arp" ? 0.05 : 0.05;
  const sus = id === "bass" ? 0.85 : id === "lead" ? 0.55 : 0.35;
  let phase = 0;
  const inc = freq / sr;
  // vibrato for lead
  const vibRate = 5.5, vibDepth = id === "lead" ? 0.004 : 0;
  // bitcrush
  const bits = crush > 0 ? Math.max(3, Math.round(8 - crush * 5)) : 0;
  const levels = bits ? Math.pow(2, bits) : 0;
  const hold = crush > 0 ? Math.max(1, Math.round(1 + crush * 6)) : 1;
  let held = 0, sampleHold = 0;
  // one-pole lowpass for warmth
  const cutoff = id === "bass" ? 0.28 : id === "lead" ? 0.45 : 0.6;
  let lp = 0;
  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const vib = vibDepth ? 1 + Math.sin(2 * Math.PI * vibRate * t) * vibDepth : 1;
    phase += inc * vib;
    if (phase >= 1) phase -= 1;
    let s = osc(wave, phase);
    // sub-osc for bass body
    if (id === "bass") s = s * 0.8 + osc("triangle", (phase * 0.5) % 1) * 0.4;
    // lowpass
    lp += (s - lp) * cutoff;
    s = lp;
    // bitcrush
    if (levels) {
      if (held <= 0) { sampleHold = Math.round(((s + 1) / 2) * levels) / levels * 2 - 1; held = hold; }
      held--;
      s = sampleHold;
    }
    const e = env(t, durSec, a, d, sus, rel);
    buf[i] = s * e * vol * 0.5;
  }
  return buf;
}

// ---- WAV encode ---------------------------------------------------------
export function encodeWav(left, right, sampleRate) {
  const frames = left.length;
  const channels = 2;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(off, l < 0 ? l * 0x8000 : l * 0x7fff, true); off += 2;
    view.setInt16(off, r < 0 ? r * 0x8000 : r * 0x7fff, true); off += 2;
  }
  return buffer;
}

// ---- track code (share/export) -----------------------------------------
// Compact, URL-safe base64 of the JSON. Small enough to paste in chat.
export function encodeTrackCode(track) {
  const json = JSON.stringify(normalizeTrack(track));
  const b64 = typeof btoa === "function"
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf8").toString("base64");
  return "WF1:" + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeTrackCode(code) {
  let s = String(code || "").trim();
  if (s.startsWith("WF1:")) s = s.slice(4);
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const json = typeof atob === "function"
    ? decodeURIComponent(escape(atob(s)))
    : Buffer.from(s, "base64").toString("utf8");
  return normalizeTrack(JSON.parse(json));
}

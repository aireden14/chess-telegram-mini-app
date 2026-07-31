// WAVE FORGE — curated presets.
// Two groups: "style" (жанровые заготовки) and "track" (полные композиции из
// нескольких частей с аранжировкой). Каждый пресет: темп/лад/настройки синтов
// + parts (16-шаговые паттерны) + song (порядок частей). Мелодии в группе
// "track" — общественное достояние (народные / классика) либо наши оригиналы
// "в стиле". applyPreset() переносит всё на живой трек, сохраняя имя.

const K = (s) => { const r = new Array(16).fill(0); for (let i = 0; i < 16 && i < s.length; i++) if (s[i] === "x") r[i] = 1; return r; };
const N = (s) => { const r = new Array(16).fill(-1); for (let i = 0; i < 16 && i < s.length; i++) if (s[i] !== ".") r[i] = parseInt(s[i], 36); return r; };
// one part from compact strings: drums kick/snare/hat/clap + notes bass/lead/arp
const P = ({ k = "", s = "", h = "", c = "", b = "", l = "", a = "" }) => ({
  drums: { kick: K(k), snare: K(s), hat: K(h), clap: K(c) },
  notes: { bass: N(b), lead: N(l), arp: N(a) },
});

const FOUR = "x...x...x...x...";
const BACK = "....x.......x...";
const HAT8 = "x.x.x.x.x.x.x.x.";
const HAT16 = "xxxxxxxxxxxxxxxx";
const OFFHAT = "..x...x...x...x.";

export const PRESETS = [
  // ======================= СТИЛИ (короткие заготовки → теперь мини-треки) ==
  {
    id: "synthwave", label: "Синтвейв", emoji: "🌆", group: "style",
    bpm: 100, swing: 0.08, scale: "minor", root: 57,
    synths: {
      bass: { wave: "saw", octave: -1, crush: 0 },
      lead: { wave: "pulse25", octave: 1, crush: 0.25 },
      arp: { wave: "triangle", octave: 1, crush: 0 },
    },
    parts: [
      P({ k: FOUR, s: BACK, h: OFFHAT, b: "0.0.5.5.3.3.4.4.", l: "7...5...4...5...", a: "0.4.7.4.0.4.7.4." }),
      P({ k: FOUR, s: BACK, h: OFFHAT, c: BACK, b: "3.3.5.5.0.0.4.4.", l: "7...5...4...2...", a: "2.4.7.4.2.4.7.4." }),
      P({ k: "x...............", h: OFFHAT, b: "0.......5.......", l: "7...............", a: "0.4.7.4.0.4.7.4." }),
    ],
    song: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 1, 1],
  },
  {
    id: "lofi", label: "Лоу-фай", emoji: "🎧", group: "style",
    bpm: 76, swing: 0.32, scale: "dorian", root: 55,
    synths: {
      bass: { wave: "triangle", octave: -1, crush: 0 },
      lead: { wave: "triangle", octave: 1, crush: 0.1 },
      arp: { wave: "square", octave: 0, crush: 0 },
    },
    parts: [
      P({ k: "x.....x...x.....", s: BACK, h: HAT8, b: "0.......4.......", l: "4...6..5..4.3...", a: "2...4...5...4..." }),
      P({ k: "x.....x...x....x", s: BACK, h: HAT8, b: "2.......5.......", l: "6...5..4..3.2...", a: "4...5...6...5..." }),
      P({ h: HAT8, b: "0...............", l: "....4...3...2..." }),
    ],
    song: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 0, 1],
  },
  {
    id: "hiphop", label: "Хип-хоп", emoji: "🔥", group: "style",
    bpm: 88, swing: 0.22, scale: "minorPentatonic", root: 53,
    synths: {
      bass: { wave: "square", octave: -1, crush: 0.2 },
      lead: { wave: "pulse25", octave: 1, crush: 0.4 },
      arp: { wave: "triangle", octave: 1, crush: 0.2 },
    },
    parts: [
      P({ k: "x....x..x.x.....", s: BACK, h: "x.xxx.x.x.xxx.x.", c: BACK, b: "0..0.3..2..1....", l: ".4...6....4.3..." }),
      P({ k: "x....x..x.x....x", s: BACK, h: "x.xxx.x.x.xxx.x.", c: BACK, b: "0..0.3..2..3.5..", l: ".4...6....7.6.4." }),
      P({ k: "x.......x.......", h: "x.xxx.x.x.xxx.x.", b: "0..0............", a: "4...6...7...6..." }),
    ],
    song: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1],
  },
  {
    id: "house", label: "Хаус", emoji: "🪩", group: "style",
    bpm: 124, swing: 0, scale: "minor", root: 57,
    synths: {
      bass: { wave: "saw", octave: -1, crush: 0 },
      lead: { wave: "square", octave: 1, crush: 0.2 },
      arp: { wave: "pulse25", octave: 1, crush: 0 },
    },
    parts: [
      P({ k: FOUR, h: OFFHAT, c: BACK, b: "..0...0...5...3.", l: "7...4...5...7...", a: "0.2.4.5.4.2.0.2." }),
      P({ k: FOUR, h: OFFHAT, c: BACK, b: "..0...0...3...5.", l: "7...4...5...2...", a: "0.2.4.5.4.2.0.2." }),
      P({ h: HAT16, c: FOUR, a: "0.2.4.5.7.5.4.2." }),
    ],
    song: [0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1],
  },
  {
    id: "chiptune", label: "Чиптюн", emoji: "👾", group: "style",
    bpm: 142, swing: 0, scale: "majorPentatonic", root: 60,
    synths: {
      bass: { wave: "square", octave: -1, crush: 0.3 },
      lead: { wave: "pulse25", octave: 1, crush: 0.5 },
      arp: { wave: "square", octave: 2, crush: 0.4 },
    },
    parts: [
      P({ k: "x...x...x...x..x", s: BACK, h: HAT8, b: "0.0.4.4.5.5.4.2.", l: "47.547.247.547.7", a: "0247024702470247" }),
      P({ k: "x...x...x...x..x", s: BACK, h: HAT8, b: "0.0.2.2.3.3.4.4.", l: "7.4.5.4.7.4.5.2.", a: "0247024702470247" }),
      P({ k: FOUR, s: BACK, h: HAT8, b: "0...4...0...4...", l: "0.2.4.7.7.7.....", a: "0.2.4.7.0.2.4.7." }),
    ],
    song: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 1, 2],
  },

  // ======================= ПОЛНЫЕ ТРЕКИ ====================================
  {
    // Народная «Коробейники» — та самая тема из Тетриса. Общественное достояние.
    id: "tetris", label: "Тетрис", emoji: "🕹", group: "track",
    bpm: 149, swing: 0, scale: "minor", root: 57,
    synths: {
      bass: { wave: "square", octave: -1, crush: 0.2, vol: 0.95 },
      lead: { wave: "pulse25", octave: 1, crush: 0.45, vol: 0.7 },
      arp: { wave: "triangle", octave: 2, crush: 0.3, vol: 0.35 },
    },
    parts: [
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.4.0.4.0.4.0.4.", l: "4...1.2.3...2.1.", a: "..7...4...7...4." }), // 0: E-B-C-D-C-B
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.4.0.4.0.4.0.4.", l: "0...0.2.4...3.2.", a: "..7...4...7...4." }), // 1: A-A-C-E-D-C
      P({ k: FOUR, s: BACK, h: HAT8, b: "4.1.4.1.4.1.4.1.", l: "1.....2.3...4...", a: "..4...1...4...1." }), // 2: B-C-D-E
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.4.0.4.0.4.0...", l: "2...0...0.......", a: "..7...4...7...4." }), // 3: C-A-A (каденция)
      P({ k: FOUR, s: BACK, h: HAT8, b: "3.0.3.0.3.0.3.0.", l: "..3...5.7...6.5.", a: "..3...7...3...7." }), // 4: D-F-A-G-F
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.4.0.4.0.4.0.4.", l: "4.....2.4...3.2.", a: "..7...4...7...4." }), // 5: E-C-E-D-C
      P({ k: FOUR, s: BACK, h: HAT8, b: "4.1.4.1.4.1.4.1.", l: "1...1.2.3...4...", a: "..4...1...4...1." }), // 6: B-B-C-D-E
      P({ h: HAT8, l: "4...1.2.3...2.1." }),                                                                // 7: интро/брейк
    ],
    song: [7, 7, 0, 1, 2, 3, 4, 5, 6, 3, 0, 1, 2, 3, 4, 5, 6, 3, 7, 0, 1, 2, 3, 4, 5, 6, 3, 3],
  },
  {
    // Э. Григ, «В пещере горного короля» (1875). Общественное достояние.
    id: "grieg", label: "Горный король", emoji: "🏔", group: "track",
    bpm: 116, swing: 0, scale: "minor", root: 57,
    synths: {
      bass: { wave: "triangle", octave: -1, crush: 0, vol: 1.0 },
      lead: { wave: "square", octave: 1, crush: 0.3, vol: 0.65 },
      arp: { wave: "square", octave: 2, crush: 0.4, vol: 0.4 },
    },
    parts: [
      P({ h: FOUR, b: "0...4...0...4...", l: "0.1.2.3.4.2.4..." }),                                   // 0: тихо, тема вверх
      P({ h: FOUR, b: "0...4...0...4...", l: "5.3.5...4.2.4..." }),                                   // 1: тихо, ответ
      P({ h: FOUR, b: "4...4...4...4...", l: "5.3.5...4......." }),                                   // 2: тихо, каденция
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.4.0.4.0.4.0.4.", l: "0.1.2.3.4.2.4...", a: "0.1.2.3.4.2.4..." }), // 3: громко
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.4.0.4.0.4.0.4.", l: "5.3.5...4.2.4...", a: "5.3.5...4.2.4..." }), // 4: громко, ответ
      P({ k: FOUR, s: BACK, h: HAT8, c: BACK, b: "4.4.4.4.4.4.4.4.", l: "5.3.5...4.......", a: "5.3.5...4......." }), // 5: громко, каденция
      P({ k: HAT8, s: FOUR, h: HAT16, c: FOUR, b: "0.0.0.0.0.0.0.0.", l: "0...4...7...7...", a: "0...4...7...7..." }), // 6: финальные удары
    ],
    song: [0, 1, 0, 2, 0, 1, 0, 2, 3, 4, 3, 5, 3, 4, 3, 5, 3, 4, 3, 5, 6, 6],
  },
  {
    // Л. ван Бетховен, «Ода к радости» (9-я симфония, 1824). Общественное достояние.
    id: "ode", label: "Ода к радости", emoji: "🎼", group: "track",
    bpm: 132, swing: 0, scale: "major", root: 60,
    synths: {
      bass: { wave: "square", octave: -1, crush: 0.1, vol: 0.9 },
      lead: { wave: "pulse25", octave: 1, crush: 0.4, vol: 0.7 },
      arp: { wave: "triangle", octave: 2, crush: 0.2, vol: 0.35 },
    },
    parts: [
      P({ h: HAT8, b: "0.......4.......", l: "2...2...3...4..." }),                                   // 0: E E F G
      P({ h: HAT8, b: "4.......0.......", l: "4...3...2...1..." }),                                   // 1: G F E D
      P({ h: HAT8, b: "3.......0.......", l: "0...0...1...2..." }),                                   // 2: C C D E
      P({ h: HAT8, b: "4.......4.......", l: "2.....1.1......." }),                                   // 3: E. D D
      P({ h: HAT8, b: "4.......0.......", l: "1.....0.0......." }),                                   // 4: D. C C
      P({ k: FOUR, s: BACK, h: HAT8, b: "4.4.4.4.0.0.0.0.", l: "1...1...2...0...", a: "..1...4...1...4." }), // 5: B-фраза
      P({ k: FOUR, s: BACK, h: HAT8, b: "4.4.4.4.4.4.4.4.", l: "1...2.3.2...1...", a: "..1...4...1...4." }), // 6: B-фраза 2
      P({ k: FOUR, s: BACK, h: HAT8, b: "0.0.0.0.4.4.4.4.", l: "2...2...3...4...", a: "..0...4...2...4." }), // 7: громко E E F G
      P({ k: FOUR, s: BACK, h: HAT8, b: "4.4.4.4.0.0.0.0.", l: "4...3...2...1...", a: "..0...4...2...4." }), // 8: громко G F E D
      P({ k: FOUR, s: BACK, h: HAT8, b: "3.3.3.3.0.0.0.0.", l: "0...0...1...2...", a: "..0...4...2...4." }), // 9: громко C C D E
      P({ k: FOUR, s: BACK, h: HAT8, c: BACK, b: "4.4.4.4.0.0.0.0.", l: "1.....0.0.......", a: "..0...4...2...4." }), // 10: громко D. C C
    ],
    song: [0, 1, 2, 3, 0, 1, 2, 4, 5, 6, 5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10],
  },
  {
    // Оригинальная боевая тема «в стиле Андертейл» — наша собственная мелодия.
    id: "skeleton", label: "Скелет-битва", emoji: "💀", group: "track",
    bpm: 122, swing: 0, scale: "minor", root: 50,
    synths: {
      bass: { wave: "square", octave: -1, crush: 0.3, vol: 1.0 },
      lead: { wave: "pulse25", octave: 1, crush: 0.5, vol: 0.7 },
      arp: { wave: "square", octave: 2, crush: 0.5, vol: 0.3 },
    },
    parts: [
      P({ k: FOUR, s: BACK, h: HAT16, b: "0.0.0.0.5.5.3.3." }),                                       // 0: интро — бас+драмы
      P({ k: "x..x..x...x..x..", s: BACK, h: HAT16, b: "0.0.0.0.0.0.3.3.", l: "7...4.5.7...4.5." }),  // 1: тема A
      P({ k: "x..x..x...x..x..", s: BACK, h: HAT16, b: "0.0.0.0.4.4.3.3.", l: "7...4.5.6.5.4.2." }),  // 2: тема A'
      P({ k: FOUR, s: BACK, h: HAT16, b: "3.3.3.3.2.2.2.2.", l: "4.5.6.6.6.5.4.5." }),                // 3: тема B
      P({ h: HAT8, b: "0.......0.......", a: "0.4.7.4.0.4.7.4." }),                                   // 4: брейк
      P({ k: FOUR, s: BACK, h: HAT16, c: BACK, b: "0.0.5.5.3.3.4.4.", l: "7.7.4.5.7.7.4.2." }),       // 5: финал
    ],
    song: [0, 0, 1, 2, 1, 2, 3, 3, 1, 2, 4, 4, 1, 2, 1, 2, 3, 3, 5, 5, 1, 2],
  },
];

// Merge a preset onto a track object in place (keeps name; overwrites musical
// content, parts and arrangement). Mutates and returns the track.
export function applyPreset(track, preset) {
  if (!preset) return track;
  track.bpm = preset.bpm ?? track.bpm;
  track.swing = preset.swing ?? track.swing;
  track.scale = preset.scale ?? track.scale;
  track.root = preset.root ?? track.root;
  for (const id of ["kick", "snare", "hat", "clap"]) {
    if (track.drumMute) track.drumMute[id] = false;
  }
  for (const id of ["bass", "lead", "arp"]) {
    const p = preset.synths?.[id];
    const s = track.synths[id];
    if (p) {
      if (p.wave) s.wave = p.wave;
      if (p.octave != null) s.octave = p.octave;
      if (p.crush != null) s.crush = p.crush;
      if (p.vol != null) s.vol = p.vol;
    }
    s.mute = false;
  }
  // deep-copy parts so edits never mutate the preset itself
  track.parts = preset.parts.map((pt) => ({
    drums: {
      kick: pt.drums.kick.slice(), snare: pt.drums.snare.slice(),
      hat: pt.drums.hat.slice(), clap: pt.drums.clap.slice(),
    },
    notes: { bass: pt.notes.bass.slice(), lead: pt.notes.lead.slice(), arp: pt.notes.arp.slice() },
  }));
  track.song = preset.song.slice();
  return track;
}

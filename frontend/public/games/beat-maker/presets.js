// WAVE FORGE — curated one-tap style starters.
// Each preset is a partial track: drum rows + per-synth note rows (ladder-row
// indices, -1 = silence) + tempo/scale/wave tweaks. applyPreset() merges it
// onto the live track, keeping the user's name. Pure data, no deps.

const K = (s) => s.split("").map((c) => (c === "x" ? 1 : 0)); // "x..." -> [1,0,0,...]
// melodic helper: string of hex-ish digits or "." -> ladder row per step
const N = (s) => s.split("").map((c) => (c === "." ? -1 : parseInt(c, 36)));

export const PRESETS = [
  {
    id: "synthwave",
    label: "Синтвейв",
    emoji: "🌆",
    bpm: 100, swing: 0.08, scale: "minor", root: 57,
    drums: {
      kick:  K("x...x...x...x..."),
      snare: K("....x.......x..."),
      hat:   K("..x...x...x...x."),
      clap:  K("................"),
    },
    synths: {
      bass: { wave: "saw",    octave: -1, crush: 0,    notes: N("0.0.5.5.3.3.4.4.") },
      lead: { wave: "pulse25", octave: 1, crush: 0.25, notes: N("7...5...4...5...") },
      arp:  { wave: "triangle", octave: 1, crush: 0,   notes: N("0.4.7.4.0.4.7.4.") },
    },
  },
  {
    id: "lofi",
    label: "Лоу-фай",
    emoji: "🎧",
    bpm: 76, swing: 0.32, scale: "dorian", root: 55,
    drums: {
      kick:  K("x.....x...x....."),
      snare: K("....x.......x..."),
      hat:   K("x.x.x.x.x.x.x.x."),
      clap:  K("................"),
    },
    synths: {
      bass: { wave: "triangle", octave: -1, crush: 0,   notes: N("0.......4.......") },
      lead: { wave: "triangle", octave: 1,  crush: 0.1, notes: N("4...6..5..4.3...") },
      arp:  { wave: "square",   octave: 0,  crush: 0,   notes: N("2...4...5...4...") },
    },
  },
  {
    id: "hiphop",
    label: "Хип-хоп",
    emoji: "🔥",
    bpm: 88, swing: 0.22, scale: "minorPentatonic", root: 53,
    drums: {
      kick:  K("x....x..x.x....."),
      snare: K("....x.......x..."),
      hat:   K("x.xxx.x.x.xxx.x."),
      clap:  K("....x.......x..."),
    },
    synths: {
      bass: { wave: "square",  octave: -1, crush: 0.2, notes: N("0..0.3..2..1....") },
      lead: { wave: "pulse25", octave: 1,  crush: 0.4, notes: N(".4...6....4.3...") },
      arp:  { wave: "triangle", octave: 0, crush: 0,   notes: N("................") },
    },
  },
  {
    id: "house",
    label: "Хаус",
    emoji: "🪩",
    bpm: 124, swing: 0, scale: "minor", root: 57,
    drums: {
      kick:  K("x...x...x...x..."),
      snare: K("................"),
      hat:   K("..x...x...x...x."),
      clap:  K("....x.......x..."),
    },
    synths: {
      bass: { wave: "saw",     octave: -1, crush: 0,   notes: N("..0...0...5...3.") },
      lead: { wave: "square",  octave: 1,  crush: 0.2, notes: N("7...4...5...7...") },
      arp:  { wave: "pulse25", octave: 1,  crush: 0,   notes: N("0.2.4.5.4.2.0.2.") },
    },
  },
  {
    id: "chiptune",
    label: "Чиптюн",
    emoji: "👾",
    bpm: 142, swing: 0, scale: "majorPentatonic", root: 60,
    drums: {
      kick:  K("x...x...x...x..x"),
      snare: K("....x.......x..."),
      hat:   K("x.x.x.x.x.x.x.x."),
      clap:  K("................"),
    },
    synths: {
      bass: { wave: "square",  octave: -1, crush: 0.3, notes: N("0.0.4.4.5.5.4.2.") },
      lead: { wave: "pulse25", octave: 1,  crush: 0.5, notes: N("47.547.247.547.7") },
      arp:  { wave: "square",  octave: 2,  crush: 0.4, notes: N("0247024702470247") },
    },
  },
];

// Merge a preset onto a track object in place (keeps name; overwrites musical
// content). Mutates and returns the track.
export function applyPreset(track, preset) {
  if (!preset) return track;
  track.bpm = preset.bpm ?? track.bpm;
  track.swing = preset.swing ?? track.swing;
  track.scale = preset.scale ?? track.scale;
  track.root = preset.root ?? track.root;
  for (const id of ["kick", "snare", "hat", "clap"]) {
    if (preset.drums?.[id]) track.drums[id] = preset.drums[id].slice(0, 16);
    if (track.drumMute) track.drumMute[id] = false;
  }
  for (const id of ["bass", "lead", "arp"]) {
    const p = preset.synths?.[id];
    if (!p) continue;
    const s = track.synths[id];
    if (p.wave) s.wave = p.wave;
    if (p.octave != null) s.octave = p.octave;
    if (p.crush != null) s.crush = p.crush;
    if (p.notes) s.notes = p.notes.slice(0, 16);
    s.mute = false;
  }
  return track;
}

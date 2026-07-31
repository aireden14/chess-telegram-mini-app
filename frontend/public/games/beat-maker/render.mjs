#!/usr/bin/env node
// WAVE FORGE — agent-side renderer.
// Turns a saved beat (a "WF1:" track code, or a track JSON file) into a .wav,
// using the exact same synth-core the app plays. This is how the assistant
// "pulls out" tracks the user made in GamePass.
//
// Usage:
//   node render.mjs "WF1:......"            -> writes ./<name>.wav
//   node render.mjs track.json out.wav      -> render a JSON track to out.wav
//   node render.mjs "WF1:..." out.wav       -> render a code to out.wav

import fs from "node:fs";
import path from "node:path";
import { renderLoop, encodeWav, decodeTrackCode, normalizeTrack } from "./synth-core.js";

const SR = 44100;

function loadTrack(arg) {
  if (!arg) throw new Error("Передай код трека (WF1:/WF2:...) или путь к JSON-файлу.");
  if (arg.startsWith("WF1:") || arg.startsWith("WF2:")) return decodeTrackCode(arg);
  if (fs.existsSync(arg)) {
    const raw = JSON.parse(fs.readFileSync(arg, "utf8"));
    // support both a bare track and a library entry { data: {...} }
    return normalizeTrack(raw.data || raw);
  }
  // maybe it's a bare base64 without prefix
  return decodeTrackCode(arg);
}

function safeName(s) {
  return String(s || "wave-forge").replace(/[^\w\-а-яА-Я ]+/g, "").trim().replace(/\s+/g, "_") || "wave-forge";
}

function main() {
  const [, , input, outArg] = process.argv;
  const track = loadTrack(input);
  const { left, right } = renderLoop(track, SR);
  const wav = Buffer.from(encodeWav(left, right, SR));
  const out = outArg || `${safeName(track.name)}.wav`;
  fs.writeFileSync(out, wav);
  const secs = (left.length / SR).toFixed(2);
  console.log(`✓ ${out}  (${track.name} · ${track.bpm} BPM · ${track.scale} · ${secs}s loop)`);
  console.log(path.resolve(out));
}

main();

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Save = require("../engine/save.js");

function storageFrom(entries = {}, throwOnSet = false) {
  const values = new Map(Object.entries(entries));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (throwOnSet) throw new Error("quota");
      values.set(key, value);
    },
    value(key) {
      return values.get(key);
    },
  };
}

const options = {
  version: 3,
  key: "gamepass.volt-runner.v3",
  previousKeys: ["gamepass.volt-runner.v2", "gamepass.volt-runner.v1"],
  levelCount: 6,
  rankForRun(index, time, deaths) {
    const target = 20 - index * 0.2;
    return deaths === 0 && time <= target ? "S" : deaths <= 1 ? "A" : "C";
  },
};

test("corrupt v3 falls back to a valid v2 save", () => {
  const storage = storageFrom({
    "gamepass.volt-runner.v3": "{broken",
    "gamepass.volt-runner.v2": JSON.stringify({
      unlocked: 4,
      sound: false,
      best: { 0: { time: 19.5, score: 1200, deaths: 0 } },
    }),
  });
  const save = Save.load(storage, options);
  assert.equal(save.schemaVersion, 3);
  assert.equal(save.unlocked, 4);
  assert.equal(save.sound, false);
  assert.equal(save.best[0].rank, "S");
});

test("v1 migration preserves valid records and reranks with deaths", () => {
  const storage = storageFrom({
    "gamepass.volt-runner.v1": JSON.stringify({
      unlocked: 99,
      best: {
        0: { time: 18.2, rank: "S", score: 42.9, deaths: 2 },
        1: { time: "bad", score: 500 },
      },
    }),
  });
  const save = Save.load(storage, options);
  assert.equal(save.unlocked, 6);
  assert.equal(save.best[0].rank, "C");
  assert.equal(save.best[0].score, 42);
  assert.equal(save.best[1], undefined);
});

test("null and malformed fields recover to safe defaults", () => {
  const save = Save.sanitizeSave(
    { unlocked: -4, best: null, leftHanded: "yes" },
    options,
  );
  assert.deepEqual(save, {
    schemaVersion: 3,
    unlocked: 1,
    best: {},
    sound: true,
    leftHanded: false,
  });
});

test("left-handed layout persists in v3", () => {
  const storage = storageFrom();
  const save = Save.sanitizeSave({ leftHanded: true }, options);
  assert.equal(Save.persist(storage, options.key, save, options.version), true);
  assert.equal(JSON.parse(storage.value(options.key)).leftHanded, true);
});

test("storage quota failure is contained", () => {
  const storage = storageFrom({}, true);
  assert.equal(
    Save.persist(storage, options.key, Save.sanitizeSave(null, options), 3),
    false,
  );
});

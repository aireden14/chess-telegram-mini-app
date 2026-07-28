(function attachVoltSave(globalScope) {
  "use strict";

  function sanitizeBest(rawBest, options) {
    const clean = {};
    if (!rawBest || typeof rawBest !== "object" || Array.isArray(rawBest)) {
      return clean;
    }

    for (let index = 0; index < options.levelCount; index += 1) {
      const entry = rawBest[index];
      const time = Number(entry?.time);
      const scoreValue = Number(entry?.score);
      const deaths = Math.max(0, Math.floor(Number(entry?.deaths) || 0));
      if (!entry || !Number.isFinite(time) || time <= 0) continue;
      clean[index] = {
        time,
        rank: options.rankForRun(index, time, deaths),
        score: Number.isFinite(scoreValue)
          ? Math.max(0, Math.floor(scoreValue))
          : 0,
        deaths,
      };
    }
    return clean;
  }

  function sanitizeSave(raw, options) {
    const candidate =
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      schemaVersion: options.version,
      unlocked: Math.max(
        1,
        Math.min(options.levelCount, Math.floor(Number(candidate.unlocked) || 1)),
      ),
      best: sanitizeBest(candidate.best, options),
      sound: candidate.sound !== false,
      leftHanded: candidate.leftHanded === true,
    };
  }

  function load(storage, options) {
    for (const key of [options.key, ...(options.previousKeys || [])]) {
      try {
        const raw = JSON.parse(storage.getItem(key) || "null");
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          return sanitizeSave(raw, options);
        }
      } catch {
        // A corrupt newest save must not block migration from an older key.
      }
    }
    return sanitizeSave(null, options);
  }

  function persist(storage, key, save, version) {
    try {
      save.schemaVersion = version;
      storage.setItem(key, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({ sanitizeBest, sanitizeSave, load, persist });
  globalScope.VoltSave = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

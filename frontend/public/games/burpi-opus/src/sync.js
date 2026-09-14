// Синхронизация дневника с сервером GamePass — общий счётчик с Apple Watch.
//
// У приложения нет своей авторизации: внутри GamePass запросы уходят через
// оболочку (postMessage → api GamePass → /api/burpi-opus), и токен в iframe
// не попадает. Вне GamePass синхронизации нет, всё работает как раньше.
//
// Как понять, что отправлять. В state.sync.known лежит отпечаток каждой
// записи в том виде, в каком её знает сервер. Сравнение с дневником ловит всё
// сразу — новую тренировку, удаление, «Вернуть», импорт, — без правок в
// каждом месте, где меняются записи. Запись, которая пропала из дневника, но
// есть в known, уходит на сервер как удалённая, и часы её не воскрешают.

import { isEmbedded } from "./tg.js?v=1.9.0";
import { saveState, STORAGE_KEY } from "./core.js?v=1.9.0";

const BACKUP_KEY = `${STORAGE_KEY}.backup-before-sync`;
const DEBOUNCE_MS = 1200;
const POLL_MS = 60_000;
// Бесплатный сервер засыпает и просыпается до минуты.
const REQUEST_TIMEOUT_MS = 75_000;
const PUSH_CHUNK = 400;
// Во время тренировки экран не перерисовываем из-за чужих изменений.
const BUSY_VIEWS = new Set(["workout", "finish", "levels"]);

let app = null;
let timer = null;
let running = false;
let again = false;
let seq = 0;
const waiting = new Map();

export const syncStatus = { state: "idle", error: null };

/* ------------------------------------------------------------- транспорт */

function request(op, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!isEmbedded()) {
      reject(new Error("standalone"));
      return;
    }
    seq += 1;
    const reqId = `r${Date.now().toString(36)}${seq}`;
    const t = setTimeout(() => {
      waiting.delete(reqId);
      reject(new Error("timeout"));
    }, REQUEST_TIMEOUT_MS);
    waiting.set(reqId, { resolve, reject, t });
    try {
      // Оболочка GamePass отдаёт приложение со своего же адреса — чужому
      // родителю дневник не уйдёт.
      window.parent.postMessage(
        { source: "burpi-opus", type: "burpi-sync", reqId, op, payload },
        window.location.origin,
      );
    } catch (error) {
      clearTimeout(t);
      waiting.delete(reqId);
      reject(error);
    }
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.source === window) return;
  const d = event.data;
  if (!d || d.source !== "gamepass-shell" || d.type !== "burpi-sync-result") return;
  const w = waiting.get(d.reqId);
  if (!w) return;
  waiting.delete(d.reqId);
  clearTimeout(w.t);
  if (d.ok) w.resolve(d.data ?? {});
  else w.reject(Object.assign(new Error(d.error || "error"), { status: d.status }));
});

/* ------------------------------------------------------------- модель */

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}.${text.length.toString(36)}`;
}

const fingerprint = (value) => hash(JSON.stringify(value));

function ensure(state) {
  if (!state.sync || typeof state.sync !== "object") state.sync = {};
  const s = state.sync;
  if (typeof s.migrated !== "boolean") s.migrated = false;
  if (!Number.isFinite(s.cursor)) s.cursor = 0;
  if (!s.known || typeof s.known !== "object") s.known = {};
  if (s.configHash === undefined) s.configHash = null;
  if (s.lastOkAt === undefined) s.lastOkAt = null;
  return s;
}

// Общие настройки: уровни, пояс и отдых. Меняются только в вебе, часы читают.
function configOf(state) {
  const s = state.settings ?? {};
  return {
    activeExerciseId: state.activeExerciseId,
    exercises: state.exercises,
    settings: {
      timeZone: s.timeZone ?? null,
      streakFloor: Number(s.streakFloor) || 0,
      restEnabled: s.restEnabled !== false,
      restSeconds: Number(s.restSeconds) || 75,
      lastLevelByExercise: s.lastLevelByExercise ?? {},
    },
  };
}

function adoptConfig(state, cfg) {
  if (Array.isArray(cfg.exercises) && cfg.exercises.length) state.exercises = cfg.exercises;
  if (cfg.activeExerciseId && state.exercises.some((e) => e.id === cfg.activeExerciseId)) {
    state.activeExerciseId = cfg.activeExerciseId;
  }
  const s = cfg.settings ?? {};
  Object.assign(state.settings, {
    timeZone: s.timeZone ?? null,
    streakFloor: Number(s.streakFloor) || 0,
    restEnabled: s.restEnabled !== false,
    restSeconds: Number(s.restSeconds) || state.settings.restSeconds || 75,
    lastLevelByExercise: s.lastLevelByExercise ?? state.settings.lastLevelByExercise ?? {},
  });
}

function finished(state) {
  return state.sessions.filter((s) => s && s.id && s.finishedAt);
}

// Что отличается от известного серверу: новые/изменённые записи и удалённые.
function diff(state) {
  const known = ensure(state).known;
  const out = [];
  const seen = new Set();
  finished(state).forEach((s) => {
    seen.add(s.id);
    const h = fingerprint(s);
    if (known[s.id] !== h) out.push({ id: s.id, data: s, deleted: false, h });
  });
  Object.keys(known).forEach((id) => {
    if (!seen.has(id)) out.push({ id, deleted: true });
  });
  return out;
}

export function pendingCount(state) {
  if (!isEmbedded()) return 0;
  return diff(state).length;
}

function applyRemote(state, entries) {
  const known = state.sync.known;
  let changed = false;
  entries.forEach((e) => {
    if (!e || typeof e.id !== "string") return;
    const index = state.sessions.findIndex((s) => s.id === e.id);
    const local = index >= 0 ? state.sessions[index] : null;

    if (e.deleted) {
      if (local) {
        state.sessions.splice(index, 1);
        changed = true;
      }
      delete known[e.id];
      return;
    }

    const data = e.data;
    if (!data || typeof data !== "object" || !data.finishedAt) return;
    const record = { ...data, id: e.id };
    const h = fingerprint(record);
    if (local) {
      const localHash = fingerprint(local);
      if (localHash === h) {
        known[e.id] = h;
        return;
      }
      // Локальная правка ещё не ушла на сервер — её отправит diff.
      if (known[e.id] && known[e.id] !== localHash) return;
      state.sessions[index] = record;
    } else {
      state.sessions.push(record);
    }
    known[e.id] = h;
    changed = true;
  });
  if (changed) state.sessions.sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
  return changed;
}

function backupOnce() {
  try {
    if (localStorage.getItem(BACKUP_KEY)) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* хранилище недоступно — резервной копии не будет, данные всё равно локально */
  }
}

function setStatus(state, error = null) {
  syncStatus.state = state;
  syncStatus.error = error;
  if (app && app.view === "settings") app.render();
}

/* ------------------------------------------------------------- цикл */

async function runSync() {
  if (!app || !isEmbedded()) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  setStatus("syncing");
  try {
    const firstRun = !ensure(app.state).migrated;
    if (firstRun) backupOnce();

    // 1. Сначала забираем чужие изменения: иначе запись, удалённая на другом
    //    устройстве, ушла бы на сервер обратно.
    let changed = false;
    let cursor = app.state.sync.cursor || 0;
    let remoteConfig = null;
    for (let page = 0; page < 20; page += 1) {
      const res = await request("state", { since: cursor });
      ensure(app.state);
      if (applyRemote(app.state, Array.isArray(res.entries) ? res.entries : [])) changed = true;
      if (page === 0) remoteConfig = res.config ?? null;
      if (Number.isFinite(res.cursor)) cursor = res.cursor;
      if (!res.more) break;
    }

    // 2. Настройки: чужие берём, если своих несохранённых правок нет.
    const state = app.state;
    const localHash = fingerprint(configOf(state));
    let pushConfig = false;
    if (remoteConfig && typeof remoteConfig === "object") {
      if (fingerprint(remoteConfig) !== localHash) {
        if (firstRun || state.sync.configHash === localHash) {
          adoptConfig(state, remoteConfig);
          state.sync.configHash = fingerprint(configOf(state));
          changed = true;
        } else {
          pushConfig = true;
        }
      } else {
        state.sync.configHash = localHash;
      }
    } else {
      pushConfig = true;
    }

    // 3. Отправляем своё.
    const outgoing = diff(state);
    const config = pushConfig ? configOf(state) : undefined;
    for (let i = 0; i < Math.max(outgoing.length, pushConfig ? 1 : 0); i += PUSH_CHUNK) {
      const chunk = outgoing.slice(i, i + PUSH_CHUNK);
      await request("push", {
        entries: chunk.map(({ id, data, deleted }) => (deleted ? { id, deleted: true } : { id, data })),
        config: i === 0 ? config : undefined,
      });
      chunk.forEach((e) => {
        if (e.deleted) delete app.state.sync.known[e.id];
        else app.state.sync.known[e.id] = e.h;
      });
    }
    if (config) app.state.sync.configHash = fingerprint(config);

    app.state.sync.cursor = cursor;
    app.state.sync.migrated = true;
    app.state.sync.lastOkAt = Date.now();
    saveState(app.state);

    if (changed) {
      app.applyPreferences();
      if (!BUSY_VIEWS.has(app.view)) app.render();
    }
    setStatus("ok");
  } catch (error) {
    setStatus("error", error?.message || "ошибка");
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync();
    }
  }
}

/* ------------------------------------------------------------- наружу */

export function syncAvailable() {
  return isEmbedded();
}

export function initSync(appRef) {
  app = appRef;
  ensure(app.state);
  if (!isEmbedded()) {
    syncStatus.state = "standalone";
    return;
  }
  runSync();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runSync();
  });
  setInterval(() => {
    if (document.visibilityState === "visible") runSync();
  }, POLL_MS);
}

export function scheduleSync() {
  if (!app || !isEmbedded()) return;
  clearTimeout(timer);
  timer = setTimeout(runSync, DEBOUNCE_MS);
}

export function syncNow() {
  return runSync();
}

export function requestPairCode() {
  return request("pair-code");
}

export function fetchWatchLinks() {
  return request("links");
}

export function unlinkWatches() {
  return request("unlink");
}

// Друзья: мой код-приглашение и недельный рейтинг.
export function fetchFriends() {
  return request("friends");
}

export function addFriend(code) {
  return request("friend-add", { code });
}

export function removeFriend(id) {
  return request("friend-remove", { id });
}

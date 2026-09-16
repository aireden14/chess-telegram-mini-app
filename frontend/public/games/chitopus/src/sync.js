// Синхронизация дневника с сервером GamePass: один счёт в GamePass и в
// веб-версии в браузере.
//
// Два способа дойти до сервера:
//   1) внутри GamePass — через оболочку (postMessage → api GamePass →
//      /api/chitopus); токен в iframe не попадает;
//   2) в браузере — напрямую, с токеном устройства. Токен выдаётся один раз по
//      6-значному коду из настроек Читопуса в GamePass и лежит отдельно от
//      дневника, чтобы не утечь вместе с экспортом.
//
// Что отправлять, понятно из state.sync.known: там отпечаток каждой записи в
// том виде, в каком её знает сервер. Сравнение с дневником ловит всё сразу —
// новую запись, правку книги, удаление, «Вернуть», импорт. Запись, которая
// пропала из дневника, но есть в known, уходит как удалённая.

import { isEmbedded } from "./tg.js?v=1.2.0";
import { saveState, STORAGE_KEY, readingBooks, findBook } from "./core.js?v=1.2.0";

const API = "https://gamepass-all-in-one.onrender.com/api/chitopus";
const ACCOUNT_KEY = "chitopus.account";
const BACKUP_KEY = `${STORAGE_KEY}.backup-before-sync`;
const DEBOUNCE_MS = 1500;
const POLL_MS = 60_000;
// Бесплатный сервер засыпает и просыпается до минуты.
const REQUEST_TIMEOUT_MS = 75_000;
const PUSH_CHUNK = 400;
// Пока человек вводит страницы или пишет отзыв, экран не перерисовываем.
const BUSY_VIEWS = new Set(["log", "finish"]);

let app = null;
let timer = null;
let running = false;
let again = false;
let seq = 0;
const waiting = new Map();

export const syncStatus = { state: "idle", error: null, account: null };

/* ------------------------------------------------------------- аккаунт */

function readAccount() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    return raw && typeof raw.token === "string" ? raw : null;
  } catch {
    return null;
  }
}

function writeAccount(value) {
  try {
    if (value) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(value));
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* хранилище недоступно — вход проживёт до перезагрузки */
  }
}

let account = readAccount();

export function syncAvailable() {
  return isEmbedded() || Boolean(account);
}

export function accountInfo() {
  return account;
}

/* ------------------------------------------------------------- транспорт */

function viaShell(op, payload) {
  return new Promise((resolve, reject) => {
    seq += 1;
    const reqId = `r${Date.now().toString(36)}${seq}`;
    const t = setTimeout(() => {
      waiting.delete(reqId);
      reject(new Error("timeout"));
    }, REQUEST_TIMEOUT_MS);
    waiting.set(reqId, { resolve, reject, t });
    try {
      // Оболочка GamePass отдаёт приложение со своего адреса — чужому
      // родителю дневник не уйдёт.
      window.parent.postMessage(
        { source: "chitopus", type: "chitopus-sync", reqId, op, payload },
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
  if (!d || d.source !== "gamepass-shell" || d.type !== "chitopus-sync-result") return;
  const w = waiting.get(d.reqId);
  if (!w) return;
  waiting.delete(d.reqId);
  clearTimeout(w.t);
  if (d.ok) w.resolve(d.data ?? {});
  else w.reject(Object.assign(new Error(d.error || "error"), { status: d.status }));
});

async function direct(method, path, body, token = account?.token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Reader ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
    return data;
  } finally {
    clearTimeout(t);
  }
}

function request(op, payload = {}) {
  if (isEmbedded()) return viaShell(op, payload);
  if (!account) return Promise.reject(new Error("signed out"));
  if (op === "state") return direct("GET", `/state?since=${encodeURIComponent(payload.since || 0)}`);
  if (op === "push") return direct("POST", "/sync", payload);
  return Promise.reject(new Error("unknown op"));
}

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

export function resetSyncMeta(state) {
  state.sync = {};
  ensure(state);
}

// Общее для всех устройств. Тема, звук, вибро и конфетти — у каждого свои.
function configOf(state) {
  const s = state.settings ?? {};
  return {
    activeBookId: state.activeBookId ?? null,
    settings: {
      dailyGoal: Number(s.dailyGoal) || 30,
      timeZone: s.timeZone ?? null,
      accentCursor: Number(s.accentCursor) || 0,
      seenMilestones: Array.isArray(s.seenMilestones) ? s.seenMilestones : [],
    },
  };
}

function adoptConfig(state, cfg) {
  const s = cfg.settings ?? {};
  Object.assign(state.settings, {
    dailyGoal: Number(s.dailyGoal) || state.settings.dailyGoal,
    timeZone: s.timeZone ?? null,
    accentCursor: Number(s.accentCursor) || 0,
    seenMilestones: Array.isArray(s.seenMilestones) ? s.seenMilestones : state.settings.seenMilestones,
  });
  if (cfg.activeBookId && findBook(state, cfg.activeBookId)) state.activeBookId = cfg.activeBookId;
}

const KINDS = [
  { prefix: "b-", list: "books" },
  { prefix: "s-", list: "sessions" },
];

function records(state) {
  const out = [];
  KINDS.forEach(({ prefix, list }) => {
    (state[list] ?? []).forEach((item) => {
      if (item && typeof item.id === "string") out.push({ key: prefix + item.id, item });
    });
  });
  return out;
}

function diff(state) {
  const known = ensure(state).known;
  const out = [];
  const seen = new Set();
  records(state).forEach(({ key, item }) => {
    seen.add(key);
    const h = fingerprint(item);
    if (known[key] !== h) out.push({ id: key, data: item, deleted: false, h });
  });
  Object.keys(known).forEach((key) => {
    if (!seen.has(key)) out.push({ id: key, deleted: true });
  });
  return out;
}

export function pendingCount(state) {
  if (!syncAvailable()) return 0;
  return diff(state).length;
}

function applyRemote(state, entries) {
  const known = state.sync.known;
  let changed = false;
  entries.forEach((e) => {
    if (!e || typeof e.id !== "string") return;
    const kind = KINDS.find((k) => e.id.startsWith(k.prefix));
    if (!kind) return;
    const id = e.id.slice(kind.prefix.length);
    const list = state[kind.list];
    const index = list.findIndex((x) => x.id === id);
    const local = index >= 0 ? list[index] : null;

    if (e.deleted) {
      if (local) {
        list.splice(index, 1);
        changed = true;
      }
      delete known[e.id];
      return;
    }

    const data = e.data;
    if (!data || typeof data !== "object") return;
    const record = { ...data, id };
    const h = fingerprint(record);
    if (local) {
      const localHash = fingerprint(local);
      if (localHash === h) {
        known[e.id] = h;
        return;
      }
      // Локальная правка ещё не ушла на сервер — её отправит diff.
      if (known[e.id] && known[e.id] !== localHash) return;
      list[index] = record;
    } else {
      list.push(record);
    }
    known[e.id] = h;
    changed = true;
  });
  if (changed) {
    state.sessions.sort((a, b) => (String(a.at ?? "") < String(b.at ?? "") ? -1 : 1));
    if (!findBook(state, state.activeBookId)) {
      state.activeBookId = readingBooks(state)[0]?.id ?? null;
    }
  }
  return changed;
}

function backupOnce() {
  try {
    if (localStorage.getItem(BACKUP_KEY)) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* резервной копии не будет, данные всё равно локально */
  }
}

function setStatus(state, error = null) {
  syncStatus.state = state;
  syncStatus.error = error;
  if (app && app.view === "settings") app.render();
}

/* ------------------------------------------------------------- цикл */

async function runSync() {
  if (!app || !syncAvailable()) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  setStatus("syncing");
  try {
    const firstRun = !ensure(app.state).migrated;
    if (firstRun) backupOnce();

    // 1. Сначала забираем чужие изменения: иначе удалённое на другом
    //    устройстве ушло бы на сервер обратно.
    let changed = false;
    let cursor = app.state.sync.cursor || 0;
    let remoteConfig = null;
    for (let page = 0; page < 20; page += 1) {
      const res = await request("state", { since: cursor });
      ensure(app.state);
      if (applyRemote(app.state, Array.isArray(res.entries) ? res.entries : [])) changed = true;
      if (page === 0) {
        remoteConfig = res.config ?? null;
        if (res.account) syncStatus.account = res.account;
      }
      if (Number.isFinite(res.cursor)) cursor = res.cursor;
      if (!res.more) break;
    }

    // 2. Общие настройки: чужие берём, если своих неотправленных правок нет.
    const state = app.state;
    const localHash = fingerprint(configOf(state));
    let pushConfig = false;
    if (remoteConfig && typeof remoteConfig === "object" && remoteConfig.settings) {
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
    // Токен отозван или устройство отвязано — выходим, данные остаются.
    if (!isEmbedded() && error?.status === 401) {
      account = null;
      writeAccount(null);
      setStatus("signed-out", "вход сброшен — введи новый код");
    } else {
      setStatus("error", error?.message || "ошибка");
    }
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync();
    }
  }
}

/* ------------------------------------------------------------- наружу */

let started = false;

export function initSync(appRef) {
  app = appRef;
  ensure(app.state);
  if (started) return;
  started = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runSync();
  });
  setInterval(() => {
    if (document.visibilityState === "visible") runSync();
  }, POLL_MS);
  if (!syncAvailable()) {
    syncStatus.state = "signed-out";
    return;
  }
  runSync();
}

export function scheduleSync() {
  if (!app || !syncAvailable()) return;
  clearTimeout(timer);
  timer = setTimeout(runSync, DEBOUNCE_MS);
}

export function syncNow() {
  return runSync();
}

// GamePass: код для входа в браузере.
export function requestPairCode() {
  return viaShell("pair-code", {});
}

// Браузер: вход по коду. Первый синк сливает то, что уже есть на устройстве,
// с дневником на сервере — ничего не стирается.
export async function signIn(code) {
  const device = (navigator.userAgentData?.platform || navigator.platform || "браузер").slice(0, 60);
  const res = await direct("POST", "/pair", { code: String(code).trim(), device }, null);
  account = { token: res.token, name: res.name || "" };
  writeAccount(account);
  resetSyncMeta(app.state);
  saveState(app.state);
  syncStatus.account = { name: account.name };
  await runSync();
  return account;
}

export async function signOut() {
  const token = account?.token;
  account = null;
  writeAccount(null);
  syncStatus.account = null;
  resetSyncMeta(app.state);
  saveState(app.state);
  setStatus("signed-out");
  if (token) await direct("POST", "/logout", {}, token).catch(() => undefined);
}

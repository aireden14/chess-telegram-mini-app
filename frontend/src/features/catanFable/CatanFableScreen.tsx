import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { TopNav } from "../../components/TopNav";
import { copyToClipboard, getStartParam, getTelegram, triggerHaptic } from "../../hooks/useTelegram";
import { useAuthStore } from "../../store/auth";
import { useSocketStore } from "../../store/socket";
import "../catan/catan.css";
import "./catanFable.css";

type Resource = "brick" | "wood" | "sheep" | "wheat" | "ore";
type BuildMode = "settlement" | "city" | "road" | "robber" | "knight" | null;
type BotLevel = "easy" | "medium" | "hard";
type Bag = Partial<Record<Resource, number>>;

interface Hex { q: number; r: number; terrain: Resource | "desert"; token: number | null }
interface Board {
  hexes: Hex[];
  vertices: string[];
  edges: string[];
  vertexNeighbors: Record<string, string[]>;
  vertexEdges: Record<string, string[]>;
  edgeVertices: Record<string, [string, string]>;
  vertexHexes: Record<string, string[]>;
  hexVertices: Record<string, string[]>;
  ports: Array<{ kind: Resource | "any"; vertices: [string, string] }>;
  robberHex: string;
}
interface PlayerView {
  seat: number; color: string; resourceCount?: number; devCardCount?: number;
  resources?: Record<Resource, number>;
  devCards?: Record<string, number>; newDevCards?: Record<string, number>;
  playedKnights: number; settlements: string[]; cities: string[]; roads: string[];
  hasLongestRoad: boolean; hasLargestArmy: boolean; publicVP: number; totalVP?: number;
}
interface Seat {
  seat: number; color: string; userId: number | null; isBot: boolean; botLevel: BotLevel | null;
  firstName?: string; username?: string | null; hasLeft: boolean;
}
interface Trade { id: string; fromSeat: number; give: Bag; receive: Bag; toSeats: number[]; acceptedBy: number[] }
interface Snapshot {
  id: string; status: "WAITING" | "SETUP" | "ACTIVE" | "COMPLETED"; hostId: number; maxPlayers: number;
  board: Board; seats: Seat[]; viewerSeat: number | null;
  state: {
    phase: string; currentSeat: number; dice: [number, number] | null; lastRoll: number | null;
    mustDiscard: Record<number, number>; pendingTrades: Trade[]; hasRolled: boolean;
    hasPlayedDevCardThisTurn: boolean; freeRoadsRemaining: number; winnerSeat: number | null;
    players: PlayerView[]; devDeckSize: number; log: Array<{ t: number; seat?: number; kind: string; data?: any }>;
  };
}

const RESOURCES: Resource[] = ["wood", "brick", "sheep", "wheat", "ore"];
const RI: Record<Resource, string> = { wood: "🌲", brick: "🧱", sheep: "🐑", wheat: "🌾", ore: "⛰️" };
const RN: Record<Resource, string> = { wood: "дерево", brick: "кирпич", sheep: "овцы", wheat: "пшеница", ore: "руда" };
const COLORS = ["#f06d62", "#5c9dff", "#f4eee0", "#f1a34b"];
const COSTS: Record<string, Bag> = {
  road: { wood: 1, brick: 1 }, settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 }, dev: { sheep: 1, wheat: 1, ore: 1 },
};

function seatName(snap: Snapshot, seat: number) {
  const s = snap.seats.find((x) => x.seat === seat);
  if (!s) return `Место ${seat + 1}`;
  if (s.isBot) return ["Барон Грач", "Магистр Тис", "Лиса Вельда", "Бот-колонист"][seat] || "Бот";
  return s.firstName || (s.username ? `@${s.username}` : `Игрок ${seat + 1}`);
}
function totalResources(p?: PlayerView) {
  return p?.resources ? RESOURCES.reduce((n, r) => n + (p.resources?.[r] || 0), 0) : (p?.resourceCount || 0);
}
function canPay(p: PlayerView | undefined, cost: Bag) {
  return !!p?.resources && RESOURCES.every((r) => (p.resources?.[r] || 0) >= (cost[r] || 0));
}
function bagText(bag: Bag) { return RESOURCES.filter((r) => bag[r]).map((r) => `${bag[r]}${RI[r]}`).join(" "); }

function PoweredBy() {
  return <div className="cf-powered">Powered by <a href="https://t.me/Denrech" target="_blank" rel="noopener noreferrer">@Denrech</a></div>;
}

export function CatanFableScreen() {
  const nav = useNavigate();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const botUsername = useAuthStore((s) => s.botUsername);
  const socket = useSocketStore((s) => s.socket);
  const connectSocket = useSocketStore((s) => s.connect);
  const [solo, setSolo] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [botLevel, setBotLevel] = useState<BotLevel>("medium");
  const [waiting, setWaiting] = useState<Array<{ id: string; seats: number; maxPlayers: number; host: { firstName: string } }>>([]);

  const ensureSocket = useCallback(() => token ? (socket || connectSocket(token)) : null, [connectSocket, socket, token]);
  const enterGame = useCallback((snap: Snapshot) => {
    setSnapshot(snap);
    const s = ensureSocket();
    s?.emit("CATAN_JOIN_ROOM", { gameId: snap.id });
  }, [ensureSocket]);

  const join = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || busy) return;
    setBusy(true); setMessage("");
    try {
      const { data } = await api.post(`/catan/${code}/join`);
      enterGame(data.snapshot as Snapshot);
    } catch (e: any) {
      setMessage(e?.response?.data?.error || "Комната не найдена или уже запущена");
    } finally { setBusy(false); }
  }, [busy, enterGame]);

  useEffect(() => {
    const param = getStartParam();
    const query = new URLSearchParams(location.search).get("join");
    const code = param?.startsWith("catan_") ? param.slice(6) : query;
    if (token && code) join(code);
    // deep-link обрабатываем только один раз за открытие
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.get("/catan/public/waiting").then((r) => setWaiting(r.data)).catch(() => undefined);
  }, [token, snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    const s = ensureSocket();
    if (!s) return;
    const onState = ({ snapshot: next }: { snapshot: Snapshot }) => setSnapshot(next);
    const onError = ({ message: text }: { message: string }) => setMessage(text);
    s.on("CATAN_STATE", onState); s.on("CATAN_ERROR", onError);
    s.emit("CATAN_JOIN_ROOM", { gameId: snapshot.id });
    return () => { s.off("CATAN_STATE", onState); s.off("CATAN_ERROR", onError); s.emit("CATAN_LEAVE_ROOM", { gameId: snapshot.id }); };
  }, [ensureSocket, snapshot?.id]);

  useEffect(() => {
    if (!solo) return;
    document.body.classList.add("catan-fs-open");
    const onMsg = (e: MessageEvent) => { if (e.data === "hexland:exit") setSolo(false); };
    window.addEventListener("message", onMsg);
    return () => { document.body.classList.remove("catan-fs-open"); window.removeEventListener("message", onMsg); };
  }, [solo]);

  async function create() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const { data } = await api.post("/catan/create", { maxPlayers: 4, targetVP: 10 });
      enterGame(data.snapshot as Snapshot);
    } catch (e: any) { setMessage(e?.response?.data?.error || "Не удалось создать комнату"); }
    finally { setBusy(false); }
  }

  function startWithBots() {
    if (!snapshot) return;
    ensureSocket()?.emit("CATAN_START", { gameId: snapshot.id, botLevel }, (r: { ok: boolean; error?: string }) => {
      if (!r?.ok) setMessage(r?.error || "Не удалось запустить");
    });
  }

  function invite() {
    if (!snapshot) return;
    const link = botUsername
      ? `https://t.me/${botUsername}/app?startapp=catan_${snapshot.id}`
      : `${window.location.origin}/catan-fable?join=${snapshot.id}`;
    copyToClipboard(link);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Сыграем в Катан Fable на четверых? 🏝️")}`;
    const tg = getTelegram();
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, "_blank", "noopener,noreferrer");
    setMessage("Ссылка скопирована");
  }

  if (solo) return <div className="catan-fs" style={{ paddingTop: "var(--safe-top, 0px)" }}><iframe className="catan-fs-frame" title="Катан Fable" src="/games/catan-fable/index.html" allow="autoplay; fullscreen" /></div>;

  if (snapshot && snapshot.status !== "WAITING") {
    return <CatanOnlineGame snapshot={snapshot} onBack={() => { setSnapshot(null); nav("/"); }} />;
  }

  return (
    <div className="app-screen cf-screen">
      <TopNav title="Катан Fable" backTo="/" />
      <main className="cf-lobby">
        {!snapshot ? <>
          <section className="cf-hero">
            <span className="cf-hero-icon">🏝️</span>
            <h1>Колонизаторы на четверых</h1>
            <p>Соберите до 4 живых игроков. Если кто-то не пришёл — хозяин заполнит места ботами.</p>
          </section>
          <button className="cf-main-button" onClick={create} disabled={busy}>🎮 Создать комнату</button>
          <div className="cf-join-row"><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="КОД КОМНАТЫ" /><button onClick={() => join(joinCode)} disabled={busy || !joinCode.trim()}>Войти</button></div>
          {!!waiting.length && <section className="cf-open-rooms"><h2>Открытые комнаты</h2>{waiting.map((g) => <button key={g.id} onClick={() => join(g.id)}><span><b>{g.host.firstName}</b><small>{g.seats}/{g.maxPlayers} игрока</small></span><strong>{g.id}</strong></button>)}</section>}
          <button className="cf-solo-button" onClick={() => setSolo(true)}>🤖 Одиночная игра и «Мореходы»</button>
        </> : <>
          <section className="cf-room-head"><span>Код комнаты</span><strong>{snapshot.id}</strong><button onClick={invite}>🔗 Пригласить</button></section>
          <section className="cf-seats">{Array.from({ length: 4 }, (_, i) => {
            const seat = snapshot.seats.find((s) => s.seat === i);
            return <div key={i} className={seat ? "filled" : ""}><i style={{ background: COLORS[i] }} /> <span><b>{seat ? seatName(snapshot, i) : "Свободное место"}</b><small>{seat?.isBot ? `Бот · ${seat.botLevel}` : seat ? "В комнате" : "Можно заменить ботом"}</small></span></div>;
          })}</section>
          {snapshot.hostId === user?.id ? <>
            <label className="cf-bot-level">Сила добавленных ботов <select value={botLevel} onChange={(e) => setBotLevel(e.target.value as BotLevel)}><option value="easy">Лёгкая</option><option value="medium">Средняя</option><option value="hard">Сильная</option></select></label>
            <button className="cf-main-button" onClick={startWithBots}>🚀 Начать — свободные места займут боты</button>
          </> : <div className="cf-waiting">⏳ Ждём, когда хозяин запустит партию…</div>}
        </>}
        {message && <div className="cf-message">{message}</div>}
        <PoweredBy />
      </main>
    </div>
  );
}

function CatanOnlineGame({ snapshot, onBack }: { snapshot: Snapshot; onBack: () => void }) {
  const socket = useSocketStore((s) => s.socket);
  const [mode, setMode] = useState<BuildMode>(null);
  const [error, setError] = useState("");
  const [give, setGive] = useState<Resource>("wood");
  const [receive, setReceive] = useState<Resource>("brick");
  const [yop1, setYop1] = useState<Resource>("wood");
  const [yop2, setYop2] = useState<Resource>("brick");
  const [discard, setDiscard] = useState<Bag>({});
  const me = snapshot.viewerSeat === null ? undefined : snapshot.state.players[snapshot.viewerSeat];
  const myTurn = snapshot.viewerSeat === snapshot.state.currentSeat;
  const phase = snapshot.state.phase;
  const canAct = myTurn && phase !== "GAME_OVER";

  useEffect(() => { setMode(null); }, [phase, snapshot.state.currentSeat]);
  const act = useCallback((action: any) => {
    if (!socket) return;
    setError(""); triggerHaptic("light");
    socket.emit("CATAN_ACTION", { gameId: snapshot.id, action }, (r: { ok: boolean; error?: string }) => {
      if (!r?.ok) { setError(translateError(r?.error || "Ход не прошёл")); triggerHaptic("error"); }
    });
  }, [snapshot.id, socket]);

  function boardClick(kind: "vertex" | "edge" | "hex", id: string) {
    if (kind === "vertex" && mode === "settlement") act({ type: "BUILD_SETTLEMENT", vertex: id });
    if (kind === "vertex" && mode === "city") act({ type: "BUILD_CITY", vertex: id });
    if (kind === "edge" && mode === "road") act({ type: "BUILD_ROAD", edge: id });
    if (kind === "hex" && mode === "robber") act({ type: "MOVE_ROBBER", toHex: id, stealFrom: null });
    if (kind === "hex" && mode === "knight") act({ type: "PLAY_KNIGHT", toHex: id, stealFrom: null });
  }

  const setupSettlement = canAct && phase.includes("SETTLEMENT");
  const setupRoad = canAct && phase.includes("_ROAD");
  useEffect(() => { if (setupSettlement) setMode("settlement"); else if (setupRoad || snapshot.state.freeRoadsRemaining > 0) setMode("road"); else if (canAct && phase === "MAIN_ROBBER") setMode("robber"); }, [canAct, phase, setupRoad, setupSettlement, snapshot.state.freeRoadsRemaining]);

  const needDiscard = snapshot.viewerSeat === null ? 0 : (snapshot.state.mustDiscard[snapshot.viewerSeat] || 0);
  const discardTotal = RESOURCES.reduce((n, r) => n + (discard[r] || 0), 0);
  function changeDiscard(r: Resource, delta: number) {
    const have = me?.resources?.[r] || 0;
    setDiscard((d) => ({ ...d, [r]: Math.max(0, Math.min(have, (d[r] || 0) + delta)) }));
  }

  const latestLogs = snapshot.state.log.slice(-7).reverse();
  return <div className="cf-game-shell">
    <div className="cf-game-top"><button onClick={onBack}>←</button><div><b>Катан Fable · {snapshot.id}</b><span>{phaseText(snapshot)}</span></div><div className="cf-dice">{snapshot.state.dice ? `⚄ ${snapshot.state.dice[0]} + ${snapshot.state.dice[1]} = ${snapshot.state.lastRoll}` : "🎲 —"}</div></div>
    <div className="cf-game-grid">
      <div className="cf-board-wrap"><CatanBoard snapshot={snapshot} mode={mode} onClick={boardClick} /></div>
      <aside className="cf-panel">
        <div className="cf-player-list">{snapshot.state.players.map((p) => <div key={p.seat} className={p.seat === snapshot.state.currentSeat ? "turn" : ""}><i style={{ background: COLORS[p.seat] }} /><span><b>{seatName(snapshot, p.seat)}{p.seat === snapshot.viewerSeat ? " (вы)" : ""}</b><small>✋ {totalResources(p)} · 🎴 {p.devCardCount ?? (p.devCards ? Object.values(p.devCards).reduce((a, b) => a + b, 0) : 0)}{p.hasLongestRoad ? " 🛣️" : ""}{p.hasLargestArmy ? " ⚔️" : ""}</small></span><strong>{p.totalVP ?? p.publicVP}🏆</strong></div>)}</div>
        {me?.resources && <div className="cf-resources">{RESOURCES.map((r) => <div key={r}><span>{RI[r]}</span><b>{me.resources?.[r] || 0}</b></div>)}</div>}
        {needDiscard > 0 ? <section className="cf-discard"><h3>🥷 Сбросьте {needDiscard} карт</h3>{RESOURCES.map((r) => <div key={r}><span>{RI[r]} {RN[r]}</span><button onClick={() => changeDiscard(r, -1)}>−</button><b>{discard[r] || 0}</b><button onClick={() => changeDiscard(r, 1)}>+</button></div>)}<button className="primary" disabled={discardTotal !== needDiscard} onClick={() => { act({ type: "DISCARD", resources: discard }); setDiscard({}); }}>Сбросить ({discardTotal}/{needDiscard})</button></section> : <>
          <div className="cf-actions">
            <button className={mode === "settlement" ? "active" : ""} disabled={!canAct || (phase === "MAIN_TURN" && !canPay(me, COSTS.settlement))} onClick={() => setMode("settlement")}>🏠 Поселение</button>
            <button className={mode === "road" ? "active" : ""} disabled={!canAct || (phase === "MAIN_TURN" && !canPay(me, COSTS.road) && snapshot.state.freeRoadsRemaining <= 0)} onClick={() => setMode("road")}>🛣️ Дорога</button>
            <button className={mode === "city" ? "active" : ""} disabled={!canAct || phase !== "MAIN_TURN" || !canPay(me, COSTS.city)} onClick={() => setMode("city")}>🏰 Город</button>
            <button disabled={!canAct || phase !== "MAIN_TURN" || !canPay(me, COSTS.dev)} onClick={() => act({ type: "BUY_DEV_CARD" })}>🎴 Дев-карта</button>
          </div>
          {phase === "MAIN_ROLL" && <button className="cf-roll" disabled={!myTurn} onClick={() => act({ type: "ROLL_DICE" })}>🎲 Бросить кубики</button>}
          {phase === "MAIN_TURN" && myTurn && <>
            <div className="cf-trade"><select value={give} onChange={(e) => setGive(e.target.value as Resource)}>{RESOURCES.map((r) => <option value={r} key={r}>Отдать {RI[r]}</option>)}</select><span>→</span><select value={receive} onChange={(e) => setReceive(e.target.value as Resource)}>{RESOURCES.map((r) => <option value={r} key={r}>Взять {RI[r]}</option>)}</select><button onClick={() => act({ type: "BANK_TRADE", give, receive })}>Банк</button><button onClick={() => act({ type: "OFFER_TRADE", give: { [give]: 1 }, receive: { [receive]: 1 } })}>Игрокам</button></div>
            <DevCards me={me} mode={mode} setMode={setMode} yop1={yop1} yop2={yop2} setYop1={setYop1} setYop2={setYop2} act={act} />
            <button className="cf-end" onClick={() => act({ type: "END_TURN" })}>Завершить ход →</button>
          </>}
        </>}
        <TradeOffers snapshot={snapshot} act={act} />
        {error && <div className="cf-error">{error}</div>}
        <div className="cf-log">{latestLogs.map((l, i) => <div key={`${l.t}-${i}`}>{logText(snapshot, l)}</div>)}</div>
        <PoweredBy />
      </aside>
    </div>
    {phase === "GAME_OVER" && <div className="cf-over"><div><span>🏆</span><h2>{snapshot.state.winnerSeat === snapshot.viewerSeat ? "Вы победили!" : `Победил ${seatName(snapshot, snapshot.state.winnerSeat ?? 0)}`}</h2><button onClick={onBack}>В меню игр</button></div></div>}
  </div>;
}

function DevCards({ me, mode, setMode, yop1, yop2, setYop1, setYop2, act }: any) {
  const cards = me?.devCards || {};
  if (!Object.values(cards).some((n: any) => n > 0)) return null;
  return <div className="cf-dev"><h3>Карты развития</h3>{cards.knight > 0 && <button className={mode === "knight" ? "active" : ""} onClick={() => setMode("knight")}>⚔️ Рыцарь ×{cards.knight}</button>}{cards.road_building > 0 && <button onClick={() => act({ type: "PLAY_ROAD_BUILDING", edges: [] })}>🛣️ Две дороги ×{cards.road_building}</button>}{cards.monopoly > 0 && <button onClick={() => act({ type: "PLAY_MONOPOLY", resource: yop1 })}>💰 Монополия ({RI[yop1 as Resource]})</button>}{cards.year_of_plenty > 0 && <div className="cf-yop"><select value={yop1} onChange={(e) => setYop1(e.target.value)}>{RESOURCES.map((r) => <option value={r} key={r}>{RI[r]}</option>)}</select><select value={yop2} onChange={(e) => setYop2(e.target.value)}>{RESOURCES.map((r) => <option value={r} key={r}>{RI[r]}</option>)}</select><button onClick={() => act({ type: "PLAY_YEAR_OF_PLENTY", resources: [yop1, yop2] })}>🎁 Изобилие</button></div>}</div>;
}

function TradeOffers({ snapshot, act }: { snapshot: Snapshot; act: (a: any) => void }) {
  if (!snapshot.state.pendingTrades.length) return null;
  return <div className="cf-offers"><h3>🤝 Предложения</h3>{snapshot.state.pendingTrades.map((t) => <div key={t.id}><span>{seatName(snapshot, t.fromSeat)}: {bagText(t.give)} → {bagText(t.receive)}</span>{t.fromSeat === snapshot.viewerSeat ? <>{t.acceptedBy.map((seat) => <button key={seat} onClick={() => act({ type: "CONFIRM_TRADE", offerId: t.id, withSeat: seat })}>Обмен с {seatName(snapshot, seat)}</button>)}<button onClick={() => act({ type: "CANCEL_TRADE", offerId: t.id })}>✕</button></> : t.toSeats.includes(snapshot.viewerSeat ?? -1) && <button onClick={() => act({ type: "ACCEPT_TRADE", offerId: t.id, bySeat: snapshot.viewerSeat })}>Принять</button>}</div>)}</div>;
}

function CatanBoard({ snapshot, mode, onClick }: { snapshot: Snapshot; mode: BuildMode; onClick: (kind: "vertex" | "edge" | "hex", id: string) => void }) {
  const { board, state } = snapshot;
  const center = (q: number, r: number) => ({ x: 350 + 82 * Math.sqrt(3) * (q + r / 2), y: 330 + 82 * 1.5 * r });
  const vertexPos = useMemo(() => Object.fromEntries(board.vertices.map((id) => {
    const triples = id.slice(2).split("|").map((s) => s.split(",").map(Number));
    const pts = triples.map(([q, r]) => center(q, r));
    return [id, { x: pts.reduce((n, p) => n + p.x, 0) / 3, y: pts.reduce((n, p) => n + p.y, 0) / 3 }];
  })), [board.vertices]);
  const occupiedV = new Map<string, { seat: number; city: boolean }>();
  const occupiedE = new Map<string, number>();
  state.players.forEach((p) => { p.settlements.forEach((v) => occupiedV.set(v, { seat: p.seat, city: false })); p.cities.forEach((v) => occupiedV.set(v, { seat: p.seat, city: true })); p.roads.forEach((e) => occupiedE.set(e, p.seat)); });
  const points = (h: Hex) => { const c = center(h.q, h.r); return Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * (60 * i - 30); return `${c.x + 80 * Math.cos(a)},${c.y + 80 * Math.sin(a)}`; }).join(" "); };
  return <svg className="cf-board" viewBox="0 0 700 660" role="img" aria-label="Игровое поле Катана">
    <defs>{Object.entries({ wood: ["#4f9a55", "#285e35"], brick: ["#d87550", "#923d28"], sheep: ["#acd77b", "#659a43"], wheat: ["#f0c95b", "#b98725"], ore: ["#a8b1c1", "#657184"], desert: ["#dcc899", "#aa9363"] }).map(([k, v]) => <radialGradient id={`cf-${k}`} key={k}><stop offset="0" stopColor={v[0]} /><stop offset="1" stopColor={v[1]} /></radialGradient>)}</defs>
    {board.hexes.map((h) => { const id = `${h.q},${h.r}`, c = center(h.q, h.r), hot = mode === "robber" || mode === "knight"; return <g key={id} className={hot && id !== board.robberHex ? "clickable" : ""} onClick={() => hot && id !== board.robberHex && onClick("hex", id)}><polygon points={points(h)} fill={`url(#cf-${h.terrain})`} /><text x={c.x} y={c.y - 18} className="terrain">{{ wood: "🌲", brick: "🧱", sheep: "🐑", wheat: "🌾", ore: "⛰️", desert: "🌵" }[h.terrain]}</text>{h.token && <><circle cx={c.x} cy={c.y + 18} r="21" className="token" /><text x={c.x} y={c.y + 25} className={h.token === 6 || h.token === 8 ? "number hot" : "number"}>{h.token}</text></>}{id === board.robberHex && <text x={c.x + 31} y={c.y + 8} className="robber">🥷</text>}</g>; })}
    {board.edges.map((id) => { const [a, b] = board.edgeVertices[id] || []; const p1 = vertexPos[a], p2 = vertexPos[b]; if (!p1 || !p2) return null; const owner = occupiedE.get(id); return <g key={id}>{owner !== undefined && <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="road" stroke={COLORS[owner]} />}{mode === "road" && owner === undefined && <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="road-hit" onClick={() => onClick("edge", id)} />}</g>; })}
    {board.vertices.map((id) => { const p = vertexPos[id], occ = occupiedV.get(id); if (!p) return null; return <g key={id}>{occ && (occ.city ? <rect x={p.x - 11} y={p.y - 11} width="22" height="22" rx="4" className="piece" fill={COLORS[occ.seat]} /> : <polygon points={`${p.x},${p.y - 13} ${p.x + 12},${p.y + 10} ${p.x - 12},${p.y + 10}`} className="piece" fill={COLORS[occ.seat]} />)}{((mode === "settlement" && !occ) || (mode === "city" && occ?.seat === snapshot.viewerSeat && !occ.city)) && <circle cx={p.x} cy={p.y} r="13" className="vertex-hit" onClick={() => onClick("vertex", id)} />}</g>; })}
  </svg>;
}

function phaseText(s: Snapshot) {
  const p = s.state.phase;
  if (p === "GAME_OVER") return "Партия окончена";
  if (p.startsWith("SETUP")) return `Расстановка · ${seatName(s, s.state.currentSeat)}`;
  if (p === "MAIN_DISCARD") return "Выпало 7 · сброс карт";
  if (p === "MAIN_ROBBER") return `${seatName(s, s.state.currentSeat)} двигает разбойника`;
  return `Ход: ${seatName(s, s.state.currentSeat)}${p === "MAIN_ROLL" ? " · бросок" : " · стройка и торговля"}`;
}
function logText(s: Snapshot, l: Snapshot["state"]["log"][number]) {
  const who = l.seat === undefined ? "" : seatName(s, l.seat);
  const map: Record<string, string> = { ROLL: `🎲 ${who}: ${l.data?.sum}`, BUILD_SETTLEMENT: `🏠 ${who} строит поселение`, BUILD_ROAD: `🛣️ ${who} строит дорогу`, BUILD_CITY: `🏰 ${who} строит город`, BUY_DEV: `🎴 ${who} берёт карту`, END_TURN: `→ ${who} завершает ход`, ROBBER_MOVED: `🥷 ${who} двигает разбойника`, BANK_TRADE: `🏦 ${who} меняется с банком` };
  return map[l.kind] || `• ${who} ${l.kind.toLowerCase().replaceAll("_", " ")}`;
}
function translateError(e: string) {
  const map: Record<string, string> = { "not your turn": "Сейчас ход другого игрока", "distance rule": "Поселение слишком близко к другому", "road not connected": "Дорога должна примыкать к вашей сети", "cannot afford": "Не хватает ресурсов", "wrong phase": "Сейчас это действие недоступно", "same resource": "Выберите разные ресурсы", "not enough": "Не хватает ресурсов" };
  return map[e] || e;
}

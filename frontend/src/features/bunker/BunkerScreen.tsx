import React, { useEffect, useMemo, useRef, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { useAuthStore } from "../../store/auth";
import { useSocketStore } from "../../store/socket";
import "./bunker.css";

type CardCat = "bio" | "profession" | "health" | "hobby" | "phobia" | "baggage" | "fact" | "action";
const CAT_META: { id: CardCat; name: string; emoji: string }[] = [
  { id: "bio", name: "Биология", emoji: "🧬" },
  { id: "profession", name: "Профессия", emoji: "🛠" },
  { id: "health", name: "Здоровье", emoji: "❤️" },
  { id: "hobby", name: "Хобби", emoji: "🎯" },
  { id: "phobia", name: "Фобия", emoji: "😱" },
  { id: "baggage", name: "Багаж", emoji: "🎒" },
  { id: "fact", name: "Факт", emoji: "📌" },
  { id: "action", name: "Действие", emoji: "✨" },
];

interface BPlayer {
  userId: number;
  name: string;
  alive: boolean;
  online: boolean;
  voted: boolean;
  revealed: Partial<Record<CardCat, string>>;
  revealedCount: number;
}
interface BState {
  code: string;
  hostId: number;
  phase: "lobby" | "discuss" | "vote" | "finished";
  round: number;
  scenario: { title: string; desc: string; years: number } | null;
  bunker: { title: string; desc: string; places: string } | null;
  timerEnd: number | null;
  voteResult: string | null;
  players: BPlayer[];
}

export function BunkerScreen() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const socket = useSocketStore((s) => s.socket);
  const connectSocket = useSocketStore((s) => s.connect);

  const [state, setState] = useState<BState | null>(null);
  const [hand, setHand] = useState<Partial<Record<CardCat, string>>>({});
  const [revealed, setRevealed] = useState<CardCat[]>([]);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const [showBriefing, setShowBriefing] = useState(false);
  const seenRound = useRef(0);

  const myName = user?.firstName || user?.username || "Игрок";
  const myId = user?.id;

  useEffect(() => {
    if (token) connectSocket(token);
  }, [connectSocket, token]);

  useEffect(() => {
    if (!socket) return;
    const onState = ({ state: st }: { state: BState }) => {
      setState(st);
      setErr("");
      if (st.round > 0 && seenRound.current === 0) setShowBriefing(true);
      seenRound.current = st.round;
    };
    const onHand = ({ cards, revealed: rv }: { cards: Partial<Record<CardCat, string>>; revealed: CardCat[] }) => {
      setHand(cards);
      setRevealed(rv);
    };
    const onErr = ({ message }: { message: string }) => setErr(message);
    const onEvent = ({ text }: { text: string }) => setEvents((e) => [...e.slice(-30), text]);
    socket.on("BUNKER_STATE", onState);
    socket.on("BUNKER_HAND", onHand);
    socket.on("BUNKER_ERROR", onErr);
    socket.on("BUNKER_EVENT", onEvent);
    return () => {
      socket.off("BUNKER_STATE", onState);
      socket.off("BUNKER_HAND", onHand);
      socket.off("BUNKER_ERROR", onErr);
      socket.off("BUNKER_EVENT", onEvent);
    };
  }, [socket]);

  // тик для таймера
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const emit = (ev: string, data?: unknown) => socket?.emit(ev, data);
  const isHost = state != null && myId === state.hostId;
  const me = state?.players.find((p) => p.userId === myId);
  const alivePlayers = useMemo(() => state?.players.filter((p) => p.alive) ?? [], [state]);
  const timerLeft = state?.timerEnd ? Math.max(0, Math.ceil((state.timerEnd - now) / 1000)) : null;

  /* ---------- экран входа ---------- */
  if (!state) {
    return (
      <div className="app-screen bunker-screen">
        <TopNav title="Бункер" backTo="/" />
        <div className="bk-menu">
          <div className="bk-logo">🚪☢️</div>
          <h2>Бункер</h2>
          <p className="bk-muted">
            Катастрофа уничтожила мир. Бункер вместит только половину группы.
            Раскрывайте карты своего персонажа и убеждайте остальных, что именно вы достойны места.
            Голосованием изгоняйте лишних. 300+ карточек, 12 сценариев.
          </p>
          <p className="bk-muted">Комната по коду: создатель придумывает код, остальные вводят его со своих телефонов (3–12 игроков).</p>
          <input
            className="bk-input"
            placeholder="КОД КОМНАТЫ (придумай или введи)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
          />
          {err && <p className="bk-err">{err}</p>}
          <button className="bk-btn primary" onClick={() => emit("BUNKER_CREATE", { code, name: myName })}>
            🛠 Создать комнату
          </button>
          <button className="bk-btn" onClick={() => emit("BUNKER_JOIN", { code, name: myName })}>
            🚪 Войти по коду
          </button>
        </div>
      </div>
    );
  }

  /* ---------- лобби ---------- */
  if (state.phase === "lobby") {
    return (
      <div className="app-screen bunker-screen">
        <TopNav title="Бункер · лобби" backTo="/" />
        <div className="bk-lobby">
          <div className="bk-code-box">
            Код комнаты: <b>{state.code}</b>
            <div className="bk-muted">Скажи его друзьям — пусть заходят через «Войти по коду»</div>
          </div>
          <div className="bk-players-list">
            {state.players.map((p) => (
              <div key={p.userId} className="bk-prow">
                <span>
                  {p.userId === state.hostId ? "👑 " : ""}
                  {p.name} {p.userId === myId ? "(ты)" : ""}
                </span>
                <span className={p.online ? "bk-on" : "bk-off"}>{p.online ? "онлайн" : "офлайн"}</span>
              </div>
            ))}
          </div>
          {err && <p className="bk-err">{err}</p>}
          {isHost ? (
            <button
              className="bk-btn primary"
              disabled={state.players.length < 3}
              onClick={() => emit("BUNKER_START")}
            >
              ▶️ Начать игру ({state.players.length}/3+)
            </button>
          ) : (
            <p className="bk-muted" style={{ textAlign: "center" }}>Ждём, пока 👑 создатель начнёт игру…</p>
          )}
          <button className="bk-btn" onClick={() => { emit("BUNKER_LEAVE"); setState(null); }}>
            ← Выйти из комнаты
          </button>
        </div>
      </div>
    );
  }

  /* ---------- игра ---------- */
  return (
    <div className="app-screen bunker-screen">
      <TopNav title={`Бункер · раунд ${state.round}`} backTo="/" />
      <div className="bk-game">
        {/* сценарий */}
        <div className="bk-scenario" onClick={() => setShowBriefing(true)}>
          <b>{state.scenario?.title}</b> · {state.bunker?.title} · мест: {state.bunker?.places} · 📖
          {timerLeft != null && timerLeft > 0 && <span className="bk-timer">⏱ {timerLeft}с</span>}
        </div>

        {state.voteResult && <div className="bk-voteres">{state.voteResult}</div>}
        {err && <p className="bk-err">{err}</p>}

        {/* игроки */}
        <div className="bk-table">
          {state.players.map((p) => (
            <div key={p.userId} className={`bk-pcard${p.alive ? "" : " out"}${p.userId === myId ? " me" : ""}`}>
              <div className="bk-pname">
                {p.userId === state.hostId ? "👑 " : ""}
                {p.name}
                {!p.alive && " ⛔"}
                {state.phase === "vote" && p.alive && p.voted && " 🗳"}
              </div>
              <div className="bk-traits">
                {CAT_META.map((c) =>
                  p.revealed[c.id] ? (
                    <div key={c.id} className="bk-trait">
                      {c.emoji} {p.revealed[c.id]}
                    </div>
                  ) : null,
                )}
                {p.revealedCount === 0 && <div className="bk-trait dim">пока ничего не раскрыто</div>}
              </div>
              {state.phase === "vote" && me?.alive && p.alive && p.userId !== myId && (
                <button className="bk-btn small danger" onClick={() => emit("BUNKER_VOTE", { target: p.userId })}>
                  Изгнать
                </button>
              )}
            </div>
          ))}
        </div>

        {/* события */}
        {events.length > 0 && (
          <div className="bk-events">
            {events.slice(-4).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        {/* моя рука */}
        {me?.alive && state.phase !== "finished" && (
          <div className="bk-hand">
            <div className="bk-hand-title">Твои карты — тапни, чтобы раскрыть всем:</div>
            <div className="bk-hand-grid">
              {CAT_META.map((c) => {
                const open = revealed.includes(c.id);
                return (
                  <button
                    key={c.id}
                    className={`bk-card${open ? " open" : ""}`}
                    onClick={() => {
                      if (open) return;
                      if (window.confirm(`Раскрыть всем «${c.name}»: ${hand[c.id]}?`)) emit("BUNKER_REVEAL", { cat: c.id });
                    }}
                  >
                    <span className="bk-card-cat">{c.emoji} {c.name}</span>
                    <span className="bk-card-val">{hand[c.id]}</span>
                    <span className="bk-card-st">{open ? "✅ раскрыто" : "🔒 скрыто"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {me && !me.alive && state.phase !== "finished" && (
          <p className="bk-muted" style={{ textAlign: "center" }}>⛔ Тебя изгнали. Наблюдай за спектаклем.</p>
        )}
        {state.phase === "finished" && (
          <div className="bk-finish">
            🏆 Игра окончена! В бункер прошли: {alivePlayers.map((p) => p.name).join(", ") || "никто"}
          </div>
        )}

        {/* панель ведущего */}
        {isHost && (
          <div className="bk-host">
            <div className="bk-hand-title">👑 Панель ведущего:</div>
            <div className="bk-host-row">
              {state.phase === "discuss" && (
                <>
                  <button className="bk-btn small" onClick={() => emit("BUNKER_TIMER", { seconds: 60 })}>⏱ 1 мин</button>
                  <button className="bk-btn small" onClick={() => emit("BUNKER_TIMER", { seconds: 120 })}>⏱ 2 мин</button>
                  <button className="bk-btn small" onClick={() => emit("BUNKER_TIMER", { seconds: 180 })}>⏱ 3 мин</button>
                  <button className="bk-btn small danger" onClick={() => emit("BUNKER_VOTE_START")}>🗳 Голосование</button>
                </>
              )}
              {state.phase === "vote" && (
                <button className="bk-btn small danger" onClick={() => emit("BUNKER_VOTE_END")}>
                  Завершить голосование ({alivePlayers.filter((p) => p.voted).length}/{alivePlayers.length})
                </button>
              )}
              {state.phase !== "finished" && alivePlayers.length > 1 && (
                <button className="bk-btn small" onClick={() => { if (window.confirm("Завершить игру? Оставшиеся — победители.")) emit("BUNKER_FINISH"); }}>
                  🏁 Финал
                </button>
              )}
              {state.phase === "finished" && (
                <button className="bk-btn small primary" onClick={() => emit("BUNKER_RESTART")}>🔄 Новая партия</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* брифинг-модалка */}
      {showBriefing && state.scenario && (
        <div className="bk-modal-back" onClick={() => setShowBriefing(false)}>
          <div className="bk-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{state.scenario.title}</h3>
            <p>{state.scenario.desc}</p>
            <p className="bk-muted">Провести в бункере: {state.scenario.years} лет.</p>
            <h3 style={{ marginTop: 12 }}>{state.bunker?.title}</h3>
            <p>{state.bunker?.desc}</p>
            <p className="bk-muted">Мест хватит на: {state.bunker?.places}.</p>
            <p className="bk-muted">
              Как играть: по кругу раскрывайте по 1–2 карты и рассказывайте, чем полезны бункеру.
              Ведущий 👑 запускает таймеры на речи и объявляет голосование. Изгнанный вскрывает все карты.
              Играйте, пока не останется половина.
            </p>
            <button className="bk-btn primary" onClick={() => setShowBriefing(false)}>Понятно</button>
          </div>
        </div>
      )}
    </div>
  );
}

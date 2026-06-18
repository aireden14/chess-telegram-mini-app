import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";
import { Modal } from "../../components/Modal";
import { triggerHaptic } from "../../hooks/useTelegram";
import { celebrate } from "../../hooks/celebrate";
import { useAuthStore } from "../../store/auth";
import { useSocketStore } from "../../store/socket";
import {
  Board,
  BotLevel,
  Color,
  Move,
  applyMove,
  chooseBotMove,
  hasAnyMove,
  idx,
  initialBoard,
  isDark,
  legalForPiece,
  pieceCaptures,
  rc,
} from "./checkersEngine";

const SAVE_KEY = "chess-app-checkers-v2";

type Mode = "local" | "bot" | "online";

interface Target {
  to: number;
  captured: number | null;
}

interface Saved {
  board: Board;
  turn: Color;
  autoFlip: boolean;
  mode: Exclude<Mode, "online">;
  botLevel: BotLevel;
}

interface OnlineGame {
  id: string;
  board: Board;
  turn: Color;
  chainFrom: number | null;
  status: "WAITING" | "ACTIVE" | "FINISHED";
  winner: Color | "draw" | null;
  players: {
    w: number;
    b: number | null;
  };
}

const BOT_LEVELS: Array<{ value: BotLevel; label: string; desc: string }> = [
  { value: 1, label: "1", desc: "Новичок" },
  { value: 2, label: "2", desc: "Лёгкий" },
  { value: 3, label: "3", desc: "Средний" },
  { value: 4, label: "4", desc: "Сильный" },
  { value: 5, label: "5", desc: "Мастер" },
];

function normalizeBotLevel(value: unknown): BotLevel {
  const n = Number(value);
  return n >= 1 && n <= 5 ? (n as BotLevel) : 3;
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const mode = parsed?.mode === "bot" ? "bot" : "local";
      if (Array.isArray(parsed?.board) && parsed.board.length === 64 && (parsed.turn === "w" || parsed.turn === "b")) {
        return {
          board: parsed.board,
          turn: parsed.turn,
          autoFlip: parsed.autoFlip !== false,
          mode,
          botLevel: normalizeBotLevel(parsed.botLevel),
        };
      }
    }
  } catch {}
  return { board: initialBoard(), turn: "w", autoFlip: true, mode: "local", botLevel: 3 };
}

const other = (color: Color): Color => (color === "w" ? "b" : "w");

export function CheckersScreen() {
  const nav = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const botUsername = useAuthStore((s) => s.botUsername);
  const socket = useSocketStore((s) => s.socket);
  const connectSocket = useSocketStore((s) => s.connect);

  const init = useMemo(loadSaved, []);
  const [mode, setMode] = useState<Mode>(init.mode);
  const [board, setBoard] = useState<Board>(init.board);
  const [turn, setTurn] = useState<Color>(init.turn);
  const [autoFlip, setAutoFlip] = useState(init.autoFlip);
  const [botLevel, setBotLevel] = useState<BotLevel>(init.botLevel);
  const [selected, setSelected] = useState<number | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [chainFrom, setChainFrom] = useState<number | null>(null);
  const [onlineGame, setOnlineGame] = useState<OnlineGame | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [onlineError, setOnlineError] = useState("");
  const [autoJoinDone, setAutoJoinDone] = useState(false);

  useEffect(() => {
    if (mode === "online") return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ board, turn, autoFlip, mode, botLevel }));
    } catch {}
  }, [autoFlip, board, botLevel, mode, turn]);

  const myOnlineColor = useMemo<Color | null>(() => {
    if (!onlineGame || !user) return null;
    if (onlineGame.players.w === user.id) return "w";
    if (onlineGame.players.b === user.id) return "b";
    return null;
  }, [onlineGame, user]);

  const status = useMemo(() => {
    if (mode === "online" && onlineGame?.status === "FINISHED") {
      return { over: true, winner: onlineGame.winner as Color | "draw" | null };
    }
    if (!hasAnyMove(board, turn)) {
      return { over: true, winner: other(turn) as Color | "draw" };
    }
    return { over: false, winner: null as Color | "draw" | null };
  }, [board, mode, onlineGame, turn]);

  useEffect(() => {
    if (status.over) celebrate();
  }, [status.over]);

  useEffect(() => {
    if (mode !== "online" || !token) return;
    connectSocket(token);
  }, [connectSocket, mode, token]);

  useEffect(() => {
    if (!socket) return;

    const onState = ({ game }: { game: OnlineGame }) => {
      setOnlineGame(game);
      setBoard(game.board);
      setTurn(game.turn);
      setChainFrom(game.chainFrom);
      setSelected(null);
      setTargets([]);
      setOnlineError("");
    };
    const onError = ({ message }: { message: string }) => setOnlineError(message || "Ошибка мультиплеера");

    socket.on("CHECKERS_STATE", onState);
    socket.on("CHECKERS_ERROR", onError);
    return () => {
      socket.off("CHECKERS_STATE", onState);
      socket.off("CHECKERS_ERROR", onError);
    };
  }, [socket]);

  useEffect(() => {
    const code = new URLSearchParams(location.search).get("join");
    if (!code || autoJoinDone || !token) return;
    setModeAndReset("online", false);
    setJoinCode(code.toUpperCase());
    setAutoJoinDone(true);
    setTimeout(() => joinOnline(code), 120);
  }, [autoJoinDone, location.search, token]);

  useEffect(() => {
    if (mode !== "bot" || turn !== "b" || status.over || chainFrom !== null) return;
    const timer = window.setTimeout(() => {
      let nextBoard = board;
      let forcedFrom: number | null = null;
      let safety = 0;

      while (safety < 8) {
        const move = forcedFrom === null ? chooseBotMove(nextBoard, "b", botLevel) : chooseForcedBotCapture(nextBoard, forcedFrom);
        if (!move) break;
        const result = applyMove(nextBoard, move.from, move.to, move.captured);
        nextBoard = result.board;
        if (!result.mustContinue) {
          forcedFrom = null;
          break;
        }
        forcedFrom = result.end;
        safety += 1;
      }

      triggerHaptic("light");
      setBoard(nextBoard);
      setTurn("w");
      setChainFrom(null);
      setSelected(null);
      setTargets([]);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [board, botLevel, chainFrom, mode, status.over, turn]);

  const targetSet = useMemo(() => new Set(targets.map((t) => t.to)), [targets]);
  const order = useMemo(() => {
    const cells: number[] = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) cells.push(idx(r, c));
    }
    return cells;
  }, []);

  function chooseForcedBotCapture(current: Board, from: number): Move | null {
    const captures = pieceCaptures(current, from);
    if (!captures.length) return null;
    const capture = botLevel <= 2 ? captures[Math.floor(Math.random() * captures.length)]! : captures[0]!;
    return { from, to: capture.to, captured: capture.captured };
  }

  function clearSel() {
    setSelected(null);
    setTargets([]);
  }

  function setModeAndReset(nextMode: Mode, resetBoard = true) {
    triggerHaptic("light");
    setMode(nextMode);
    setOnlineError("");
    if (nextMode !== "online") setOnlineGame(null);
    if (resetBoard) {
      setBoard(initialBoard());
      setTurn("w");
      setChainFrom(null);
      clearSel();
    }
  }

  function selectPiece(i: number) {
    if (chainFrom !== null && i !== chainFrom) return;
    const { captures, moves } = legalForPiece(board, i);
    if (captures.length === 0 && moves.length === 0) return;
    setSelected(i);
    setTargets([
      ...captures.map((c) => ({ to: c.to, captured: c.captured })),
      ...moves.map((m) => ({ to: m, captured: null as number | null })),
    ]);
  }

  function canAct(): boolean {
    if (status.over) return false;
    if (mode === "bot") return turn === "w";
    if (mode === "online") return onlineGame?.status === "ACTIVE" && myOnlineColor === turn;
    return true;
  }

  function onCellClick(i: number) {
    if (!canAct()) return;
    if (selected !== null && targetSet.has(i)) {
      const t = targets.find((x) => x.to === i)!;
      if (mode === "online") {
        makeOnlineMove({ from: selected, to: i, captured: t.captured });
        return;
      }

      const result = applyMove(board, selected, i, t.captured);
      triggerHaptic(t.captured !== null ? "medium" : "light");
      setBoard(result.board);
      if (result.mustContinue) {
        setSelected(result.end);
        setChainFrom(result.end);
        setTargets(pieceCaptures(result.board, result.end).map((c) => ({ to: c.to, captured: c.captured })));
      } else {
        clearSel();
        setChainFrom(null);
        setTurn(other(turn));
      }
      return;
    }

    if (chainFrom !== null) return;
    const piece = board[i];
    if (piece && piece.color === turn) selectPiece(i);
    else clearSel();
  }

  function restart() {
    if (mode === "online") {
      if (!onlineGame || !socket) return;
      socket.emit("CHECKERS_RESTART", { gameId: onlineGame.id });
      return;
    }

    const isFresh = JSON.stringify(board) === JSON.stringify(initialBoard());
    if (!status.over && !isFresh && !window.confirm("Начать новую партию? Текущая будет сброшена.")) return;
    triggerHaptic("medium");
    setBoard(initialBoard());
    setTurn("w");
    setChainFrom(null);
    clearSel();
  }

  function ensureSocket() {
    if (!token) {
      setOnlineError("Нет авторизации Telegram");
      return null;
    }
    return socket || connectSocket(token);
  }

  function createOnline() {
    setModeAndReset("online", false);
    const s = ensureSocket();
    if (!s) return;
    s.emit("CHECKERS_CREATE", {}, (res: { ok: boolean; game?: OnlineGame; error?: string }) => {
      if (!res.ok || !res.game) return setOnlineError(res.error || "Не удалось создать игру");
      setOnlineGame(res.game);
      setBoard(res.game.board);
      setTurn(res.game.turn);
      setChainFrom(res.game.chainFrom);
      setJoinCode(res.game.id);
    });
  }

  function joinOnline(code = joinCode) {
    setModeAndReset("online", false);
    const s = ensureSocket();
    const normalized = code.trim().toUpperCase();
    if (!s || !normalized) return;
    s.emit("CHECKERS_JOIN", { gameId: normalized }, (res: { ok: boolean; game?: OnlineGame; error?: string }) => {
      if (!res.ok || !res.game) return setOnlineError(res.error || "Не удалось войти");
      setOnlineGame(res.game);
      setBoard(res.game.board);
      setTurn(res.game.turn);
      setChainFrom(res.game.chainFrom);
      setJoinCode(res.game.id);
    });
  }

  function makeOnlineMove(move: Move) {
    if (!socket || !onlineGame) return;
    triggerHaptic(move.captured !== null ? "medium" : "light");
    clearSel();
    socket.emit("CHECKERS_MOVE", { gameId: onlineGame.id, move }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) setOnlineError(res.error || "Ход не прошёл");
    });
  }

  async function copyInvite() {
    if (!onlineGame) return;
    const link = botUsername
      ? `https://t.me/${botUsername}/app?startapp=checkers_${onlineGame.id}`
      : `${window.location.origin}/checkers?join=${onlineGame.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setOnlineError("Ссылка скопирована");
    } catch {
      setOnlineError(`Код игры: ${onlineGame.id}`);
    }
  }

  const flipped = mode === "online" ? myOnlineColor === "b" : mode === "local" && autoFlip && turn === "b";
  const display = flipped ? [...order].reverse() : order;
  const whiteLeft = board.filter((p) => p?.color === "w").length;
  const blackLeft = board.filter((p) => p?.color === "b").length;
  const statusText =
    mode === "online" && onlineGame?.status === "WAITING"
      ? "Ждём второго игрока"
      : status.over
        ? "Партия окончена"
        : mode === "online" && myOnlineColor !== turn
          ? "Ход соперника"
          : turn === "w"
            ? "Ход белых"
            : "Ход чёрных";

  return (
    <div className="app-screen">
      <TopNav title="Шашки" backTo="/" />

      <div className="menu-group checkers-mode-card">
        <h2 className="h2">Режим</h2>
        <div className="segment checkers-mode-segment">
          <button className={`seg-item${mode === "local" ? " active" : ""}`} onClick={() => setModeAndReset("local")}>
            Вдвоём
          </button>
          <button className={`seg-item${mode === "bot" ? " active" : ""}`} onClick={() => setModeAndReset("bot")}>
            Бот
          </button>
          <button className={`seg-item${mode === "online" ? " active" : ""}`} onClick={() => setModeAndReset("online", false)}>
            Онлайн
          </button>
        </div>

        {mode === "bot" && (
          <div className="checkers-level-grid">
            {BOT_LEVELS.map((level) => (
              <button
                key={level.value}
                className={`checkers-level${botLevel === level.value ? " active" : ""}`}
                onClick={() => setBotLevel(level.value)}
                type="button"
              >
                <strong>{level.label}</strong>
                <span>{level.desc}</span>
              </button>
            ))}
          </div>
        )}

        {mode === "online" && (
          <div className="checkers-online">
            <div className="checkers-online-actions">
              <button className="btn btn-primary" onClick={createOnline}>Создать</button>
              <input
                className="input-text"
                value={joinCode}
                placeholder="Код"
                onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
              />
              <button className="btn" onClick={() => joinOnline()} disabled={!joinCode.trim()}>Войти</button>
            </div>
            {onlineGame && (
              <div className="checkers-online-code">
                <span>Код: <strong>{onlineGame.id}</strong></span>
                <button className="btn-ghost btn" onClick={copyInvite}>Ссылка</button>
              </div>
            )}
            <p className="muted">
              {myOnlineColor ? `Ты играешь ${myOnlineColor === "w" ? "белыми" : "чёрными"}` : "Создай игру или введи код друга"}
            </p>
            {onlineError && <div className="setting-error">{onlineError}</div>}
          </div>
        )}
      </div>

      <div className="local-turn">
        <span className={`local-turn-dot ${turn === "w" ? "white" : "black"}`} />
        <span>{statusText}</span>
      </div>

      <div className="board-wrap">
        <div className="checkers-board">
          {display.map((i) => {
            const [r, c] = rc(i);
            const dark = isDark(r, c);
            const piece = board[i];
            const isSel = selected === i;
            const isTarget = targetSet.has(i);
            return (
              <div
                key={i}
                className={`checkers-cell${dark ? " dark" : " light"}${isSel ? " selected" : ""}${
                  isTarget ? " target" : ""
                }`}
                onClick={() => dark && onCellClick(i)}
              >
                {piece && (
                  <span className={`checkers-piece ${piece.color}${piece.king ? " king" : ""}`}>
                    {piece.king ? "★" : ""}
                  </span>
                )}
                {isTarget && !piece && <span className="checkers-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="checkers-counts">
        <span>♙ Белые: {whiteLeft}</span>
        <span>♟ Чёрные: {blackLeft}</span>
      </div>

      {mode === "local" && (
        <div className="menu-group">
          <h2 className="h2">Ориентация доски</h2>
          <div className="segment">
            <button className={`seg-item${autoFlip ? " active" : ""}`} onClick={() => setAutoFlip(true)}>
              Переворачивать
            </button>
            <button className={`seg-item${!autoFlip ? " active" : ""}`} onClick={() => setAutoFlip(false)}>
              Фиксировано
            </button>
          </div>
        </div>
      )}

      <button className="btn btn-block" onClick={restart}>
        Заново
      </button>

      {status.over && (
        <Modal
          title={
            status.winner === "draw"
              ? "Ничья"
              : status.winner === "w"
                ? "Победа белых"
                : "Победа чёрных"
          }
          description="Соперник не может ходить."
          primaryLabel="Сыграть снова"
          onPrimary={restart}
          secondaryLabel="В меню"
          onSecondary={() => nav("/", { replace: true })}
        />
      )}
    </div>
  );
}

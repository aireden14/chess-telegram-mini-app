import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { api } from "../api/client";
import { useGameStore } from "../store/game";
import { useSocketStore } from "../store/socket";
import { useAuthStore } from "../store/auth";
import { GameStateDTO } from "../types";
import { PlayerPanel } from "../components/PlayerPanel";
import { Modal } from "../components/Modal";
import { TopNav } from "../components/TopNav";
import { makeApplePieces } from "../components/ApplePieces";
import { shareInvite, copyToClipboard } from "../hooks/useTelegram";

export function GameScreen() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { user, token } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const {
    game,
    myColor,
    opponentOnline,
    pendingPauseRequestBy,
    pendingDrawOfferBy,
    pendingResumeRequestBy,
    gameOver,
    toast,
    setGame,
    patchGame,
    setOpponentOnline,
    setPauseRequestBy,
    setDrawOfferBy,
    setResumeRequestBy,
    setGameOver,
    setToast,
    reset,
  } = useGameStore();

  const [tickWhite, setTickWhite] = useState(0);
  const [tickBlack, setTickBlack] = useState(0);
  const [showResign, setShowResign] = useState(false);
  const [showOfferDraw, setShowOfferDraw] = useState(false);
  const [pieceSelected, setPieceSelected] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<Record<string, any>>({});

  const applePieces = useMemo(() => makeApplePieces(), []);

  const captured = useMemo(() => {
    if (!game?.fen) return { w: [], b: [] };
    const pieces = game.fen.split(' ')[0].replace(/[^a-zA-Z]/g, '');
    const standard = {
      p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
      P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1
    };
    const current: Record<string, number> = {};
    for (const char of pieces) current[char] = (current[char] || 0) + 1;
    
    const missing: { w: string[], b: string[] } = { w: [], b: [] };
    if ((standard.P - (current.P || 0)) > 0) for (let i = 0; i < standard.P - (current.P || 0); i++) missing.w.push('p');
    if ((standard.N - (current.N || 0)) > 0) for (let i = 0; i < standard.N - (current.N || 0); i++) missing.w.push('n');
    if ((standard.B - (current.B || 0)) > 0) for (let i = 0; i < standard.B - (current.B || 0); i++) missing.w.push('b');
    if ((standard.R - (current.R || 0)) > 0) for (let i = 0; i < standard.R - (current.R || 0); i++) missing.w.push('r');
    if ((standard.Q - (current.Q || 0)) > 0) for (let i = 0; i < standard.Q - (current.Q || 0); i++) missing.w.push('q');
    if ((standard.p - (current.p || 0)) > 0) for (let i = 0; i < standard.p - (current.p || 0); i++) missing.b.push('p');
    if ((standard.n - (current.n || 0)) > 0) for (let i = 0; i < standard.n - (current.n || 0); i++) missing.b.push('n');
    if ((standard.b - (current.b || 0)) > 0) for (let i = 0; i < standard.b - (current.b || 0); i++) missing.b.push('b');
    if ((standard.r - (current.r || 0)) > 0) for (let i = 0; i < standard.r - (current.r || 0); i++) missing.b.push('r');
    if ((standard.q - (current.q || 0)) > 0) for (let i = 0; i < standard.q - (current.q || 0); i++) missing.b.push('q');
    
    return missing;
  }, [game?.fen]);

  // Audio assets
  const sounds = useMemo(() => ({
    move: new Audio("/sounds/move.mp3"),
    capture: new Audio("/sounds/capture.mp3"),
    check: new Audio("/sounds/check.mp3"),
    gameover: new Audio("/sounds/gameover.mp3"),
  }), []);

  const playSound = (name: keyof typeof sounds) => {
    const s = sounds[name];
    s.currentTime = 0;
    s.play().catch(() => {});
  };

  const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
    if ("vibrate" in navigator) {
      const ms = type === "heavy" ? 50 : type === "medium" ? 30 : 15;
      navigator.vibrate(ms);
    }
    // Telegram Haptic
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(type);
    }
  };

  // Загружаем стартовое состояние и подписываемся на сокет
  useEffect(() => {
    if (!gameId || !user || !token) return;
    const s = socket || connect(token);

    api
      .get<GameStateDTO>(`/games/${gameId}`)
      .then((r) => setGame(r.data, user.id))
      .catch(() => {});

    s.emit("JOIN_GAME_ROOM", { gameId });

    const onState = (p: any) => setGame(p.game, user.id);
    const onStarted = (p: any) => setGame(p.game, user.id);
    const onMove = (p: any) => {
      // Определение типа звука по PGN или FEN (упрощенно)
      const isCapture = p.pgn?.trim().split(' ').pop()?.includes('x');
      const isCheck = p.pgn?.trim().split(' ').pop()?.includes('+');
      
      if (isCheck) playSound("check");
      else if (isCapture) playSound("capture");
      else playSound("move");

      patchGame({
        fen: p.fen,
        pgn: p.pgn,
        timerWhite: p.timerWhite,
        timerBlack: p.timerBlack,
        currentTurn: p.currentTurn,
        lastMoveAt: p.lastMoveAt,
        serverTime: p.serverTime,
        drawOfferBy: null,
      });
      setDrawOfferBy(null);
    };
    const onOver = (p: any) => {
      playSound("gameover");
      triggerHaptic("heavy");
      setGame(p.game, user.id);
      setGameOver({ winner: p.winner, reason: p.reason });
    };
    const onDrawOffered = (p: any) => setDrawOfferBy(p.by);
    const onDrawDeclined = () => {
      setDrawOfferBy(null);
      setToast("Ничья отклонена");
    };
    const onPauseReq = (p: any) => setPauseRequestBy(p.by);
    const onPauseAcc = (p: any) => {
      patchGame({ status: "PAUSED", timerWhite: p.timerWhite, timerBlack: p.timerBlack });
      setPauseRequestBy(null);
      setToast("Игра на паузе");
    };
    const onPauseDec = () => {
      setPauseRequestBy(null);
      patchGame({ status: "ACTIVE" });
      setToast("Пауза отклонена");
    };
    const onResumeReq = (p: any) => setResumeRequestBy(p.by);
    const onResumeAcc = (p: any) =>
      patchGame({ status: "ACTIVE", timerWhite: p.timerWhite, timerBlack: p.timerBlack, fen: p.fen, pgn: p.pgn });
    const onErr = (p: any) => setToast(p.message || "Ошибка");
    const onOpOnline = () => setOpponentOnline(true);
    const onOpOffline = () => setOpponentOnline(false);

    s.on("GAME_STATE", onState);
    s.on("GAME_STARTED", onStarted);
    s.on("MOVE_MADE", onMove);
    s.on("GAME_OVER", onOver);
    s.on("DRAW_OFFERED", onDrawOffered);
    s.on("DRAW_DECLINED", onDrawDeclined);
    s.on("PAUSE_REQUESTED", onPauseReq);
    s.on("PAUSE_ACCEPTED", onPauseAcc);
    s.on("PAUSE_DECLINED", onPauseDec);
    s.on("RESUME_REQUESTED", onResumeReq);
    s.on("RESUME_ACCEPTED", onResumeAcc);
    s.on("OPPONENT_ONLINE", onOpOnline);
    s.on("OPPONENT_OFFLINE", onOpOffline);
    s.on("ERROR", onErr);

    return () => {
      s.off("GAME_STATE", onState);
      s.off("GAME_STARTED", onStarted);
      s.off("MOVE_MADE", onMove);
      s.off("GAME_OVER", onOver);
      s.off("DRAW_OFFERED", onDrawOffered);
      s.off("DRAW_DECLINED", onDrawDeclined);
      s.off("PAUSE_REQUESTED", onPauseReq);
      s.off("PAUSE_ACCEPTED", onPauseAcc);
      s.off("PAUSE_DECLINED", onPauseDec);
      s.off("RESUME_REQUESTED", onResumeReq);
      s.off("RESUME_ACCEPTED", onResumeAcc);
      s.off("OPPONENT_ONLINE", onOpOnline);
      s.off("OPPONENT_OFFLINE", onOpOffline);
      s.off("ERROR", onErr);
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, user?.id, token]);

  // Локальный таймер (только UI)
  useEffect(() => {
    if (!game) return;
    setTickWhite(game.timerWhite);
    setTickBlack(game.timerBlack);
    if (game.status !== "ACTIVE" || (game.settings?.timeControl ?? 0) === 0) return;
    const start = Date.now();
    const baseW = game.timerWhite;
    const baseB = game.timerBlack;
    const turn = game.currentTurn;
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      if (turn === "w") setTickWhite(Math.max(0, baseW - elapsed));
      else setTickBlack(Math.max(0, baseB - elapsed));
    }, 250);
    return () => clearInterval(id);
  }, [game?.fen, game?.status, game?.currentTurn]);

  if (!game || !user) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const infinite = (game.settings?.timeControl ?? 0) === 0;
  const isMyTurn =
    game.status === "ACTIVE" &&
    ((myColor === "white" && game.currentTurn === "w") ||
      (myColor === "black" && game.currentTurn === "b"));

  const orientation: "white" | "black" = myColor === "black" ? "black" : "white";

  function clearSelection() {
    setPieceSelected(null);
    setLegalSquares({});
  }

  function makeMoveAttempt(from: string, to: string, promotion = "q"): boolean {
    if (!isMyTurn || !socket || !game) return false;
    const chess = new Chess(game.fen);
    let res;
    try {
      res = chess.move({ from, to, promotion: promotion as any });
    } catch {
      return false;
    }
    if (!res) return false;
    
    // Haptics
    triggerHaptic("light");
    
    socket.emit("MAKE_MOVE", { gameId: game.id, move: { from, to, promotion } });
    clearSelection();
    return true;
  }

  function onSquareClick(square: string) {
    if (!isMyTurn) return;
    const chess = new Chess(game!.fen);
    if (pieceSelected) {
      const ok = makeMoveAttempt(pieceSelected, square);
      if (ok) return;
      const piece = chess.get(square as Square);
      if (piece && piece.color === game!.currentTurn) {
        selectSquare(square);
      } else {
        clearSelection();
      }
    } else {
      const piece = chess.get(square as Square);
      if (piece && piece.color === game!.currentTurn) {
        selectSquare(square);
      }
    }
  }

  function selectSquare(square: string) {
    const chess = new Chess(game!.fen);
    const moves = chess.moves({ square: square as Square, verbose: true }) as any[];
    
    const dotColor = myColor === 'white' ? "rgba(255,255,255,0.5)" : "rgba(255,215,0,0.5)";
    const selectColor = myColor === 'white' ? "rgba(255,255,255,0.15)" : "rgba(255,215,0,0.15)";
    const borderColor = myColor === 'white' ? "rgba(255,255,255,0.3)" : "rgba(255,215,0,0.3)";

    const dots: Record<string, any> = {};
    for (const m of moves) {
      dots[m.to] = {
        background: m.captured
          ? "rgba(255, 59, 48, 0.35)"
          : `radial-gradient(circle, ${dotColor} 22%, transparent 23%)`,
        border: m.captured ? "2px solid rgba(255, 59, 48, 0.5)" : "none",
        borderRadius: m.captured ? "16px" : "50%",
      };
    }
    dots[square] = { 
      background: selectColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '16px'
    };
    setPieceSelected(square);
    setLegalSquares(dots);
  }

  function onPieceDrop(from: string, to: string): boolean {
    return makeMoveAttempt(from, to);
  }

  function inviteLink() {
    const botUsername = (window as any).__BOT_USERNAME__ || "";
    return `https://t.me/${botUsername || "your_bot"}/app?startapp=${game!.id}`;
  }

  const meIsRequester = (by: string | null) => by === myColor;

  return (
    <div className="app-screen">
      <TopNav title="Шахматы" backTo="/" />

      {/* Противник */}
      <div className="player-section">
        <PlayerPanel
          player={myColor === "white" ? game.playerBlack : game.playerWhite}
          timer={myColor === "white" ? tickBlack : tickWhite}
          infinite={infinite}
          active={
            game.status === "ACTIVE" &&
            ((myColor === "white" && game.currentTurn === "b") ||
              (myColor === "black" && game.currentTurn === "w"))
          }
          online={
            (myColor === "white" ? game.playerBlack : game.playerWhite)?.isBot
              ? true
              : opponentOnline
          }
        />
        <div className="captured-shelf">
          {captured[myColor === "white" ? "b" : "w"].map((p, i) => (
            <div key={i} className="captured-piece">{applePieces[`${myColor === "white" ? "b" : "w"}${p.toUpperCase()}`]({ squareWidth: 16 })}</div>
          ))}
        </div>
      </div>

      <div className="board-wrap">
        <Chessboard
          position={game.fen}
          boardOrientation={orientation}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          arePiecesDraggable={isMyTurn}
          customSquareStyles={legalSquares}
          customPieces={applePieces}
          customBoardStyle={{ borderRadius: 12 }}
          customDarkSquareStyle={{ backgroundColor: "rgba(255, 255, 255, 0.04)", borderRadius: '16px' }}
          customLightSquareStyle={{ backgroundColor: "rgba(255, 255, 255, 0.12)", borderRadius: '16px' }}
          showBoardNotation={false}
        />
      </div>

      {/* Я */}
      <div className="player-section">
        <div className="captured-shelf">
          {captured[myColor === "white" ? "w" : "b"].map((p, i) => (
            <div key={i} className="captured-piece">{applePieces[`${myColor === "white" ? "w" : "b"}${p.toUpperCase()}`]({ squareWidth: 16 })}</div>
          ))}
        </div>
        <PlayerPanel
          player={myColor === "white" ? game.playerWhite : game.playerBlack}
          timer={myColor === "white" ? tickWhite : tickBlack}
          infinite={infinite}
          active={isMyTurn}
          isMe
        />
      </div>

      <MovesList pgn={game.pgn} />

      {game.status === "WAITING" && (
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 8 }}>⏳ Ожидаем соперника</h2>
          <p className="muted" style={{ margin: "0 0 12px" }}>
            Поделитесь ссылкой, чтобы пригласить друга:
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => shareInvite(inviteLink())}>
              📤 Поделиться
            </button>
            <button
              className="btn"
              onClick={() => {
                copyToClipboard(inviteLink());
                setToast("Ссылка скопирована");
              }}
            >
              📋
            </button>
          </div>
          <button
            className="btn-ghost btn"
            style={{ marginTop: 8, width: "100%" }}
            onClick={async () => {
              await api.delete(`/games/${game.id}/cancel`).catch(() => {});
              nav("/", { replace: true });
            }}
          >
            Отменить
          </button>
        </div>
      )}

      {game.status === "ACTIVE" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setShowResign(true)}>
            🏳 Сдаться
          </button>
          {!game.isBotGame && (
            <button className="btn" style={{ flex: 1 }} onClick={() => setShowOfferDraw(true)}>
              🤝 Ничья
            </button>
          )}
          {!game.isBotGame && (
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => socket?.emit("REQUEST_PAUSE", { gameId: game.id })}
            >
              ⏸ Пауза
            </button>
          )}
        </div>
      )}

      {game.status === "PAUSED" && (
        <div className="card" style={{ textAlign: "center" }}>
          <h2 className="h2">⏸ Игра на паузе</h2>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 12 }}
            onClick={() => socket?.emit("REQUEST_RESUME", { gameId: game.id })}
          >
            ▶ Продолжить
          </button>
        </div>
      )}

      {/* Modals */}
      {showResign && (
        <Modal
          title="Сдаться?"
          description="Вы потеряете эту партию."
          primaryLabel="Сдаться"
          secondaryLabel="Отмена"
          onPrimary={() => {
            socket?.emit("RESIGN", { gameId: game.id });
            setShowResign(false);
          }}
          onSecondary={() => setShowResign(false)}
        />
      )}

      {showOfferDraw && (
        <Modal
          title="Предложить ничью?"
          primaryLabel="Предложить"
          secondaryLabel="Отмена"
          onPrimary={() => {
            socket?.emit("OFFER_DRAW", { gameId: game.id });
            setShowOfferDraw(false);
            setToast("Предложение отправлено");
          }}
          onSecondary={() => setShowOfferDraw(false)}
        />
      )}

      {pendingDrawOfferBy && !meIsRequester(pendingDrawOfferBy) && (
        <Modal
          title="Соперник предлагает ничью"
          primaryLabel="Принять"
          secondaryLabel="Отклонить"
          onPrimary={() => socket?.emit("ACCEPT_DRAW", { gameId: game.id })}
          onSecondary={() => socket?.emit("DECLINE_DRAW", { gameId: game.id })}
        />
      )}

      {pendingPauseRequestBy && !meIsRequester(pendingPauseRequestBy) && game.status === "PAUSE_REQUESTED" && (
        <Modal
          title="Соперник предлагает паузу"
          primaryLabel="Принять"
          secondaryLabel="Отклонить"
          onPrimary={() => socket?.emit("ACCEPT_PAUSE", { gameId: game.id })}
          onSecondary={() => socket?.emit("DECLINE_PAUSE", { gameId: game.id })}
        />
      )}

      {pendingResumeRequestBy && !meIsRequester(pendingResumeRequestBy) && game.status === "PAUSED" && (
        <Modal
          title="Соперник хочет продолжить"
          primaryLabel="Продолжить"
          secondaryLabel="Не сейчас"
          onPrimary={() => socket?.emit("ACCEPT_RESUME", { gameId: game.id })}
          onSecondary={() => {
            socket?.emit("DECLINE_RESUME", { gameId: game.id });
            setResumeRequestBy(null);
          }}
        />
      )}

      {gameOver && (
        <Modal
          title={
            gameOver.winner === "draw"
              ? "🤝 Ничья"
              : (gameOver.winner === "white" && myColor === "white") ||
                (gameOver.winner === "black" && myColor === "black")
              ? "🏆 Победа!"
              : "Поражение"
          }
          description={endReasonText(gameOver.reason)}
          primaryLabel="В меню"
          onPrimary={() => nav("/", { replace: true })}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function endReasonText(r: string): string {
  switch (r) {
    case "checkmate":
      return "Мат";
    case "timeout":
      return "Истекло время";
    case "resignation":
      return "Игрок сдался";
    case "stalemate":
      return "Пат";
    case "draw_agreement":
      return "Договорная ничья";
    case "fifty_move":
      return "Правило 50 ходов";
    case "threefold":
      return "Троекратное повторение";
    case "insufficient":
      return "Недостаточно материала";
    default:
      return r;
  }
}

function MovesList({ pgn }: { pgn: string }) {
  const moves = useMemo(() => {
    if (!pgn) return [] as string[];
    try {
      const c = new Chess();
      c.loadPgn(pgn);
      return c.history();
    } catch {
      return [];
    }
  }, [pgn]);
  if (moves.length === 0)
    return (
      <div className="moves-list" style={{ minHeight: 36 }}>
        <span className="muted" style={{ fontSize: 13 }}>Ходы появятся здесь</span>
      </div>
    );
  return (
    <div className="moves-list">
      {moves.map((m, i) => (
        <span key={i} className="move">
          {i % 2 === 0 ? `${i / 2 + 1}.` : ""} {m}
        </span>
      ))}
    </div>
  );
}

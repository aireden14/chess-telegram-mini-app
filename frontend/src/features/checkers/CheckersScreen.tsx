import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";
import { Modal } from "../../components/Modal";
import { triggerHaptic } from "../../hooks/useTelegram";
import { celebrate } from "../../hooks/celebrate";
import {
  Board,
  Color,
  applyMove,
  hasAnyMove,
  idx,
  initialBoard,
  isDark,
  legalForPiece,
  pieceCaptures,
  rc,
} from "./checkersEngine";

const SAVE_KEY = "chess-app-checkers-v1";

interface Target {
  to: number;
  captured: number | null;
}

interface Saved {
  board: Board;
  turn: Color;
  autoFlip: boolean;
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p?.board) && p.board.length === 64 && (p.turn === "w" || p.turn === "b")) {
        return { board: p.board, turn: p.turn, autoFlip: p.autoFlip !== false };
      }
    }
  } catch {}
  return { board: initialBoard(), turn: "w", autoFlip: true };
}

export function CheckersScreen() {
  const nav = useNavigate();
  const init = useMemo(loadSaved, []);
  const [board, setBoard] = useState<Board>(init.board);
  const [turn, setTurn] = useState<Color>(init.turn);
  const [autoFlip, setAutoFlip] = useState(init.autoFlip);
  const [selected, setSelected] = useState<number | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [chain, setChain] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ board, turn, autoFlip }));
    } catch {}
  }, [board, turn, autoFlip]);

  const status = useMemo(() => {
    if (!hasAnyMove(board, turn)) {
      return { over: true, winner: (turn === "w" ? "b" : "w") as Color };
    }
    return { over: false, winner: null as Color | null };
  }, [board, turn]);

  useEffect(() => {
    if (status.over) celebrate();
  }, [status.over]);

  const targetSet = useMemo(() => new Set(targets.map((t) => t.to)), [targets]);

  function clearSel() {
    setSelected(null);
    setTargets([]);
  }

  function selectPiece(i: number) {
    const { captures, moves } = legalForPiece(board, i);
    if (captures.length === 0 && moves.length === 0) return;
    setSelected(i);
    setTargets([
      ...captures.map((c) => ({ to: c.to, captured: c.captured })),
      ...moves.map((m) => ({ to: m, captured: null as number | null })),
    ]);
  }

  function onCellClick(i: number) {
    if (status.over) return;
    if (selected !== null && targetSet.has(i)) {
      const t = targets.find((x) => x.to === i)!;
      const res = applyMove(board, selected, i, t.captured);
      triggerHaptic(t.captured !== null ? "medium" : "light");
      setBoard(res.board);
      if (res.mustContinue) {
        setSelected(res.end);
        setChain(true);
        setTargets(pieceCaptures(res.board, res.end).map((c) => ({ to: c.to, captured: c.captured })));
      } else {
        clearSel();
        setChain(false);
        setTurn(turn === "w" ? "b" : "w");
      }
      return;
    }
    if (chain) return;
    const p = board[i];
    if (p && p.color === turn) selectPiece(i);
    else clearSel();
  }

  function restart() {
    const isFresh = JSON.stringify(board) === JSON.stringify(initialBoard());
    if (!status.over && !isFresh && !window.confirm("Начать новую партию? Текущая будет сброшена.")) {
      return;
    }
    triggerHaptic("medium");
    setBoard(initialBoard());
    setTurn("w");
    clearSel();
    setChain(false);
  }

  const flipped = autoFlip && turn === "b";
  const order = useMemo(() => {
    const a: number[] = [];
    for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) a.push(idx(r, c));
    return a;
  }, []);
  const display = flipped ? [...order].reverse() : order;

  const whiteLeft = board.filter((p) => p?.color === "w").length;
  const blackLeft = board.filter((p) => p?.color === "b").length;

  return (
    <div className="app-screen">
      <TopNav title="Шашки" backTo="/" />

      <div className="local-turn">
        <span className={`local-turn-dot ${turn === "w" ? "white" : "black"}`} />
        <span>
          {status.over
            ? "Партия окончена"
            : turn === "w"
              ? "Ход белых"
              : "Ход чёрных"}
        </span>
      </div>

      <div className="board-wrap">
        <div className="checkers-board">
          {display.map((i) => {
            const [r, c] = rc(i);
            const dark = isDark(r, c);
            const p = board[i];
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
                {p && (
                  <span className={`checkers-piece ${p.color}${p.king ? " king" : ""}`}>
                    {p.king ? "★" : ""}
                  </span>
                )}
                {isTarget && !p && <span className="checkers-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="checkers-counts">
        <span>♙ Белые: {whiteLeft}</span>
        <span>♟ Чёрные: {blackLeft}</span>
      </div>

      <div className="menu-group">
        <h2 className="h2">Ориентация доски</h2>
        <div className="segment">
          <button
            className={`seg-item${autoFlip ? " active" : ""}`}
            onClick={() => setAutoFlip(true)}
          >
            Переворачивать
          </button>
          <button
            className={`seg-item${!autoFlip ? " active" : ""}`}
            onClick={() => setAutoFlip(false)}
          >
            Фиксировано
          </button>
        </div>
      </div>

      <button className="btn btn-block" onClick={restart}>
        Заново
      </button>

      {status.over && (
        <Modal
          title={status.winner === "w" ? "Победа белых" : "Победа чёрных"}
          description="Соперник не может ходить."
          primaryLabel="Сыграть снова"
          onPrimary={() => {
            setBoard(initialBoard());
            setTurn("w");
            clearSel();
            setChain(false);
          }}
          secondaryLabel="В меню"
          onSecondary={() => nav("/", { replace: true })}
        />
      )}
    </div>
  );
}

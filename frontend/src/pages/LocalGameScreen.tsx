import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { TopNav } from "../components/TopNav";
import { Modal } from "../components/Modal";
import { makePiecesForStyle } from "../components/pieceStyles";
import { usePieceStyleStore } from "../store/pieceStyle";
import { triggerHaptic } from "../hooks/useTelegram";

const START_FEN = new Chess().fen();
const SAVE_KEY = "chess-local-game-v1";

function loadSaved(): { fen: string; autoFlip: boolean } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.fen === "string") {
        new Chess(parsed.fen); // throws if invalid
        return { fen: parsed.fen, autoFlip: parsed.autoFlip !== false };
      }
    }
  } catch {}
  return { fen: START_FEN, autoFlip: true };
}

export function LocalGameScreen() {
  const nav = useNavigate();
  const pieceStyle = usePieceStyleStore((s) => s.pieceStyle);
  const customPieces = useMemo(() => makePiecesForStyle(pieceStyle), [pieceStyle]);

  const [fen, setFen] = useState(() => loadSaved().fen);
  const [selected, setSelected] = useState<string | null>(null);
  const [legal, setLegal] = useState<Record<string, any>>({});
  const [autoFlip, setAutoFlip] = useState(() => loadSaved().autoFlip);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ fen, autoFlip }));
    } catch {}
  }, [fen, autoFlip]);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn(); // "w" | "b"
  const orientation: "white" | "black" = autoFlip
    ? turn === "w"
      ? "white"
      : "black"
    : "white";

  const status = useMemo(() => {
    if (chess.isCheckmate())
      return { over: true, title: turn === "w" ? "Победа чёрных" : "Победа белых", reason: "Мат" };
    if (chess.isStalemate()) return { over: true, title: "Ничья", reason: "Пат" };
    if (chess.isInsufficientMaterial())
      return { over: true, title: "Ничья", reason: "Недостаточно материала" };
    if (chess.isThreefoldRepetition())
      return { over: true, title: "Ничья", reason: "Троекратное повторение" };
    if (chess.isDraw()) return { over: true, title: "Ничья", reason: "Ничья по правилам" };
    return { over: false, title: "", reason: "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  function clearSel() {
    setSelected(null);
    setLegal({});
  }

  function applyMove(from: string, to: string): boolean {
    const c = new Chess(fen);
    let res;
    try {
      res = c.move({ from, to, promotion: "q" });
    } catch {
      return false;
    }
    if (!res) return false;
    triggerHaptic("light");
    setFen(c.fen());
    clearSel();
    return true;
  }

  function highlight(square: string) {
    const moves = chess.moves({ square: square as Square, verbose: true }) as any[];
    const dots: Record<string, any> = {};
    for (const m of moves) {
      dots[m.to] = {
        background: m.captured
          ? "var(--move-capture-bg)"
          : "radial-gradient(circle, var(--move-dot) 20%, transparent 22%)",
        border: m.captured ? "2px solid var(--move-capture-border)" : "none",
        borderRadius: "10px",
      };
    }
    dots[square] = {
      background: "var(--move-selected-bg)",
      border: "2px solid var(--move-selected-border)",
      borderRadius: "10px",
    };
    setSelected(square);
    setLegal(dots);
  }

  function onSquareClick(square: string) {
    if (status.over) return;
    if (selected) {
      if (applyMove(selected, square)) return;
      const piece = chess.get(square as Square);
      if (piece && piece.color === turn) highlight(square);
      else clearSel();
    } else {
      const piece = chess.get(square as Square);
      if (piece && piece.color === turn) highlight(square);
    }
  }

  function onPieceDrop(from: string, to: string): boolean {
    if (status.over) return false;
    return applyMove(from, to);
  }

  function restart() {
    triggerHaptic("medium");
    setFen(START_FEN);
    clearSel();
  }

  return (
    <div className="app-screen">
      <TopNav title="Игра вдвоём" backTo="/chess" />

      <div className="local-turn">
        <span className={`local-turn-dot ${turn === "w" ? "white" : "black"}`} />
        <span>
          {status.over
            ? "Партия окончена"
            : turn === "w"
              ? "Ход белых"
              : "Ход чёрных"}
          {chess.isCheck() && !status.over ? " · шах" : ""}
        </span>
      </div>

      <div className="board-wrap">
        <Chessboard
          position={fen}
          boardOrientation={orientation}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={legal}
          customPieces={customPieces}
          customBoardStyle={{ borderRadius: 20, overflow: "hidden" }}
          customDarkSquareStyle={{ backgroundColor: "var(--board-dark)", borderRadius: "10px" }}
          customLightSquareStyle={{ backgroundColor: "var(--board-light)", borderRadius: "10px" }}
          showBoardNotation={false}
        />
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
          title={status.title}
          description={status.reason}
          primaryLabel="Сыграть снова"
          onPrimary={restart}
          secondaryLabel="В меню"
          onSecondary={() => nav("/chess", { replace: true })}
        />
      )}
    </div>
  );
}

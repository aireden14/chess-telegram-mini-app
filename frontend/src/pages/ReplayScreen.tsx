import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { TopNav } from "../components/TopNav";
import { api } from "../api/client";
import { GameStateDTO } from "../types";
import { useAuthStore } from "../store/auth";
import { makePiecesForStyle } from "../components/pieceStyles";
import { usePieceStyleStore } from "../store/pieceStyle";

export function ReplayScreen() {
  const { gameId } = useParams();
  const me = useAuthStore((s) => s.user);
  const pieceStyle = usePieceStyleStore((s) => s.pieceStyle);
  const [game, setGame] = useState<GameStateDTO | null>(null);
  const [idx, setIdx] = useState(0);
  const customPieces = useMemo(() => makePiecesForStyle(pieceStyle), [pieceStyle]);

  useEffect(() => {
    if (!gameId) return;
    api.get<GameStateDTO>(`/games/${gameId}`).then((r) => setGame(r.data));
  }, [gameId]);

  const positions = useMemo(() => {
    if (!game?.pgn) return [new Chess().fen()];
    const c = new Chess();
    try {
      c.loadPgn(game.pgn);
    } catch {
      return [new Chess().fen()];
    }
    const history = c.history({ verbose: true });
    const replay = new Chess();
    const fens = [replay.fen()];
    for (const h of history) {
      replay.move({ from: h.from, to: h.to, promotion: h.promotion });
      fens.push(replay.fen());
    }
    return fens;
  }, [game?.pgn]);

  const orientation: "white" | "black" =
    game && game.playerBlack?.id === me?.id ? "black" : "white";

  return (
    <div className="app-screen">
      <TopNav title="Просмотр партии" backTo="/history" />
      {!game ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="board-wrap">
            <Chessboard
              position={positions[idx]}
              boardOrientation={orientation}
              arePiecesDraggable={false}
              customPieces={customPieces}
              customBoardStyle={{ borderRadius: 20, overflow: "hidden" }}
              customDarkSquareStyle={{ backgroundColor: "var(--board-dark)", borderRadius: "10px" }}
              customLightSquareStyle={{ backgroundColor: "var(--board-light)", borderRadius: "10px" }}
            />
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="muted" style={{ marginBottom: 8 }}>
              Ход {idx} / {positions.length - 1}
            </div>
            <input
              type="range"
              min={0}
              max={positions.length - 1}
              value={idx}
              onChange={(e) => setIdx(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setIdx(0)}>⏮</button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => setIdx(Math.max(0, idx - 1))}
              >
                ←
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => setIdx(Math.min(positions.length - 1, idx + 1))}
              >
                →
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => setIdx(positions.length - 1)}
              >
                ⏭
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

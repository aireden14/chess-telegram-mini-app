import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/TopNav";
import { api } from "../api/client";
import { GameStateDTO } from "../types";
import { useAuthStore } from "../store/auth";

export function HistoryScreen() {
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [games, setGames] = useState<GameStateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get<GameStateDTO[]>("/games/my/history")
      .then((r) => setGames(r.data))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="app-screen">
      <TopNav title="История" backTo="/" />
      {loading ? (
        <div className="spinner" />
      ) : games.length === 0 ? (
        <div className="empty">
          <div className="emoji">🕘</div>
          <div>Партий пока нет</div>
        </div>
      ) : (
        <div className="card-grouped">
          {games.map((g) => {
            const iAmWhite = g.playerWhite?.id === me?.id;
            const opponent = iAmWhite ? g.playerBlack : g.playerWhite;
            const win =
              (iAmWhite && g.winner === "white") || (!iAmWhite && g.winner === "black");
            const draw = g.winner === "draw";
            return (
              <button key={g.id} className="row" onClick={() => nav(`/replay/${g.id}`)}>
                <div className="row-title">
                  <div>{opponent?.firstName ?? "—"}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{g.endReason}</div>
                </div>
                <div
                  className="row-value"
                  style={{
                    color: draw ? "var(--label-tertiary)" : win ? "var(--green)" : "var(--red)",
                    fontWeight: 600,
                  }}
                >
                  {draw ? "½" : win ? "+1" : "0"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

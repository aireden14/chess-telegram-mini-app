import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/TopNav";
import { api } from "../api/client";
import { GameStateDTO } from "../types";
import { useAuthStore } from "../store/auth";

export function PausedScreen() {
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [games, setGames] = useState<GameStateDTO[]>([]);
  useEffect(() => {
    api
      .get<GameStateDTO[]>("/games/my/active")
      .then((r) =>
        setGames(
          r.data.filter((g) => g.status === "PAUSED" || g.status === "PAUSE_REQUESTED"),
        ),
      );
  }, []);
  return (
    <div className="app-screen">
      <TopNav title="⏸ Паузы" backTo="/" />
      {games.length === 0 ? (
        <div className="empty">
          <div className="emoji">⏸</div>
          <div>Нет приостановленных партий</div>
        </div>
      ) : (
        <div className="card-grouped">
          {games.map((g) => {
            const opp = g.playerWhite?.id === me?.id ? g.playerBlack : g.playerWhite;
            return (
              <button key={g.id} className="row" onClick={() => nav(`/game/${g.id}`)}>
                <div className="row-title">vs {opp?.firstName ?? "—"}</div>
                <div className="row-value">{g.status === "PAUSED" ? "пауза" : "запрос"} ›</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

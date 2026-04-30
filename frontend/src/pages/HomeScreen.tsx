import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { GameStateDTO } from "../types";

export function HomeScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [active, setActive] = useState<GameStateDTO[]>([]);

  useEffect(() => {
    api
      .get<GameStateDTO[]>("/games/my/active")
      .then((r) => setActive(r.data))
      .catch(() => {});
  }, []);

  const paused = active.filter(
    (g) => g.status === "PAUSED" || g.status === "PAUSE_REQUESTED",
  );
  const inProgress = active.filter((g) => g.status === "ACTIVE" || g.status === "WAITING");

  return (
    <div className="app-screen">
      <h1 className="h1">♟ Шахматы</h1>

      {user && (
        <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div className="avatar">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" />
            ) : (
              user.firstName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{user.firstName}</div>
            <div className="muted">Рейтинг: {user.rating}</div>
          </div>
          <button className="btn-ghost btn" onClick={() => nav("/profile")}>
            Профиль
          </button>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={() => nav("/create")}>
        ✨ Создать игру
      </button>

      <button className="btn btn-block" onClick={() => nav("/create?bot=1")}>
        🤖 Играть с ботом
      </button>

      <div className="card-grouped">
        <button className="row" onClick={() => nav("/paused")}>
          <div className="row-title">⏸ Мои паузы</div>
          <div className="row-value">{paused.length || ""} ›</div>
        </button>
        <button className="row" onClick={() => nav("/history")}>
          <div className="row-title">🕘 История партий</div>
          <div className="row-value">›</div>
        </button>
        <button className="row" onClick={() => nav("/leaderboard")}>
          <div className="row-title">🏆 Таблица лидеров</div>
          <div className="row-value">›</div>
        </button>
      </div>

      {inProgress.length > 0 && (
        <>
          <h2 className="h2" style={{ marginTop: 8 }}>Активные игры</h2>
          <div className="card-grouped">
            {inProgress.map((g) => (
              <button key={g.id} className="row" onClick={() => nav(`/game/${g.id}`)}>
                <div className="row-title">
                  {g.status === "WAITING"
                    ? "⏳ Ожидание соперника"
                    : `vs ${
                        g.playerWhite?.id === user?.id
                          ? g.playerBlack?.firstName
                          : g.playerWhite?.firstName
                      }`}
                </div>
                <div className="row-value">›</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

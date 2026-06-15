import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { TopNav } from "../components/TopNav";
import { PieceStylePicker } from "../components/PieceStylePicker";
import { GameStateDTO } from "../types";
import { triggerHaptic } from "../hooks/useTelegram";

function timeLabel(seconds: number) {
  return seconds === 0 ? "∞" : `${seconds / 60}м`;
}

export function ChessHubScreen() {
  const nav = useNavigate();
  const [active, setActive] = useState<GameStateDTO[]>([]);
  const [publicSessions, setPublicSessions] = useState<GameStateDTO[]>([]);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    api
      .get<GameStateDTO[]>("/games/my/active")
      .then((r) => setActive(r.data))
      .catch(() => {});
    api
      .get<GameStateDTO[]>("/games/public/waiting")
      .then((r) => setPublicSessions(r.data))
      .catch(() => {});
  }, []);

  const paused = active.filter((g) => g.status === "PAUSED" || g.status === "PAUSE_REQUESTED");
  const inProgress = active.filter((g) => g.status === "ACTIVE" || g.status === "WAITING");

  const go = (to: string) => {
    triggerHaptic("light");
    nav(to);
  };

  return (
    <div className="app-screen">
      <TopNav title="Шахматы" backTo="/" />

      <div className="game-actions">
        <button className="btn btn-primary btn-block" onClick={() => go("/create")}>
          Создать игру
        </button>
        <button className="btn btn-block" onClick={() => go("/create?bot=1")}>
          Играть с ботом
        </button>
        <button className="btn btn-block" onClick={() => go("/local")}>
          Игра вдвоём на одном устройстве
        </button>
        <div className="menu-group join-code-card">
          <input
            type="text"
            className="input-text"
            placeholder="Код игры"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
          />
          <button
            className="btn btn-primary"
            disabled={!joinCode.trim()}
            onClick={() => go(`/join/${joinCode.trim()}`)}
          >
            Вход
          </button>
        </div>
      </div>

      <PieceStylePicker />

      {inProgress.length > 0 && (
        <section className="hub-section">
          <h2 className="h2">Активные игры</h2>
          <div className="card-grouped">
            {inProgress.map((g) => (
              <button key={g.id} className="row" onClick={() => go(`/game/${g.id}`)}>
                <div className="row-title">
                  {g.isBotGame ? "Бот" : "Игрок"} · {timeLabel(g.settings.timeControl)}
                </div>
                <div className="row-value">
                  {g.status === "WAITING" ? "Ожидание..." : "Игра идёт"} ›
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {publicSessions.length > 0 && (
        <section className="hub-section">
          <h2 className="h2">Открытые сессии</h2>
          <div className="card-grouped">
            {publicSessions.map((g) => (
              <button key={g.id} className="row" onClick={() => go(`/join/${g.id}`)}>
                <div className="row-title">
                  Игрок {g.playerWhite?.firstName || g.playerBlack?.firstName} ·{" "}
                  {timeLabel(g.settings.timeControl)}
                </div>
                <div className="row-value">Присоединиться ›</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="card-grouped">
        <button className="row" onClick={() => go("/paused")}>
          <div className="row-title">Паузы</div>
          <div className="row-value">{paused.length || ""} ›</div>
        </button>
        <button className="row" onClick={() => go("/history")}>
          <div className="row-title">История партий</div>
          <div className="row-value">›</div>
        </button>
        <button className="row" onClick={() => go("/leaderboard")}>
          <div className="row-title">Таблица лидеров</div>
          <div className="row-value">›</div>
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { useThemeStore, ThemeType } from "../store/theme";
import { GameStateDTO } from "../types";
import { PieceStylePicker } from "../components/PieceStylePicker";

const THEMES: { label: string; value: ThemeType; icon: string }[] = [
  { label: "Night", value: "dark", icon: "♛" },
  { label: "Day", value: "light", icon: "♔" },
];

type GameHubMode = "chess" | "sudoku" | "forceDeflector";

export function HomeScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const [activeMode, setActiveMode] = useState<GameHubMode>("chess");
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

  const paused = active.filter(
    (g) => g.status === "PAUSED" || g.status === "PAUSE_REQUESTED",
  );
  const inProgress = active.filter((g) => g.status === "ACTIVE" || g.status === "WAITING");

  return (
    <div className="app-screen">
      <h1 className="h1">Игры</h1>

      {user && (
        <div className="card home-profile-card">
          <div className="avatar">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="" />
            ) : (
              user.firstName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="home-profile-copy">
            <div className="home-profile-name">{user.firstName}</div>
            <div className="muted">Шахматный рейтинг: {user.rating}</div>
          </div>
          <button className="btn-ghost btn" onClick={() => nav("/profile")}>
            Профиль
          </button>
        </div>
      )}

      <div className="menu-group">
        <h2 className="h2">Тема оформления</h2>
        <div className="segment">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={`seg-item${theme === t.value ? " active" : ""}`}
              onClick={() => setTheme(t.value)}
            >
              {t.icon} <span>{t.label}</span>
            </button>
          ))}
        </div>
        <PieceStylePicker embedded />
      </div>

      <div className="game-hub">
        <button
          className={`game-mode-card${activeMode === "chess" ? " active" : ""}`}
          onClick={() => setActiveMode("chess")}
        >
          <span className="game-mode-icon">♞</span>
          <strong>Шахматы</strong>
          <em>мультиплеер · бот · рейтинг</em>
        </button>
        <button
          className={`game-mode-card${activeMode === "sudoku" ? " active" : ""}`}
          onClick={() => setActiveMode("sudoku")}
        >
          <span className="game-mode-icon">▦</span>
          <strong>Судоку</strong>
          <em>ежедневная · заметки · подсказки</em>
        </button>
        <button
          className={`game-mode-card wide${activeMode === "forceDeflector" ? " active" : ""}`}
          onClick={() => setActiveMode("forceDeflector")}
        >
          <span className="game-mode-icon">✦</span>
          <strong>Отражатель</strong>
          <em>арена · клинок · iPhone-управление</em>
        </button>
      </div>

      {activeMode === "chess" && (
        <div className="game-actions">
          <button className="btn btn-primary btn-block" onClick={() => nav("/create")}>
            Создать игру
          </button>

          <button className="btn btn-block" onClick={() => nav("/create?bot=1")}>
            Играть с ботом
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
              onClick={() => nav(`/join/${joinCode.trim()}`)}
            >
              Вход
            </button>
          </div>

          <div className="card-grouped">
            <button className="row" onClick={() => nav("/paused")}>
              <div className="row-title">Паузы</div>
              <div className="row-value">{paused.length || ""} ›</div>
            </button>
            <button className="row" onClick={() => nav("/history")}>
              <div className="row-title">История партий</div>
              <div className="row-value">›</div>
            </button>
            <button className="row" onClick={() => nav("/leaderboard")}>
              <div className="row-title">Таблица лидеров</div>
              <div className="row-value">›</div>
            </button>
          </div>
        </div>
      )}

      {activeMode === "sudoku" && (
        <section className="card sudoku-home-card">
          <p className="sudoku-kicker">Новый режим</p>
          <h2>▦ Судоку в Apple-стиле</h2>
          <p className="muted">
            Ежедневная задачка, заметки, подсказки, локальный прогресс и мягкая Telegram-вибрация.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => nav("/sudoku")}>
            Играть в судоку
          </button>
        </section>
      )}

      {activeMode === "forceDeflector" && (
        <section className="card game-feature-card">
          <p className="sudoku-kicker">Аркада</p>
          <h2>Световой Отражатель</h2>
          <p className="muted">
            Неоновая арена: отражай болты клинком, собирай опыт, выбирай апгрейды и играй с
            мобильным джойстиком прямо в Telegram.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => nav("/force-deflector")}>
            Играть в отражатель
          </button>
        </section>
      )}

      {inProgress.length > 0 && (
        <>
          <h2 className="h2" style={{ marginTop: 8 }}>Активные игры</h2>
          <div className="card-grouped">
            {inProgress.map((g) => (
              <button key={g.id} className="row" onClick={() => nav(`/game/${g.id}`)}>
                <div className="row-title">
                  {g.isBotGame ? "Бот" : "Игрок"} ·{" "}
                  {g.settings.timeControl === 0 ? "∞" : `${g.settings.timeControl / 60}м`}
                </div>
                <div className="row-value">{g.status === "WAITING" ? "Ожидание..." : "Игра идёт"} ›</div>
              </button>
            ))}
          </div>
        </>
      )}

      {publicSessions.length > 0 && (
        <>
          <h2 className="h2" style={{ marginTop: 8 }}>Открытые сессии</h2>
          <div className="card-grouped">
            {publicSessions.map((g) => (
              <button key={g.id} className="row" onClick={() => nav(`/join/${g.id}`)}>
                <div className="row-title">
                  Игрок {g.playerWhite?.firstName || g.playerBlack?.firstName} ·{" "}
                  {g.settings.timeControl === 0 ? "∞" : `${g.settings.timeControl / 60}м`}
                </div>
                <div className="row-value">Присоединиться ›</div>
              </button>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

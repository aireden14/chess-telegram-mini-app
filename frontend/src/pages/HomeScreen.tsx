import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { useThemeStore, ThemeType } from "../store/theme";
import { GameStateDTO } from "../types";

const THEMES: { label: string; value: ThemeType; icon: string }[] = [
  { label: "Dark", value: "dark", icon: "🖤" },
  { label: "Light", value: "light", icon: "🤍" },
  { label: "Color", value: "colorful", icon: "🌈" },
  { label: "Ocean", value: "blue", icon: "🌊" },
];

export function HomeScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
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

      <div className="menu-group" style={{ display: "flex", gap: 8, padding: 8 }}>
        <input
          type="text"
          className="input-text"
          placeholder="Код игры"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid var(--glass-border)",
            background: "var(--glass-bg)",
            color: "var(--apple-text)",
            fontSize: "16px",
            outline: "none"
          }}
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

      <div className="menu-group">
        <h2 className="h2">🎨 Тема оформления</h2>
        <div className="segment">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={`seg-item${theme === t.value ? " active" : ""}`}
              onClick={() => setTheme(t.value)}
            >
              {t.icon} <span style={{ marginLeft: 4 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {inProgress.length > 0 && (
        <>
          <h2 className="h2" style={{ marginTop: 8 }}>Активные игры</h2>
          <div className="card-grouped">
            {inProgress.map((g) => (
              <button key={g.id} className="row" onClick={() => nav(`/game/${g.id}`)}>
                <div className="row-title">
                  {g.isBotGame ? "🤖 Бот" : "👤 Игрок"} ·{" "}
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
                  👤 Игрок {g.playerWhite?.firstName || g.playerBlack?.firstName} ·{" "}
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

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { triggerHaptic } from "../hooks/useTelegram";

type GameEntry = {
  key: string;
  icon: string;
  title: string;
  sub: string;
  to: string;
};

const GAMES: GameEntry[] = [
  { key: "chess", icon: "♞", title: "Шахматы", sub: "Мультиплеер · бот · рейтинг", to: "/chess" },
  { key: "sudoku", icon: "▦", title: "Судоку", sub: "Ежедневная · заметки · подсказки", to: "/sudoku" },
  { key: "force", icon: "✦", title: "Отражатель", sub: "Аркада · клинок · апгрейды", to: "/force-deflector" },
];

export function GamePickerScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();

  const open = (to: string) => {
    triggerHaptic("light");
    nav(to);
  };

  return (
    <div className="app-screen picker-screen">
      <div className="picker-topbar">
        <button className="picker-id" onClick={() => open("/profile")}>
          <span className="avatar avatar-sm">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" />
            ) : (
              (user?.firstName?.slice(0, 1).toUpperCase() ?? "♟")
            )}
          </span>
          <span className="picker-id-copy">
            <strong>{user?.firstName ?? "Игрок"}</strong>
            <em>Рейтинг {user?.rating ?? "—"}</em>
          </span>
        </button>
        <button
          className="theme-toggle"
          onClick={() => {
            triggerHaptic("light");
            setTheme(theme === "dark" ? "light" : "dark");
          }}
          aria-label="Переключить тему"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>

      <header className="picker-hero">
        <h1 className="h1">Выбери игру</h1>
        <p className="muted">Три режима — одно приложение</p>
      </header>

      <div className="picker-games">
        {GAMES.map((g) => (
          <button key={g.key} className="picker-game" onClick={() => open(g.to)}>
            <span className="picker-game-icon">{g.icon}</span>
            <span className="picker-game-copy">
              <strong>{g.title}</strong>
              <em>{g.sub}</em>
            </span>
            <span className="picker-game-go" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

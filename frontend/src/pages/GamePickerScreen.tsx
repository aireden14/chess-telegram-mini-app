import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { useVisualModeStore } from "../store/visualMode";
import { triggerHaptic } from "../hooks/useTelegram";
import { hasUnseenWhatsNew } from "../data/changelog";
import { type GameIconKind } from "../components/GameHubLogo";

type AppEntry = {
  key: GameIconKind | "card";
  icon: string;
  title: string;
  to: string;
};

// iOS-style app grid: каждая игра — иконка-плитка с подписью, как ярлык на домашнем экране iPhone.
const APPS: AppEntry[] = [
  { key: "chess", icon: "♟️", title: "Шахматы", to: "/chess" },
  { key: "checkers", icon: "🔴", title: "Шашки", to: "/checkers" },
  { key: "catan", icon: "🏝️", title: "Катан", to: "/catan" },
  { key: "sudoku", icon: "🔢", title: "Судоку", to: "/sudoku" },
  { key: "force", icon: "🛡️", title: "Отражатель", to: "/force-deflector" },
  { key: "card", icon: "🔮", title: "Карта дня", to: "/card-of-day" },
];

export function GamePickerScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const { mode: visualMode, toggleMode } = useVisualModeStore();
  const reduce = useReducedMotion();
  const beta = visualMode === "beta";

  const open = (to: string) => {
    triggerHaptic("light");
    nav(to);
  };

  return (
    <div className="app-screen home-screen">
      <header className="home-head">
        <p className="home-greet">Привет, {user?.firstName ?? "Игрок"} 👋</p>
        <div className="brand">
          <span className="brand-die" aria-hidden>
            <svg viewBox="0 0 100 100" width="36" height="36" role="img" aria-label="GamePass">
              <rect x="6" y="6" width="88" height="88" rx="22" fill="#fff" stroke="rgba(0,0,0,.12)" strokeWidth="3" />
              <circle cx="30" cy="30" r="8" fill="#1c1c1e" />
              <circle cx="70" cy="30" r="8" fill="#1c1c1e" />
              <circle cx="50" cy="50" r="8" fill="#1c1c1e" />
              <circle cx="30" cy="70" r="8" fill="#1c1c1e" />
              <circle cx="70" cy="70" r="8" fill="#1c1c1e" />
            </svg>
          </span>
          <h1 className="home-title brand-title">GamePass</h1>
        </div>
      </header>

      <div className="home-grid">
        {APPS.map((a, i) => (
          <motion.button
            key={a.key}
            className="home-app"
            onClick={() => open(a.to)}
            style={{ animationDelay: `${0.03 + i * 0.05}s` }}
            whileTap={reduce ? undefined : { scale: 0.9 }}
          >
            <span className={`home-app-icon home-app-icon--${a.key}`}>
              <span className="home-app-emoji" aria-hidden>{a.icon}</span>
            </span>
            <span className="home-app-label">{a.title}</span>
          </motion.button>
        ))}
      </div>

      {/* Док снизу: профиль («домой» / аккаунт) слева, переключатели справа. Как dock на iPhone. */}
      <nav className="home-dock" aria-label="Профиль и настройки">
        <button className="home-dock-profile" onClick={() => open("/profile")}>
          <span className="avatar avatar-sm">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" />
            ) : (
              (user?.firstName?.slice(0, 1).toUpperCase() ?? "♟")
            )}
          </span>
          <span className="home-dock-copy">
            <strong>{user?.firstName ?? "Игрок"}</strong>
            <em>Рейтинг {user?.rating ?? "—"}</em>
          </span>
        </button>

        <div className="home-dock-actions">
          <button
            className="home-dock-btn whats"
            onClick={() => open("/whats-new")}
            aria-label="Что нового"
          >
            ✨
            {hasUnseenWhatsNew() && <span className="home-dock-dot" aria-hidden />}
          </button>
          <button
            className={`home-dock-btn${beta ? " active" : ""}`}
            onClick={() => {
              triggerHaptic("light");
              toggleMode();
            }}
            aria-pressed={beta}
            aria-label="Переключить V2 Beta стиль"
          >
            <span className="home-dock-beta">V2</span>
          </button>
          <button
            className="home-dock-btn"
            onClick={() => {
              triggerHaptic("light");
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            aria-label="Переключить тему"
          >
            {theme === "dark" ? "☾" : "☀"}
          </button>
        </div>
      </nav>
    </div>
  );
}

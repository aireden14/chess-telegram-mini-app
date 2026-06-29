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
  key: GameIconKind | "card" | "catan_beta";
  icon: string;
  title: string;
  to: string;
};

// iOS-style app grid: каждая игра — иконка-плитка с подписью, как ярлык на домашнем экране iPhone.
  { key: "chess", icon: "♟️", title: "Шахматы", to: "/chess" },
  { key: "checkers", icon: "🔴", title: "Шашки", to: "/checkers" },
  { key: "catan", icon: "🏝️", title: "Катан", to: "/catan" },
  { key: "catan_beta", icon: "catan-beta.png", title: "Катан Бета тест", to: "/catan-beta" },
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
        <h1 className="home-title">Игры</h1>
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
              {a.icon.includes(".png") || a.icon.includes(".jpg") ? (
                <img src={`/images/${a.icon}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "22.5%" }} />
              ) : (
                <span className="home-app-emoji" aria-hidden>{a.icon}</span>
              )}
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

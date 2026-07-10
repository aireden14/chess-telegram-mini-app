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
  key: GameIconKind | "card" | "catan_beta" | "icebreakers";
  icon: string;
  title: string;
  to: string;
  grad: [string, string];        // цвет иконки-плитки
  badge?: "NEW" | "BETA";        // угловой бейдж
};

type Section = { title: string; apps: AppEntry[] };

// iOS-style: игры сгруппированы по секциям, каждая — иконка-плитка с подписью.
const SECTIONS: Section[] = [
  {
    title: "Настолки",
    apps: [
      { key: "catan", icon: "/game-icons/256/catan.png", title: "Катан", to: "/catan", grad: ["#00b8a9", "#ffb23f"] },
      { key: "card", icon: "/game-icons/256/catan-fable.png", title: "Катан Fable", to: "/catan-fable", grad: ["#7d4cff", "#c35cff"], badge: "NEW" },
      { key: "card", icon: "/game-icons/256/fable-factory.png", title: "Fable Factory", to: "/fable-factory", grad: ["#ffb000", "#00d6ff"], badge: "NEW" },
      { key: "card", icon: "/game-icons/256/ticket-to-sonnet.png", title: "Ticket to Sonnet", to: "/ticket-to-sonnet", grad: ["#e21b4d", "#3debff"], badge: "NEW" },
      { key: "card", icon: "/game-icons/256/carcassonne.png", title: "Каркассон", to: "/carcassonne", grad: ["#00a86b", "#ffd15c"], badge: "NEW" },
      { key: "card", icon: "/game-icons/256/monopoly-hp.png", title: "Монополия", to: "/monopoly-hp", grad: ["#6a35ff", "#41ffc5"], badge: "NEW" },
      { key: "card", icon: "/game-icons/256/bunker.png", title: "Бункер", to: "/bunker", grad: ["#ff7a1a", "#b7ff2a"], badge: "NEW" },
    ],
  },
  {
    title: "Классика",
    apps: [
      { key: "chess", icon: "/game-icons/256/chess.png", title: "Шахматы", to: "/chess", grad: ["#315cff", "#52e8ff"] },
      { key: "checkers", icon: "/game-icons/256/checkers.png", title: "Шашки", to: "/checkers", grad: ["#ff3b5c", "#ffc24a"] },
    ],
  },
  {
    title: "Для пары",
    apps: [
      { key: "icebreakers", icon: "/game-icons/256/icebreakers.png", title: "Знакомства", to: "/icebreakers", grad: ["#ff4fb8", "#7ff2ff"], badge: "NEW" },
      { key: "card", icon: "/game-icons/256/card-of-day.png", title: "Карта дня", to: "/card-of-day", grad: ["#9a4dff", "#6ef8ff"] },
    ],
  },
  {
    title: "Соло",
    apps: [
      { key: "sudoku", icon: "/game-icons/256/sudoku.png", title: "Судоку", to: "/sudoku", grad: ["#35e8b3", "#236bff"] },
      { key: "card", icon: "🌀", title: "Overquest", to: "/overquest", grad: ["#805dff", "#43dfe8"], badge: "NEW" },
      { key: "card", icon: "🕵️", title: "Гарридоку", to: "/garridoku", grad: ["#c9a24b", "#3a2c5e"], badge: "NEW" },
      { key: "card", icon: "🚪", title: "Мачкин", to: "/machkin", grad: ["#d4a13c", "#c8503f"], badge: "NEW" },
      { key: "force", icon: "/game-icons/256/force-deflector.png", title: "Отражатель", to: "/force-deflector", grad: ["#7b61ff", "#2ea8ff"] },
      { key: "force", icon: "/game-icons/256/neurogrid.png", title: "Neurogrid", to: "/neurogrid", grad: ["#00e5ff", "#ff39d6"], badge: "NEW" },
      { key: "force", icon: "/game-icons/256/webgrid.png", title: "WebGrid", to: "/webgrid", grad: ["#22ff88", "#efff4a"], badge: "NEW" },
      { key: "catan_beta", icon: "/game-icons/256/reader.png", title: "Читалка", to: "/reader", grad: ["#1c7cff", "#ff6a7a"] },
    ],
  },
  {
    title: "Инструменты",
    apps: [
      { key: "catan_beta", icon: "/game-icons/256/pdf-studio.png", title: "PDF Studio", to: "/pdf-studio", grad: ["#f43a3a", "#2ea8ff"], badge: "NEW" },
    ],
  },
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

      <div className="home-sections">
        {SECTIONS.map((section) => (
          <section className="home-section" key={section.title}>
            <h2 className="home-section-title">{section.title}</h2>
            <div className="home-grid">
              {section.apps.map((a, i) => {
                const isImg = a.icon.includes(".png") || a.icon.includes(".jpg");
                const iconSrc = a.icon.startsWith("/") ? a.icon : `/images/${a.icon}`;
                return (
                  <motion.button
                    key={a.title}
                    className="home-app"
                    onClick={() => open(a.to)}
                    style={{ animationDelay: `${0.03 + i * 0.04}s` }}
                    whileTap={reduce ? undefined : { scale: 0.9 }}
                  >
                    <span
                      className="home-app-icon"
                      style={{ background: `linear-gradient(150deg, ${a.grad[0]}, ${a.grad[1]})` }}
                    >
                      {isImg ? (
                        <img src={iconSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "22.5%" }} />
                      ) : (
                        <span className="home-app-emoji" aria-hidden>{a.icon}</span>
                      )}
                      {a.badge && <span className={`home-app-badge home-app-badge--${a.badge.toLowerCase()}`}>{a.badge}</span>}
                    </span>
                    <span className="home-app-label">{a.title}</span>
                  </motion.button>
                );
              })}
            </div>
          </section>
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

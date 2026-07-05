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
  key: GameIconKind | "card" | "catan_beta" | "hexforge" | "icebreakers";
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
      { key: "catan", icon: "🏝️", title: "Катан", to: "/catan", grad: ["#f3b04b", "#e8762b"] },
      { key: "hexforge", icon: "🪄", title: "Катан Fable", to: "/catan-fable", grad: ["#8a5bd0", "#5b3a9e"], badge: "NEW" },
      { key: "hexforge", icon: "🏭", title: "Fable Factory", to: "/fable-factory", grad: ["#d0a75b", "#9e6f2a"], badge: "NEW" },
      { key: "hexforge", icon: "🚂", title: "Ticket to Sonnet", to: "/ticket-to-sonnet", grad: ["#c0392b", "#8e2418"], badge: "NEW" },
      { key: "hexforge", icon: "⚙️", title: "HexForge", to: "/hexforge", grad: ["#2f3f46", "#4dbb72"], badge: "BETA" },
    ],
  },
  {
    title: "Классика",
    apps: [
      { key: "chess", icon: "♟️", title: "Шахматы", to: "/chess", grad: ["#5b7bff", "#3a5adf"] },
      { key: "checkers", icon: "🔴", title: "Шашки", to: "/checkers", grad: ["#ff8a5b", "#ff5e7d"] },
    ],
  },
  {
    title: "Для пары",
    apps: [
      { key: "icebreakers", icon: "💞", title: "Знакомства", to: "/icebreakers", grad: ["#ff8ec0", "#c98cff"], badge: "NEW" },
      { key: "card", icon: "🔮", title: "Карта дня", to: "/card-of-day", grad: ["#a86bff", "#6b3bff"] },
    ],
  },
  {
    title: "Соло",
    apps: [
      { key: "sudoku", icon: "🔢", title: "Судоку", to: "/sudoku", grad: ["#4ad0a8", "#2aa6c9"] },
      { key: "force", icon: "🛡️", title: "Отражатель", to: "/force-deflector", grad: ["#8b6cff", "#5b7bff"] },
      { key: "force", icon: "🧠", title: "Neurogrid", to: "/neurogrid", grad: ["#7ff2ff", "#5b8dff"], badge: "NEW" },
      { key: "catan_beta", icon: "📚", title: "Читалка", to: "/reader", grad: ["#d7a86b", "#a9743e"] },
    ],
  },
  {
    title: "Инструменты",
    apps: [
      { key: "catan_beta", icon: "📄", title: "PDF Studio", to: "/pdf-studio", grad: ["#4c8dff", "#2a5fd0"], badge: "NEW" },
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
                        <img src={`/images/${a.icon}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "22.5%" }} />
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

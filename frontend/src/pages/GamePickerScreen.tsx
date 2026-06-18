import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { triggerHaptic } from "../hooks/useTelegram";
import { hasUnseenWhatsNew } from "../data/changelog";

type GameEntry = {
  key: string;
  icon: string;
  title: string;
  sub: string;
  to: string;
};

const GAMES: GameEntry[] = [
  { key: "chess", icon: "♞", title: "Шахматы", sub: "Мультиплеер · бот · рейтинг", to: "/chess" },
  { key: "checkers", icon: "⛀", title: "Шашки", sub: "Вдвоём на одном устройстве", to: "/checkers" },
  { key: "catan", icon: "⬡", title: "Катан", sub: "Колонизация · ресурсы · боты", to: "/catan" },
  { key: "sudoku", icon: "▦", title: "Судоку", sub: "Рейтинг · задания · достижения", to: "/sudoku" },
  { key: "force", icon: "✦", title: "Отражатель", sub: "Аркада · клинок · апгрейды", to: "/force-deflector" },
];

export function GamePickerScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const reduce = useReducedMotion();

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
        <p className="muted">Все игры — в одном приложении</p>
        <button className="whats-new-pill" onClick={() => open("/whats-new")}>
          ✨ Что нового
          {hasUnseenWhatsNew() && <span className="whats-new-dot" aria-hidden />}
        </button>
      </header>

      <div className="picker-games">
        {GAMES.map((g, i) => (
          <motion.button
            key={g.key}
            className="picker-game"
            onClick={() => open(g.to)}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.07, duration: 0.34, ease: [0.2, 0.8, 0.2, 1] }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
          >
            <span className="picker-game-icon">{g.icon}</span>
            <span className="picker-game-copy">
              <strong>{g.title}</strong>
              <em>{g.sub}</em>
            </span>
            <span className="picker-game-go" aria-hidden>
              ›
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

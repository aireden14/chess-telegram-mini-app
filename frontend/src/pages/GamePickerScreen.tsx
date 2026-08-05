import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BorderBeam } from "border-beam";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { useVisualModeStore } from "../store/visualMode";
import { triggerHaptic } from "../hooks/useTelegram";
import { hasUnseenWhatsNew } from "../data/changelog";
import { type GameIconKind } from "../components/GameHubLogo";
import { claimContentMilestone, subscribe, getView, startSession } from "../data/playStats";

type AppEntry = {
  key: GameIconKind | "card" | "catan_beta" | "icebreakers";
  icon: string;
  title: string;
  to: string;
  grad: [string, string];        // цвет иконки-плитки
  badge?: "NEW" | "BETA";        // угловой бейдж
};

// Все игры каталога одним списком — порядок здесь это лишь дефолт для новых игр (счёт 0),
// реальную сортировку на экране задаёт частота запусков (см. sortedApps ниже).
const ALL_APPS: AppEntry[] = [
  { key: "card", icon: "🚙", title: "Холм Драйв", to: "/hill-drive", grad: ["#62c7f2", "#ffb13b"], badge: "NEW" },
  { key: "card", icon: "🍬", title: "SUGAR STRIKE", to: "/sugar-strike", grad: ["#ff9fc4", "#8fd3ff"], badge: "NEW" },
  { key: "card", icon: "🎛️", title: "WAVE FORGE", to: "/beat-maker", grad: ["#24e0ff", "#ff2d96"], badge: "NEW" },
  { key: "card", icon: "🔻", title: "NEON REQUIEM", to: "/neon-requiem", grad: ["#ff174f", "#00f0ff"], badge: "NEW" },
  { key: "card", icon: "⚡", title: "VOLT RUNNER", to: "/volt-runner", grad: ["#ffe600", "#ff5c00"], badge: "NEW" },
  { key: "card", icon: "⚔️", title: "NEON BLADE", to: "/neon-blade", grad: ["#ff2d96", "#00e5ff"], badge: "NEW" },
  { key: "catan", icon: "/game-icons/256/catan.png", title: "Катан", to: "/catan", grad: ["#00b8a9", "#ffb23f"] },
  { key: "card", icon: "/game-icons/256/catan-fable.png", title: "Катан Fable", to: "/catan-fable", grad: ["#7d4cff", "#c35cff"] },
  { key: "card", icon: "/game-icons/256/fable-factory.png", title: "Fable Factory", to: "/fable-factory", grad: ["#ffb000", "#00d6ff"] },
  { key: "card", icon: "🌍", title: "Fable World", to: "/fable-world", grad: ["#69d7a3", "#7557d9"], badge: "BETA" },
  { key: "card", icon: "/game-icons/256/ticket-to-sonnet.png", title: "Ticket to Sonnet", to: "/ticket-to-sonnet", grad: ["#e21b4d", "#3debff"] },
  { key: "card", icon: "/game-icons/256/carcassonne.png", title: "Каркассон", to: "/carcassonne", grad: ["#00a86b", "#ffd15c"] },
  { key: "card", icon: "/game-icons/256/monopoly-hp.png", title: "Монополия", to: "/monopoly-hp", grad: ["#6a35ff", "#41ffc5"] },
  { key: "card", icon: "/game-icons/256/bunker.png", title: "Бункер", to: "/bunker", grad: ["#ff7a1a", "#b7ff2a"] },
  { key: "chess", icon: "/game-icons/256/chess.png", title: "Шахматы", to: "/chess", grad: ["#315cff", "#52e8ff"] },
  { key: "checkers", icon: "/game-icons/256/checkers.png", title: "Шашки", to: "/checkers", grad: ["#ff3b5c", "#ffc24a"] },
  { key: "icebreakers", icon: "/game-icons/256/icebreakers.png", title: "Знакомства", to: "/icebreakers", grad: ["#ff4fb8", "#7ff2ff"] },
  { key: "card", icon: "/game-icons/256/card-of-day.png", title: "Карта дня", to: "/card-of-day", grad: ["#9a4dff", "#6ef8ff"] },
  { key: "sudoku", icon: "/game-icons/256/sudoku.png", title: "Судоку", to: "/sudoku", grad: ["#35e8b3", "#236bff"] },
  { key: "card", icon: "🌀", title: "Overquest", to: "/overquest", grad: ["#805dff", "#43dfe8"] },
  { key: "card", icon: "🚪", title: "Мачкин", to: "/machkin", grad: ["#d4a13c", "#c8503f"] },
  { key: "card", icon: "🕵️", title: "Гарридоку", to: "/garridoku", grad: ["#c9a24b", "#3a2c5e"] },
  { key: "card", icon: "🔎", title: "Мурдоку", to: "/murdoku", grad: ["#8b1e3f", "#1f2a44"], badge: "NEW" },
  { key: "force", icon: "/game-icons/256/force-deflector.png", title: "Отражатель", to: "/force-deflector", grad: ["#7b61ff", "#2ea8ff"] },
  { key: "force", icon: "/game-icons/256/neurogrid.png", title: "Neurogrid", to: "/neurogrid", grad: ["#00e5ff", "#ff39d6"] },
  { key: "force", icon: "/game-icons/256/webgrid.png", title: "WebGrid", to: "/webgrid", grad: ["#22ff88", "#efff4a"] },
  { key: "card", icon: "🛸", title: "Nebula Drift", to: "/nebula-drift", grad: ["#00e5ff", "#ff39d6"] },
  { key: "card", icon: "⚔️", title: "Jedi Survivors", to: "/jedi-survivors", grad: ["#3fd6ff", "#00ff9c"], badge: "NEW" },
  { key: "catan_beta", icon: "/game-icons/256/reader.png", title: "Читалка", to: "/reader", grad: ["#1c7cff", "#ff6a7a"] },
  { key: "catan_beta", icon: "/game-icons/256/pdf-studio.png", title: "PDF Studio", to: "/pdf-studio", grad: ["#f43a3a", "#2ea8ff"] },
];

const APP_BY_ROUTE = new Map(ALL_APPS.map((app) => [app.to, app]));

function appFor(to: string): AppEntry | undefined {
  return APP_BY_ROUTE.get(to);
}

export function GamePickerScreen() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const { mode: visualMode, toggleMode } = useVisualModeStore();
  const reduce = useReducedMotion();
  const beta = visualMode === "beta";

  const [query, setQuery] = useState("");
  const [milestone, setMilestone] = useState<number | null>(null);

  // Статистика хаба (на текущий аккаунт): сколько раз запускали каждую игру.
  const stats = useSyncExternalStore(subscribe, getView, getView);
  const exploredGames = useMemo(
    () => ALL_APPS.filter((app) => (stats.launchCount[app.to] ?? 0) > 0).length,
    [stats],
  );
  const contentProgress = Math.round((exploredGames / ALL_APPS.length) * 100);
  const remainingProgress = Math.max(0, 100 - contentProgress);

  useEffect(() => {
    const reached = claimContentMilestone(contentProgress);
    if (!reached) return;

    setMilestone(reached);
    triggerHaptic("success");
    const timer = window.setTimeout(() => setMilestone(null), 5500);
    return () => window.clearTimeout(timer);
  }, [contentProgress]);

  // Один плоский список: чаще всего запускаемые — сверху, при равном счёте — недавно запущенные
  // выше, никогда не запускавшиеся остаются в конце в порядке каталога.
  const sortedApps = useMemo(() => {
    return [...ALL_APPS].sort((a, b) => {
      // Последний релиз должен быть виден на первом экране GamePass сразу.
      if (a.to === "/hill-drive") return -1;
      if (b.to === "/hill-drive") return 1;
      const countDiff = (stats.launchCount[b.to] ?? 0) - (stats.launchCount[a.to] ?? 0);
      if (countDiff !== 0) return countDiff;
      return (stats.lastPlayedAt[b.to] ?? 0) - (stats.lastPlayedAt[a.to] ?? 0);
    });
  }, [stats]);

  const visibleApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedApps;
    return sortedApps.filter((a) => a.title.toLowerCase().includes(q));
  }, [sortedApps, query]);

  const open = (to: string) => {
    if (appFor(to)) startSession(to); // засечь заход — используется для сортировки по частоте
    triggerHaptic("light");
    nav(to);
  };

  const renderAppButton = (a: AppEntry, i: number) => {
    const isImg = a.icon.includes(".png") || a.icon.includes(".jpg");
    const iconSrc = a.icon.startsWith("/") ? a.icon : `/images/${a.icon}`;
    const isFeatured = a.to === "/hill-drive";
    const icon = (
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
    );

    return (
      <motion.button
        key={a.to}
        className="home-app"
        onClick={() => open(a.to)}
        style={{ animationDelay: `${0.03 + i * 0.04}s` }}
        whileTap={reduce ? undefined : { scale: 0.9 }}
      >
        {isFeatured ? (
          <BorderBeam
            size="sm"
            colorVariant="ocean"
            theme={theme}
            strength={0.82}
            duration={2.7}
            active={!reduce}
            borderRadius={21}
            style={{ width: 72, height: 72, overflow: "visible" }}
          >
            {icon}
          </BorderBeam>
        ) : icon}
        <span className="home-app-label">{a.title}</span>
      </motion.button>
    );
  };

  return (
    <div className="app-screen home-screen">
      <header className="home-head">
        <p className="home-greet">Привет, {user?.firstName ?? "Игрок"} 👋</p>
        <h1 className="home-title">Игры</h1>
      </header>

      {milestone !== null && (
        <div className="home-progress-toast" role="status">
          <span aria-hidden>🏆</span>
          <p>
            <strong>Так держать!</strong> Ты выполнил {milestone}% контента. До финиша ещё {100 - milestone}%.
          </p>
        </div>
      )}

      <div className="home-search">
        <span className="home-search-icon" aria-hidden>⌕</span>
        <input
          type="search"
          inputMode="search"
          placeholder="Поиск игр"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="home-search-input"
          aria-label="Поиск игр"
        />
      </div>

      <div className="home-sections">
        {visibleApps.length > 0 ? (
          <div className="home-grid">
            {visibleApps.map((app, i) => renderAppButton(app, i))}
          </div>
        ) : (
          <p className="home-search-empty">Ничего не нашлось</p>
        )}
      </div>

      <section className="home-content-progress" aria-label="Шкала исследования контента">
        <div className="home-content-progress-head">
          <span className="home-content-progress-kicker">ШКАЛА 3 · ИССЛЕДОВАНИЕ</span>
          <strong>{contentProgress}%</strong>
        </div>
        <div
          className="home-content-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={contentProgress}
          aria-label={`Исследовано ${contentProgress}% контента`}
        >
          <span style={{ width: `${contentProgress}%` }} />
        </div>
        <p>
          Открыто {exploredGames} из {ALL_APPS.length} игр · до финиша {remainingProgress}%
        </p>
      </section>

      <footer className="home-powered">
        Powered by <a href="https://t.me/Denrech" target="_blank" rel="noopener noreferrer">@Denrech</a>
      </footer>

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

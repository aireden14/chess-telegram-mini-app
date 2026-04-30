import React, { useEffect, useState } from "react";
import { TopNav } from "../components/TopNav";
import { api } from "../api/client";
import { MeUser } from "../types";
import { useThemeStore, ThemeType } from "../store/theme";

const THEMES: { label: string; value: ThemeType; icon: string }[] = [
  { label: "Apple Dark", value: "dark", icon: "🖤" },
  { label: "Apple Light", value: "light", icon: "🤍" },
  { label: "Colorful", value: "colorful", icon: "🌈" },
  { label: "Liquid Ocean", value: "blue", icon: "🌊" },
];

export function ProfileScreen() {
  const [me, setMe] = useState<MeUser | null>(null);
  const { theme, setTheme } = useThemeStore();
  useEffect(() => {
    api.get<MeUser>("/users/me").then((r) => setMe(r.data));
  }, []);
  return (
    <div className="app-screen">
      <TopNav title="Профиль" backTo="/" />
      {!me ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <div
              className="avatar"
              style={{ width: 88, height: 88, fontSize: 36, margin: "0 auto 12px" }}
            >
              {me.photoUrl ? (
                <img src={me.photoUrl} alt="" />
              ) : (
                me.firstName.slice(0, 1).toUpperCase()
              )}
            </div>
            <h2 className="h2">
              {me.firstName} {me.lastName ?? ""}
            </h2>
            {me.username && <p className="muted" style={{ margin: "4px 0" }}>@{me.username}</p>}
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
              {me.rating} <span style={{ fontSize: 16, color: "var(--label-tertiary)" }}>Elo</span>
            </div>
          </div>
          <div className="card-grouped">
            <div className="row">
              <div className="row-title">🎮 Всего партий</div>
              <div className="row-value">{me.totalGames}</div>
            </div>
            <div className="row">
              <div className="row-title">🏆 Побед</div>
              <div className="row-value">{me.wins}</div>
            </div>
            <div className="row">
              <div className="row-title">💀 Поражений</div>
              <div className="row-value">{me.losses}</div>
            </div>
            <div className="row">
              <div className="row-title">🤝 Ничьих</div>
              <div className="row-value">{me.draws}</div>
            </div>
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
        </>
      )}
    </div>
  );
}

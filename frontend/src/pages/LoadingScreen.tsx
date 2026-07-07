import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useSocketStore } from "../store/socket";
import { getTelegram, tgReady, getStartParam } from "../hooks/useTelegram";
import { wakeBackend } from "../api/client";

export function LoadingScreen() {
  const nav = useNavigate();
  const { login, isLoading, error, token } = useAuthStore();
  const { connect } = useSocketStore();
  const [minElapsed, setMinElapsed] = React.useState(false);

  useEffect(() => {
    tgReady();
    void wakeBackend();
    const tg = getTelegram();
    const initData = tg?.initData || "";
    const tgUser = tg?.initDataUnsafe?.user;

    login(initData, tgUser).catch(() => {});
    // Always show the branded GamePass splash for at least a moment on launch.
    const t = setTimeout(() => setMinElapsed(true), 1200);
    return () => clearTimeout(t);
  }, [login]);

  useEffect(() => {
    if (token && minElapsed) {
      connect(token);
      const start = getStartParam();
      if (start) {
        if (start.startsWith("checkers_")) {
          nav(`/checkers?join=${encodeURIComponent(start.replace(/^checkers_/, ""))}`, { replace: true });
        } else {
          nav(`/join/${start}`, { replace: true });
        }
      } else {
        nav("/", { replace: true });
      }
    }
  }, [token, minElapsed, connect, nav]);

  return (
    <div className="loading-page">
      <div className="loading-logo-container">
        <div className="logo-board-square">
          <img className="loading-brand-icon" src="/gamepass-brand/gamepass-splash.png" alt="" />
        </div>
        <div className="loading-text-group">
          <h2 className="loading-main-text">GamePass</h2>
          <div className="loading-sub-text">твои игры в одном месте</div>
        </div>
        {isLoading && (
          <div className="loading-spinner-wrap">
            <div className="spinner" />
          </div>
        )}
        {error && (
          <div className="muted" style={{ color: "var(--red)", marginTop: 24 }}>
            Ошибка: {error}
          </div>
        )}
      </div>
    </div>
  );
}

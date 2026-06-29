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

  useEffect(() => {
    tgReady();
    void wakeBackend();
    const tg = getTelegram();
    const initData = tg?.initData || "";
    const tgUser = tg?.initDataUnsafe?.user;

    login(initData, tgUser).catch(() => {});
  }, [login]);

  useEffect(() => {
    if (token) {
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
  }, [token, connect, nav]);

  return (
    <div className="loading-page">
      <div className="loading-logo-container">
        <div className="logo-board-square">
          <svg className="logo-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gpDieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--piece-light-1)", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "var(--piece-light-2)", stopOpacity: 1 }} />
              </linearGradient>
              <filter id="gpDieGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g filter="url(#gpDieGlow)">
              <rect x="16" y="16" width="68" height="68" rx="17" fill="url(#gpDieGradient)" />
              <circle cx="35" cy="35" r="6.2" fill="#16181d" />
              <circle cx="65" cy="35" r="6.2" fill="#16181d" />
              <circle cx="50" cy="50" r="6.2" fill="#16181d" />
              <circle cx="35" cy="65" r="6.2" fill="#16181d" />
              <circle cx="65" cy="65" r="6.2" fill="#16181d" />
            </g>
          </svg>
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

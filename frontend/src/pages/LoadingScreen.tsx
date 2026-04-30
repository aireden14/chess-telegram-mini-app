import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useSocketStore } from "../store/socket";
import { getTelegram, tgReady, getStartParam } from "../hooks/useTelegram";

export function LoadingScreen() {
  const nav = useNavigate();
  const { login, isLoading, error, token } = useAuthStore();
  const { connect } = useSocketStore();

  useEffect(() => {
    tgReady();
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
        nav(`/join/${start}`, { replace: true });
      } else {
        nav("/", { replace: true });
      }
    }
  }, [token, connect, nav]);

  return (
    <div className="center-screen">
      <div style={{ fontSize: 64 }}>♟</div>
      <h1 className="h1" style={{ margin: 0 }}>Шахматы</h1>
      {isLoading && <div className="spinner" />}
      {error && (
        <div className="muted" style={{ color: "var(--red)" }}>
          Ошибка: {error}
        </div>
      )}
    </div>
  );
}

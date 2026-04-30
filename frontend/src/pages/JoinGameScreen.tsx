import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { TopNav } from "../components/TopNav";
import { GameStateDTO } from "../types";

export function JoinGameScreen() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const [game, setGame] = useState<GameStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    api
      .get<GameStateDTO>(`/games/${gameId}`)
      .then((r) => setGame(r.data))
      .catch((e) => setError(e?.response?.data?.error || "Не удалось загрузить игру"));
  }, [gameId]);

  async function join() {
    if (!gameId) return;
    setBusy(true);
    try {
      await api.post(`/games/${gameId}/join`);
      nav(`/game/${gameId}`, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Ошибка вступления");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-screen">
      <TopNav title="Приглашение в игру" backTo="/" />
      {error && <div className="card" style={{ color: "var(--red)" }}>{error}</div>}
      {!game && !error && <div className="spinner" />}
      {game && (
        <>
          <div className="card">
            <h2 className="h2" style={{ marginBottom: 8 }}>♟ Игра в шахматы</h2>
            <p className="muted" style={{ margin: 0 }}>
              {game.settings.timeControl === 0
                ? "Без лимита времени"
                : `${game.settings.timeControl / 60} мин + ${game.settings.increment} сек`}
              {" · "}
              {game.settings.colorChoice === "random"
                ? "случайный цвет"
                : game.settings.colorChoice === "white"
                ? "соперник играет белыми"
                : "соперник играет чёрными"}
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-primary btn-block"
            disabled={busy || game.status !== "WAITING"}
            onClick={join}
          >
            {game.status !== "WAITING" ? "Игра уже идёт" : busy ? "Подключаемся..." : "Вступить в игру"}
          </button>
        </>
      )}
    </div>
  );
}

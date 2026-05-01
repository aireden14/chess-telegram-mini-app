import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { TopNav } from "../components/TopNav";

const TIMES: Array<{ label: string; value: number }> = [
  { label: "1 мин", value: 60 },
  { label: "3 мин", value: 180 },
  { label: "5 мин", value: 300 },
  { label: "10 мин", value: 600 },
  { label: "15 мин", value: 900 },
  { label: "30 мин", value: 1800 },
  { label: "∞", value: 0 },
];
const INCS = [0, 1, 2, 3, 5, 10];

export function CreateGameScreen() {
  const [params] = useSearchParams();
  const isBot = params.get("bot") === "1";
  const nav = useNavigate();
  const [time, setTime] = useState(600);
  const [inc, setInc] = useState(0);
  const [color, setColor] = useState<"random" | "white" | "black">("random");
  const [diff, setDiff] = useState<"easy" | "medium">("medium");
  const [customCode, setCustomCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await api.post("/games/create", {
        timeControl: time,
        increment: inc,
        colorChoice: color,
        vsBot: isBot,
        botDifficulty: diff,
        customCode: customCode.trim() || undefined,
      });
      nav(`/game/${res.data.gameId}`, { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-screen">
      <TopNav title={isBot ? "Игра с ботом" : "Новая игра"} backTo="/" />

      <div className="menu-group">
        <h2 className="h2">⏱ Контроль времени</h2>
        <div className="chips">
          {TIMES.map((t) => (
            <button
              key={t.value}
              className={`chip${time === t.value ? " active" : ""}`}
              onClick={() => setTime(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-group">
        <h2 className="h2">➕ Инкремент</h2>
        <div className="chips">
          {INCS.map((i) => (
            <button
              key={i}
              className={`chip${inc === i ? " active" : ""}`}
              onClick={() => setInc(i)}
            >
              {i === 0 ? "0" : `+${i}`}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-group">
        <h2 className="h2">🎨 Ваш цвет</h2>
        <div className="segment">
          {(["white", "random", "black"] as const).map((c) => (
            <button
              key={c}
              className={`seg-item${color === c ? " active" : ""}`}
              onClick={() => setColor(c)}
            >
              {c === "random" ? "🎲" : c === "white" ? "♔" : "♚"}
              <span style={{ marginLeft: 6 }}>
                {c === "random" ? "Случайный" : c === "white" ? "Белые" : "Чёрные"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isBot && (
        <div className="menu-group">
          <h2 className="h2">🤖 Уровень бота</h2>
          <div className="segment">
            {(["easy", "medium"] as const).map((d) => (
              <button
                key={d}
                className={`seg-item${diff === d ? " active" : ""}`}
                onClick={() => setDiff(d)}
              >
                {d === "easy" ? "Лёгкий" : "Средний"}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            Нерейтинговая партия — Elo не меняется.
          </p>
        </div>
      )}

      {!isBot && (
        <div className="menu-group">
          <h2 className="h2">🔑 Код игры (по желанию)</h2>
          <input
            type="text"
            className="input-text"
            placeholder="Оставьте пустым для случайного"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
            maxLength={15}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid var(--glass-border)",
              background: "var(--glass-bg)",
              color: "var(--apple-text)",
              fontSize: "16px",
              outline: "none"
            }}
          />
        </div>
      )}

      <div style={{ flex: 1 }} />
      <button
        className="btn btn-gold btn-block"
        disabled={busy}
        onClick={create}
      >
        {busy ? "Создаём..." : isBot ? "Начать игру" : "Создать и пригласить"}
      </button>
    </div>
  );
}

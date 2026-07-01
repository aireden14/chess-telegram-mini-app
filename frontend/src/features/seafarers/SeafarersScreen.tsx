import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// «Мореходы» — отдельная точка входа в бету catan-v2, стартующая сразу в морском режиме
// (передаём ?mode=seafarers; движок app.js читает параметр). Основную Катану не трогаем.
export function SeafarersScreen() {
  const nav = useNavigate();
  const [key] = useState(0);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data === "hexland:exit") nav("/");
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [nav]);

  return (
    <div className="catan-fs">
      <div className="catan-fs-topbar">
        <button className="catan-fs-back" onClick={() => nav("/")}>
          ← В меню
        </button>
        <div className="catan-fs-title">🌊 Мореходы</div>
      </div>
      <iframe
        key={key}
        src="/games/catan-v2/index.html?mode=seafarers"
        title="Мореходы"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}

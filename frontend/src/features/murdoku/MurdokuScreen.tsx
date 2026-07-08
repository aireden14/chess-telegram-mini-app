import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// Мурдоку: детективная судоку по мотивам Хогвартса — standalone iframe, без backend.
export function MurdokuScreen() {
  const nav = useNavigate();

  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    const onMsg = (e: MessageEvent) => {
      if (e.data === "hexland:exit") nav("/");
    };
    window.addEventListener("message", onMsg);
    return () => {
      document.body.classList.remove("catan-fs-open");
      window.removeEventListener("message", onMsg);
    };
  }, [nav]);

  return (
    // Telegram рисует ✕/⌄ поверх верхней полосы — опускаем игру ниже (правило TG mini app)
    <div className="catan-fs" style={{ paddingTop: "var(--safe-top, 0px)" }}>
      <iframe
        className="catan-fs-frame"
        title="Мурдоку · Тайны Хогвартса"
        src="/games/murdoku/index.html"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./catan.css";

// Катан открывается на весь экран без хаб-хрома. Переключение режимов (База/Мореходы)
// и выход «← В меню игр» — внутри самой игры, в самом низу (листать до них).
// Игра шлёт postMessage('hexland:exit') когда жмут выход — здесь ловим и уходим в меню.
export function CatanScreen() {
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
    <div className="catan-fs">
      <iframe
        className="catan-fs-frame"
        title="Катан"
        src="/games/catan-v2/index.html"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

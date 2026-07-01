import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// Катан открывается на весь экран без хаб-хрома. Переключение режимов (База/Мореходы)
// и выход «← В меню игр» — внутри самой игры, в самом низу (листать до них).
// Игра шлёт postMessage('hexland:exit') когда жмут выход — здесь ловим и уходим в меню.
export function CatanBetaScreen() {
  const nav = useNavigate();
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Слушаем выход в хаб
    const handleMessage = (e: MessageEvent) => {
      if (e.data === "hexland:exit") {
        nav("/");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [nav]);

  return (
    <div className="catan-fs">
      {/* Хаб-полоса сверху */}
      <div className="catan-fs-topbar">
        <button className="catan-fs-back" onClick={() => nav("/")}>
          ← В меню
        </button>
        <div className="catan-fs-title">Катан Бета</div>
      </div>
      
      {/* Iframe на полный экран */}
      <iframe
        key={key}
        src="/games/catan-beta/index.html"
        title="Catan Beta"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// Катан Fable — ремейк Катана с нуля (standalone iframe, без backend).
export function CatanFableScreen() {
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
        title="Катан Fable"
        src="/games/catan-fable/index.html"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

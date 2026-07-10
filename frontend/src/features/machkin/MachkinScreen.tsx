import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// Мачкин — одиночный dungeon-crawler с ботами (standalone iframe, без backend).
export function MachkinScreen() {
  const nav = useNavigate();

  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    const onMsg = (event: MessageEvent) => {
      if (event.data === "hexland:exit") nav("/");
    };
    window.addEventListener("message", onMsg);
    return () => {
      document.body.classList.remove("catan-fs-open");
      window.removeEventListener("message", onMsg);
    };
  }, [nav]);

  return (
    <div className="catan-fs" style={{ paddingTop: "var(--safe-top, 0px)" }}>
      <iframe
        className="catan-fs-frame"
        title="Мачкин"
        src="/games/machkin/index.html"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

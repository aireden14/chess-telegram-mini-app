import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// Ticket to Sonnet — настолка про поезда по Европе (standalone iframe, без backend).
export function TicketToSonnetScreen() {
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
    <div className="catan-fs" style={{ paddingTop: "var(--safe-top, 0px)" }}>
      <iframe
        className="catan-fs-frame"
        title="Ticket to Sonnet"
        src="/games/ticket-to-sonnet/index.html"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

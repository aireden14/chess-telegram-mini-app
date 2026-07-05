import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// PDF Studio — векторный редактор PDF (standalone iframe, без backend).
export function PdfStudioScreen() {
  const nav = useNavigate();

  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    const onMsg = (e: MessageEvent) => {
      if (e.data === "pdfstudio:exit") nav("/");
    };
    window.addEventListener("message", onMsg);
    return () => {
      document.body.classList.remove("catan-fs-open");
      window.removeEventListener("message", onMsg);
    };
  }, [nav]);

  return (
    // Telegram рисует ✕/⌄ поверх верхней полосы — опускаем апп ниже (правило TG mini app)
    <div className="catan-fs" style={{ paddingTop: "var(--safe-top, 0px)" }}>
      <iframe
        className="catan-fs-frame"
        title="PDF Studio"
        src="/apps/pdf-studio/index.html"
        allow="autoplay; fullscreen; clipboard-write"
      />
    </div>
  );
}

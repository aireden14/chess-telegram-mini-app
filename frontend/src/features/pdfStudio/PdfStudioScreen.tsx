import React, { useEffect } from "react";
import "../catan/catan.css";

// PDF Studio — векторный редактор PDF (standalone iframe, без backend).
export function PdfStudioScreen() {
  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    return () => {
      document.body.classList.remove("catan-fs-open");
    };
  }, []);

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

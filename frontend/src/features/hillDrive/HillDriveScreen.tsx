import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../catan/catan.css";

// Холм Драйв — standalone canvas-гонка, встроенная в GamePass без backend.
export function HillDriveScreen() {
  const nav = useNavigate();

  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    const onMsg = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data === "hexland:exit") {
        nav("/");
      }
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
        title="Холм Драйв"
        src="/games/hill-drive/index.html"
        allow="autoplay; fullscreen; gamepad"
      />
    </div>
  );
}

import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";

export function SugarStrikeScreen() {
  const nav = useNavigate();
  const matchActiveRef = useRef(false);

  // Игра сообщает, идёт ли матч (postMessage 'sugar:run'), чтобы «Назад» не выкидывал случайно
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === "sugar:run") matchActiveRef.current = !!d.active;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const handleBack = () => {
    if (
      matchActiveRef.current &&
      !window.confirm("Выйти из боя? Матч не сохранится.")
    ) {
      return;
    }
    nav("/");
  };

  return (
    <div className="app-screen force-deflector-screen neurogrid-screen jedi-survivors-screen">
      <TopNav title="Sugar Strike" onBack={handleBack} />
      <section className="force-deflector-frame-shell" aria-label="Sugar Strike">
        <iframe
          className="force-deflector-frame"
          title="Sugar Strike"
          src="/games/sugar-strike/index.html"
          allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
          allowFullScreen
        />
      </section>
    </div>
  );
}

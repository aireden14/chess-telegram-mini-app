import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";

export function JediSurvivorsScreen() {
  const nav = useNavigate();
  const runActiveRef = useRef(false);

  // Игра сообщает, идёт ли забег (postMessage 'jedi:run'), чтобы «Назад» не выкидывал случайно
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === "jedi:run") runActiveRef.current = !!d.active;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const handleBack = () => {
    if (
      runActiveRef.current &&
      !window.confirm("Выйти из игры? Забег сохранится — сможешь продолжить с этого места.")
    ) {
      return;
    }
    nav("/");
  };

  return (
    <div className="app-screen force-deflector-screen neurogrid-screen jedi-survivors-screen">
      <TopNav title="Jedi Survivors" onBack={handleBack} />
      <section className="force-deflector-frame-shell" aria-label="Jedi Survivors">
        <iframe
          className="force-deflector-frame"
          title="Jedi Survivors"
          src="/games/jedi-survivors/index.html"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
        />
      </section>
    </div>
  );
}

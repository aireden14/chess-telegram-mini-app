import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";

export function DarkDungeonScreen() {
  const nav = useNavigate();
  const runActiveRef = useRef(false);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (
        d === "hexland:exit" ||
        d === "dark-dungeon:exit" ||
        d?.type === "dark-dungeon:exit" ||
        d?.type === "dark:exit"
      ) {
        handleBack();
        return;
      }

      if (d && typeof d === "object") {
        if (
          d.type === "dark:run" ||
          d.type === "dark-dungeon:run" ||
          d.type === "dungeon:run" ||
          d.type === "run:state"
        ) {
          runActiveRef.current = !!d.active;
        }
      }
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const handleBack = () => {
    if (
      runActiveRef.current &&
      !window.confirm(
        "Выйти из подземелья? Текущий забег сохранится — ты сможешь продолжить позже."
      )
    ) {
      return;
    }
    nav("/");
  };

  return (
    <div className="app-screen force-deflector-screen neurogrid-screen jedi-survivors-screen dark-dungeon-screen">
      <TopNav title="Dark Dungeon" onBack={handleBack} />
      <section className="force-deflector-frame-shell" aria-label="Dark Dungeon">
        <iframe
          className="force-deflector-frame"
          title="Dark Dungeon"
          src="/games/dark-dungeon/index.html"
          allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
          allowFullScreen
        />
      </section>
    </div>
  );
}

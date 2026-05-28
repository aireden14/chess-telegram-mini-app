import React from "react";
import { TopNav } from "../../components/TopNav";

export function ForceDeflectorScreen() {
  return (
    <div className="app-screen force-deflector-screen">
      <TopNav title="Отражатель" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="Световой Отражатель">
        <iframe
          className="force-deflector-frame"
          title="Световой Отражатель"
          src="/games/force-deflector/index.html"
          allow="autoplay; fullscreen; gamepad"
        />
      </section>
    </div>
  );
}

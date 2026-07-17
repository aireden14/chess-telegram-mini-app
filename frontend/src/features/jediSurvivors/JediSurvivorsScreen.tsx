import React from "react";
import { TopNav } from "../../components/TopNav";

export function JediSurvivorsScreen() {
  return (
    <div className="app-screen force-deflector-screen neurogrid-screen">
      <TopNav title="Jedi Survivors" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="Jedi Survivors">
        <iframe
          className="force-deflector-frame"
          title="Jedi Survivors"
          src="/games/jedi-survivors/index.html"
          allow="autoplay; fullscreen; gamepad"
        />
      </section>
    </div>
  );
}

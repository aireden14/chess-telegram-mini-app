import React from "react";
import { TopNav } from "../../components/TopNav";

export function NebulaDriftScreen() {
  return (
    <div className="app-screen force-deflector-screen neurogrid-screen">
      <TopNav title="Nebula Drift" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="Nebula Drift">
        <iframe
          className="force-deflector-frame"
          title="Nebula Drift"
          src="/games/nebula-drift/index.html"
          allow="autoplay; fullscreen; gamepad"
        />
      </section>
    </div>
  );
}

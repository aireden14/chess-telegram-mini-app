import React from "react";
import { TopNav } from "../../components/TopNav";

export function NeurogridScreen() {
  return (
    <div className="app-screen force-deflector-screen neurogrid-screen">
      <TopNav title="Neurogrid" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="Neurogrid">
        <iframe
          className="force-deflector-frame"
          title="Neurogrid"
          src="/games/neurogrid/index.html"
          allow="autoplay; fullscreen; gamepad"
        />
      </section>
    </div>
  );
}

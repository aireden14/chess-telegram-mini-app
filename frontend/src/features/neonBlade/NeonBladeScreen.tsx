import React from "react";
import { TopNav } from "../../components/TopNav";

export function NeonBladeScreen() {
  return (
    <div className="app-screen force-deflector-screen neon-blade-screen">
      <TopNav title="NEON BLADE" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="NEON BLADE">
        <iframe
          className="force-deflector-frame"
          title="NEON BLADE"
          src="/games/neon-blade/index.html"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
        />
      </section>
    </div>
  );
}

import React from "react";
import { TopNav } from "../../components/TopNav";

export function NeonRequiemScreen() {
  return (
    <div className="app-screen neon-blade-screen neon-requiem-screen">
      <TopNav title="NEON REQUIEM" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="NEON REQUIEM">
        <iframe
          className="force-deflector-frame"
          title="NEON REQUIEM"
          src="/games/neon-requiem/index.html"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
        />
      </section>
    </div>
  );
}

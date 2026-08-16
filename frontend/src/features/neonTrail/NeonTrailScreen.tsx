import React from "react";
import { TopNav } from "../../components/TopNav";

export function NeonTrailScreen() {
  return (
    <div className="app-screen force-deflector-screen neon-trail-screen">
      <TopNav title="NEON TRAIL" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="NEON TRAIL">
        <iframe
          className="force-deflector-frame"
          title="NEON TRAIL"
          src="/games/neon-trail/index.html"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </section>
    </div>
  );
}

import React from "react";
import { TopNav } from "../../components/TopNav";

export function WebgridScreen() {
  return (
    <div className="app-screen force-deflector-screen neurogrid-screen">
      <TopNav title="WebGrid" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="WebGrid">
        <iframe
          className="force-deflector-frame"
          title="WebGrid"
          src="/games/webgrid/index.html"
          allow="autoplay; fullscreen; gamepad"
        />
      </section>
    </div>
  );
}

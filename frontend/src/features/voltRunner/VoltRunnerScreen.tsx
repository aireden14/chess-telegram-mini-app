import React from "react";
import { TopNav } from "../../components/TopNav";

export function VoltRunnerScreen() {
  return (
    <div className="app-screen force-deflector-screen neon-blade-screen volt-runner-screen">
      <TopNav title="VOLT RUNNER" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="VOLT RUNNER">
        <iframe
          className="force-deflector-frame"
          title="VOLT RUNNER"
          src="/games/volt-runner/index.html"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
        />
      </section>
    </div>
  );
}

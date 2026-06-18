import React from "react";
import { TopNav } from "../../components/TopNav";

export function CatanScreen() {
  return (
    <div className="app-screen force-deflector-screen">
      <TopNav title="Катан" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="Катан">
        <iframe
          className="force-deflector-frame"
          title="Катан"
          src="/games/catan/index.html"
          allow="autoplay; fullscreen"
        />
      </section>
    </div>
  );
}

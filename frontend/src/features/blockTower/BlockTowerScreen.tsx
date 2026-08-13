import React from "react";
import { TopNav } from "../../components/TopNav";

export function BlockTowerScreen() {
  return (
    <div className="app-screen force-deflector-screen block-tower-screen">
      <TopNav title="БЛОК ЗА БЛОКОМ" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="БЛОК ЗА БЛОКОМ">
        <iframe
          className="force-deflector-frame"
          title="БЛОК ЗА БЛОКОМ"
          src="/games/block-tower/index.html"
          allow="autoplay; fullscreen"
        />
      </section>
    </div>
  );
}

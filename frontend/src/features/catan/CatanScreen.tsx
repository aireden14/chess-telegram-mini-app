import React, { useEffect, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import "./catan.css";

const KEY = "catan-version";
type Ver = "new" | "classic";

export function CatanScreen() {
  const [ver, setVer] = useState<Ver>(() => (localStorage.getItem(KEY) as Ver) === "classic" ? "classic" : "new");

  useEffect(() => {
    localStorage.setItem(KEY, ver);
  }, [ver]);

  const src = ver === "classic" ? "/games/catan-classic/index.html" : "/games/catan/index.html";

  const pick = (v: Ver) => {
    if (v === ver) return;
    triggerHaptic("light");
    setVer(v);
  };

  return (
    <div className="app-screen force-deflector-screen">
      <TopNav title="Катан" backTo="/" />
      <div className="catan-ver-bar">
        <button className={`catan-ver-btn${ver === "new" ? " active" : ""}`} onClick={() => pick("new")}>
          Новая
        </button>
        <button className={`catan-ver-btn${ver === "classic" ? " active" : ""}`} onClick={() => pick("classic")}>
          Классика
        </button>
      </div>
      <section className="force-deflector-frame-shell" aria-label="Катан">
        <iframe
          key={ver}
          className="force-deflector-frame"
          title="Катан"
          src={src}
          allow="autoplay; fullscreen"
        />
      </section>
    </div>
  );
}

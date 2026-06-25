import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { triggerHaptic } from "../../hooks/useTelegram";
import "./catan.css";

const KEY = "catan-version";
type Ver = "new" | "classic";

export function CatanScreen() {
  const nav = useNavigate();
  const [ver, setVer] = useState<Ver>(() => (localStorage.getItem(KEY) as Ver) === "classic" ? "classic" : "new");

  useEffect(() => {
    localStorage.setItem(KEY, ver);
  }, [ver]);

  // Полноэкранный режим: пока Катан открыт, скрываем фон/блобы хаба, чтобы игра занимала весь экран.
  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    return () => document.body.classList.remove("catan-fs-open");
  }, []);

  const src = ver === "classic" ? "/games/catan-classic/index.html" : "/games/catan/index.html";

  const pick = (v: Ver) => {
    if (v === ver) return;
    triggerHaptic("light");
    setVer(v);
  };

  return (
    <div className="catan-fs">
      {/* Тонкая полоса хаба: назад в меню + компактный переключатель сборки. Не дублирует игру. */}
      <div className="catan-fs-bar">
        <button
          className="catan-fs-back"
          onClick={() => {
            triggerHaptic("light");
            nav("/");
          }}
          aria-label="В меню"
        >
          ‹
        </button>
        <div className="catan-fs-seg" role="group" aria-label="Версия Катана">
          <button className={ver === "new" ? "on" : ""} onClick={() => pick("new")}>
            Новая
          </button>
          <button className={ver === "classic" ? "on" : ""} onClick={() => pick("classic")}>
            Классика
          </button>
        </div>
      </div>

      <iframe
        key={ver}
        className="catan-fs-frame"
        title="Катан"
        src={src}
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";

export function TopNav({ title, backTo }: { title: string; backTo?: string }) {
  const nav = useNavigate();
  return (
    <div className="topnav">
      <button
        className="back"
        onClick={() => (backTo ? nav(backTo) : nav(-1))}
        aria-label="Назад"
      >
        ← Назад
      </button>
      <div className="title">{title}</div>
    </div>
  );
}

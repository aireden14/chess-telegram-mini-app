import React from "react";
import { useNavigate } from "react-router-dom";

export function TopNav({ title, backTo, onBack }: { title: string; backTo?: string; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="topnav">
      <button
        className="back"
        onClick={() => (onBack ? onBack() : backTo ? nav(backTo) : nav(-1))}
        aria-label="Назад"
      >
        ← Назад
      </button>
      <div className="title">{title}</div>
    </div>
  );
}

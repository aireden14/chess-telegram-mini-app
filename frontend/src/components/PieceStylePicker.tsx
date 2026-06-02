import React, { useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { usePieceStyleStore } from "../store/pieceStyle";
import { MeUser } from "../types";
import { normalizePieceStyle, PIECE_STYLE_OPTIONS, PieceStyleType } from "./pieceStyles";

type PieceStylePickerProps = {
  embedded?: boolean;
};

export function PieceStylePicker({ embedded = false }: PieceStylePickerProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const pieceStyle = usePieceStyleStore((s) => s.pieceStyle);
  const setPieceStyle = usePieceStyleStore((s) => s.setPieceStyle);
  const [savingStyle, setSavingStyle] = useState<PieceStyleType | null>(null);
  const [error, setError] = useState("");

  async function chooseStyle(nextStyle: PieceStyleType) {
    setError("");
    setPieceStyle(nextStyle);
    if (user) setUser({ ...user, pieceStyle: nextStyle });
    setSavingStyle(nextStyle);

    try {
      const res = await api.patch<MeUser>("/users/me/settings", { pieceStyle: nextStyle });
      const savedStyle = normalizePieceStyle(res.data.pieceStyle);
      setPieceStyle(savedStyle);
      setUser({ ...res.data, pieceStyle: savedStyle });
    } catch {
      setError("Стиль выбран здесь. На аккаунт сохранится после обновления сервера.");
    } finally {
      setSavingStyle(null);
    }
  }

  const content = (
    <>
      {embedded ? (
        <h3 className="piece-style-subtitle">Какими фигурами играть</h3>
      ) : (
        <h2 className="h2">Стиль шахматных фигур</h2>
      )}
      <div className="piece-style-grid">
        {PIECE_STYLE_OPTIONS.map((option) => {
          const active = pieceStyle === option.value;
          const saving = savingStyle === option.value;
          return (
            <button
              key={option.value}
              className={`piece-style-card${active ? " active" : ""}`}
              onClick={() => chooseStyle(option.value)}
              disabled={savingStyle !== null}
              type="button"
            >
              <span className="piece-style-icon">{option.icon}</span>
              <span className="piece-style-copy">
                <strong>{option.label}</strong>
                <em>{saving ? "Сохраняю..." : option.description}</em>
              </span>
              <span className="piece-style-preview">{option.preview}</span>
            </button>
          );
        })}
      </div>
      {error && <div className="setting-error">{error}</div>}
    </>
  );

  if (embedded) {
    return <div className="piece-style-embedded">{content}</div>;
  }

  return <div className="menu-group">{content}</div>;
}

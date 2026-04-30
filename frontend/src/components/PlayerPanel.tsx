import React from "react";
import { PublicUser } from "../types";

function formatTimer(seconds: number, infinite: boolean): string {
  if (infinite) return "∞";
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  player: PublicUser | null;
  timer: number;
  active: boolean;
  infinite: boolean;
  online?: boolean;
  isMe?: boolean;
}

export function PlayerPanel({ player, timer, active, infinite, online, isMe }: Props) {
  const name = player ? player.firstName + (isMe ? " (вы)" : "") : "Ожидание...";
  const initial = (player?.firstName || "?").slice(0, 1).toUpperCase();
  const isBot = player?.isBot;
  const warn = !infinite && timer < 30 && active;
  return (
    <div className={`player-panel${active ? " active" : ""}`}>
      <div className="avatar">
        {player?.photoUrl ? (
          <img src={player.photoUrl} alt="" />
        ) : isBot ? (
          <span>🤖</span>
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="player-info">
        <div className="player-name">{name}</div>
        <div className="player-rating">
          {player ? `${player.rating}` : ""}
          {player && !isBot && online !== undefined && (
            <span style={{ marginLeft: 8 }}>
              {online ? "🟢 онлайн" : "⚪ оффлайн"}
            </span>
          )}
        </div>
      </div>
      <div className={`timer${warn ? " warn" : ""}`}>{formatTimer(timer, infinite)}</div>
    </div>
  );
}

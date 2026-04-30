import React, { useEffect, useState } from "react";
import { TopNav } from "../components/TopNav";
import { api } from "../api/client";

interface Row {
  id: number;
  firstName: string;
  username: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}

export function LeaderboardScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    api.get<Row[]>("/users/leaderboard").then((r) => setRows(r.data));
  }, []);
  return (
    <div className="app-screen">
      <TopNav title="🏆 Лидеры" backTo="/" />
      <div className="card-grouped">
        {rows.map((u, i) => (
          <div key={u.id} className="row">
            <div style={{ width: 28, fontWeight: 700 }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </div>
            <div className="row-title">{u.firstName}</div>
            <div className="row-value" style={{ fontWeight: 600 }}>
              {u.rating}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="empty">
            <div className="emoji">🏆</div>
            <div>Пока никто не сыграл</div>
          </div>
        )}
      </div>
    </div>
  );
}

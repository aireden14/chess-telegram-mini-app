import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TabletopLobby } from "../tabletop/TabletopLobby";
import { useTabletopRoom } from "../tabletop/useTabletopRoom";
import { TabletopSettings } from "../tabletop/presets";
import "../catan/catan.css";

const GAME = "carcassonne";

// Каркассон: одиночная партия идёт в iframe как раньше, а сетевая — через общую
// комнату. Правила остаются внутри игры, наружу ходят только снапшоты и намерения.
export function CarcassonneScreen() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"pick" | "solo" | "online">("pick");
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const frameReady = useRef(false);
  const initSent = useRef(false);

  const table = useTabletopRoom(GAME);
  const { room, amHost, mySeat, pendingSnapshot, pendingIntent } = table;

  const post = useCallback((msg: any) => {
    frameRef.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  useEffect(() => {
    document.body.classList.add("catan-fs-open");
    return () => { document.body.classList.remove("catan-fs-open"); };
  }, []);

  // Сообщения из игры: готовность, снапшоты ведущего и намерения игроков.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d === "hexland:exit") return nav("/");
      if (!d || typeof d !== "object" || d.source !== GAME) return;

      if (d.type === "mp:ready") { frameReady.current = true; return; }
      if (d.type === "mp:snapshot") {
        table.publishSnapshot(d.snapshot, d.turnIndex ?? 0, d.finished === true);
        return;
      }
      if (d.type === "mp:intent") table.sendIntent(d.intent);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [nav, table]);

  // Партия началась — отдаём игре состав стола и её роль.
  useEffect(() => {
    if (mode !== "online" || !room || room.phase === "lobby" || initSent.current) return;
    const send = () => {
      post({
        type: "mp:init",
        isHost: amHost,
        seat: mySeat,
        players: room.players.map((p) => ({ name: p.name, bot: p.bot })),
        snapshot: pendingSnapshot?.snapshot,
      });
      initSent.current = true;
    };
    if (frameReady.current) send();
    else {
      const t = setInterval(() => { if (frameReady.current) { send(); clearInterval(t); } }, 120);
      return () => clearInterval(t);
    }
  }, [mode, room, amHost, mySeat, pendingSnapshot, post]);

  // Роль ведущего может перейти к нам, если прежний не вернулся.
  useEffect(() => {
    if (!initSent.current || !room) return;
    post({ type: "mp:host", isHost: amHost });
  }, [amHost, room, post]);

  useEffect(() => {
    if (!pendingSnapshot || !initSent.current) return;
    post({ type: "mp:snapshot", snapshot: pendingSnapshot.snapshot });
    table.clearSnapshot();
  }, [pendingSnapshot, post, table]);

  useEffect(() => {
    if (!pendingIntent || !initSent.current) return;
    post({ type: "mp:intent", from: pendingIntent.from, intent: pendingIntent.intent });
    table.clearIntent();
  }, [pendingIntent, post, table]);

  const onCreate = (settings: TabletopSettings) => table.createRoom(settings);
  const onStart = () => { initSent.current = false; table.startGame(); };

  if (mode === "pick") {
    return (
      <div className="tt-lobby">
        <div className="tt-head">
          <h2>Каркассон</h2>
          <button className="tt-ghost" onClick={() => nav("/")}>В игры</button>
        </div>
        <div className="tt-actions">
          <button className="tt-primary" onClick={() => setMode("online")}>Игра с людьми</button>
          <button className="tt-ghost" onClick={() => setMode("solo")}>Одному против ботов</button>
        </div>
      </div>
    );
  }

  const showLobby = mode === "online" && (!room || room.phase === "lobby");

  return (
    <>
      {showLobby && (
        <TabletopLobby
          game={GAME}
          title="Каркассон"
          room={room}
          amHost={amHost}
          error={table.error}
          onCreate={onCreate}
          onJoin={table.joinRoom}
          onSettings={table.updateSettings}
          onStart={onStart}
          onLeave={() => { initSent.current = false; table.leaveRoom(); setMode("pick"); }}
          onExit={() => nav("/")}
        />
      )}
      <div className="catan-fs" style={{ paddingTop: "var(--safe-top, 0px)", display: showLobby ? "none" : undefined }}>
        <iframe
          ref={frameRef}
          className="catan-fs-frame"
          title="Каркассон"
          src="/games/carcassonne/index.html"
          allow="autoplay; fullscreen"
        />
      </div>
    </>
  );
}

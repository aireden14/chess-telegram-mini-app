import React, { useEffect, useRef } from "react";
import { TopNav } from "../../components/TopNav";
import { api } from "../../api/client";

// The beat-maker itself is a standalone iframe app in
// frontend/public/games/beat-maker/. This screen wraps it and bridges its
// save/list/delete messages to the backend so tracks live on the user's
// account (and can be pulled out later), falling back to the iframe's own
// localStorage when the API is unreachable.
export function BeatMakerScreen() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const origin = window.location.origin; // iframe is served same-origin
    const post = (msg: any) => {
      frameRef.current?.contentWindow?.postMessage({ target: "beat-maker", ...msg }, origin);
    };

    const pushList = async () => {
      try {
        const { data } = await api.get("/beats");
        post({ type: "cloud:list", tracks: data?.tracks ?? [] });
      } catch {
        post({ type: "cloud:list", tracks: [] });
      }
    };

    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== origin) return; // only trust the same-origin iframe
      const d = e.data;
      if (!d || d.source !== "beat-maker") return;
      if (d.type === "beat:ready" || d.type === "beat:requestList") {
        pushList();
      } else if (d.type === "beat:save") {
        try {
          await api.post("/beats", { name: d.name || d.track?.name, data: d.track });
        } catch {
          /* offline — iframe already kept a localStorage copy */
        }
        pushList();
      } else if (d.type === "beat:delete") {
        try {
          await api.delete(`/beats/${encodeURIComponent(d.id)}`);
        } catch {
          /* ignore */
        }
        pushList();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="app-screen force-deflector-screen beat-maker-screen">
      <TopNav title="WAVE FORGE" backTo="/" />
      <section className="force-deflector-frame-shell" aria-label="WAVE FORGE">
        <iframe
          ref={frameRef}
          className="force-deflector-frame"
          title="WAVE FORGE"
          src="/games/beat-maker/index.html"
          allow="autoplay; fullscreen"
        />
      </section>
    </div>
  );
}

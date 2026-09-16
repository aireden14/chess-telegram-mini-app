import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTelegram, triggerHaptic } from "../../hooks/useTelegram";
import { api } from "../../api/client";

/**
 * Читопус — трекер чтения. Внутри GamePass это standalone-приложение в iframe,
 * поэтому оболочка берёт на себя то, чего у вложенного документа нет:
 * тактильную отдачу Telegram, безопасные отступы, выход в хаб и запросы к API
 * (общий дневник с веб-версией в браузере — токен в iframe не передаётся).
 *
 * Source of truth приложения — apps/chitopus в корне воркспейса.
 */

type HapticKind = Parameters<typeof triggerHaptic>[0];

// Приложение знает про больше видов отклика, чем умеет общий хелпер хаба.
function mapHaptic(kind: unknown): HapticKind {
  switch (kind) {
    case "medium":
    case "heavy":
    case "success":
    case "warning":
    case "error":
      return kind;
    default:
      return "light";
  }
}

export function ChitopusScreen() {
  const nav = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Telegram отдаёт отступы только окну верхнего уровня — пересылаем их внутрь.
  const postSafeArea = useCallback(() => {
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    const tg = getTelegram();
    const device = tg?.safeAreaInset ?? {};
    const content = tg?.contentSafeAreaInset ?? {};
    frame.postMessage(
      {
        source: "gamepass-shell",
        type: "safe-area",
        inset: {
          top: (device.top ?? 0) + (content.top ?? 0),
          bottom: (device.bottom ?? 0) + (content.bottom ?? 0),
          left: (device.left ?? 0) + (content.left ?? 0),
          right: (device.right ?? 0) + (content.right ?? 0),
        },
      },
      "*",
    );
  }, []);

  const handleSync = useCallback(async (reqId: string, op: string, payload: unknown) => {
    const reply = (body: Record<string, unknown>) =>
      frameRef.current?.contentWindow?.postMessage(
        { source: "gamepass-shell", type: "chitopus-sync-result", reqId, ...body },
        window.location.origin,
      );
    const slow = { timeout: 75_000 };
    try {
      let data: unknown;
      if (op === "state") {
        const since = Number((payload as { since?: unknown } | null)?.since) || 0;
        data = (await api.get("/chitopus/state", { ...slow, params: { since } })).data;
      } else if (op === "push") data = (await api.post("/chitopus/sync", payload ?? {}, slow)).data;
      else if (op === "pair-code") data = (await api.post("/chitopus/pair-code", {}, slow)).data;
      else throw new Error("unknown op");
      reply({ ok: true, data });
    } catch (error) {
      const err = error as { response?: { status?: number }; message?: string };
      reply({ ok: false, status: err.response?.status ?? 0, error: err.message || "network error" });
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string; type?: string; kind?: string; reqId?: string; op?: string; payload?: unknown;
      } | null;
      if (!data || data.source !== "chitopus" || event.source !== frameRef.current?.contentWindow) return;
      if (data.type === "haptic") triggerHaptic(mapHaptic(data.kind));
      else if (data.type === "exit") nav("/");
      else if (data.type === "ready") postSafeArea();
      else if (data.type === "chitopus-sync" && typeof data.reqId === "string" && typeof data.op === "string") {
        void handleSync(data.reqId, data.op, data.payload);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nav, postSafeArea, handleSync]);

  // Звуки приложения не должны ставить музыку пользователя на паузу. На iOS
  // аудиосессия принадлежит документу верхнего уровня, а приложение живёт в
  // iframe — поэтому режим «ambient» выставляет оболочка, и обязательно
  // возвращает прежний на выходе, чтобы не менять поведение остального хаба.
  useEffect(() => {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (!session) return undefined;
    const previous = session.type;
    try {
      session.type = "ambient";
    } catch {
      return undefined;
    }
    return () => {
      try {
        session.type = previous;
      } catch {
        /* нечего откатывать */
      }
    };
  }, []);

  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return undefined;

    const atLeast = (v: string) => {
      try {
        return tg.isVersionAtLeast ? tg.isVersionAtLeast(v) : false;
      } catch {
        return false;
      }
    };

    // Дневник рассчитан на весь экран. Полноэкранный режим включаем только на
    // этом маршруте и обязательно выключаем на выходе, иначе остальной хаб
    // останется под чужой раскладкой.
    const wentFullscreen = atLeast("8.0");
    try {
      if (wentFullscreen) tg.requestFullscreen?.();
      tg.onEvent?.("safeAreaChanged", postSafeArea);
      tg.onEvent?.("contentSafeAreaChanged", postSafeArea);
      tg.onEvent?.("fullscreenChanged", postSafeArea);
      tg.onEvent?.("viewportChanged", postSafeArea);
    } catch {
      /* клиент постарше — остаёмся в обычном режиме */
    }
    postSafeArea();

    return () => {
      try {
        tg.offEvent?.("safeAreaChanged", postSafeArea);
        tg.offEvent?.("contentSafeAreaChanged", postSafeArea);
        tg.offEvent?.("fullscreenChanged", postSafeArea);
        tg.offEvent?.("viewportChanged", postSafeArea);
        if (wentFullscreen) tg.exitFullscreen?.();
      } catch {
        /* нечего откатывать */
      }
    };
  }, [postSafeArea]);

  return (
    <div className="app-screen chitopus-screen">
      <section className="force-deflector-frame-shell" aria-label="Читопус">
        <iframe
          ref={frameRef}
          className="force-deflector-frame"
          title="Читопус"
          src="/games/chitopus/index.html"
          allow="fullscreen"
          onLoad={postSafeArea}
        />
      </section>
    </div>
  );
}

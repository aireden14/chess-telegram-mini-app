import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTelegram, triggerHaptic } from "../../hooks/useTelegram";
import { api } from "../../api/client";

/**
 * BurpiOpus — дневник тренировок. Внутри GamePass это standalone-приложение в
 * iframe, поэтому оболочка берёт на себя ровно три вещи, которых у вложенного
 * документа нет: тактильную отдачу Telegram, безопасные отступы и выход в хаб.
 *
 * Source of truth приложения — apps/burpi-opus в корне воркспейса.
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

export function BurpiOpusScreen() {
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

  // Общий дневник с Apple Watch: приложение просит, оболочка ходит в API со
  // своим токеном и возвращает ответ. Токен внутрь iframe не передаётся.
  const handleSync = useCallback(async (reqId: string, op: string, payload: unknown) => {
    const reply = (body: Record<string, unknown>) =>
      frameRef.current?.contentWindow?.postMessage(
        { source: "gamepass-shell", type: "burpi-sync-result", reqId, ...body },
        window.location.origin,
      );
    const slow = { timeout: 75_000 };
    try {
      let data: unknown;
      if (op === "state") {
        const since = Number((payload as { since?: unknown } | null)?.since) || 0;
        data = (await api.get("/burpi-opus/state", { ...slow, params: { since } })).data;
      } else if (op === "push") data = (await api.post("/burpi-opus/sync", payload ?? {}, slow)).data;
      else if (op === "pair-code") data = (await api.post("/burpi-opus/pair-code", {}, slow)).data;
      else if (op === "links") data = (await api.get("/burpi-opus/watch-links", slow)).data;
      else if (op === "unlink") data = (await api.delete("/burpi-opus/watch-links", slow)).data;
      else if (op === "friends") data = (await api.get("/burpi-opus/friends", slow)).data;
      else if (op === "friend-add") {
        const code = String((payload as { code?: unknown } | null)?.code ?? "");
        data = (await api.post("/burpi-opus/friends", { code }, slow)).data;
      } else if (op === "friend-remove") {
        const id = Number((payload as { id?: unknown } | null)?.id);
        if (!Number.isInteger(id)) throw new Error("bad id");
        data = (await api.delete(`/burpi-opus/friends/${id}`, slow)).data;
      }
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
        source?: string; type?: string; kind?: string; dateKey?: string;
        reqId?: string; op?: string; payload?: unknown;
      } | null;
      if (!data || data.source !== "burpi-opus" || event.source !== frameRef.current?.contentWindow) return;
      if (data.type === "haptic") triggerHaptic(mapHaptic(data.kind));
      else if (data.type === "exit") nav("/");
      else if (data.type === "ready") postSafeArea();
      else if (data.type === "day-complete") void api.post("/burpi-reminders/complete", { dateKey: data.dateKey }).catch(() => undefined);
      else if (data.type === "burpi-sync" && typeof data.reqId === "string" && typeof data.op === "string") {
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
    <div className="app-screen burpi-opus-screen">
      <section className="force-deflector-frame-shell" aria-label="BurpiOpus">
        <iframe
          ref={frameRef}
          className="force-deflector-frame"
          title="BurpiOpus"
          src="/games/burpi-opus/index.html"
          allow="fullscreen"
          onLoad={postSafeArea}
        />
      </section>
    </div>
  );
}

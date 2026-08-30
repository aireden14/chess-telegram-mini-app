import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTelegram, triggerHaptic } from "../../hooks/useTelegram";

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

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; kind?: string } | null;
      if (!data || data.source !== "burpi-opus") return;
      if (data.type === "haptic") triggerHaptic(mapHaptic(data.kind));
      else if (data.type === "exit") nav("/");
      else if (data.type === "ready") postSafeArea();
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nav, postSafeArea]);

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

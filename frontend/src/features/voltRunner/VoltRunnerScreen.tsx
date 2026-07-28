import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";

type RunnerState = "menu" | "running" | "paused";

const MESSAGE_SOURCE_GAMEPASS = "gamepass";
const MESSAGE_SOURCE_RUNNER = "volt-runner";

export function VoltRunnerScreen() {
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const safeAreaProbeRef = useRef<HTMLDivElement>(null);
  const [runnerState, setRunnerState] = useState<RunnerState>("menu");

  const postSafeArea = useCallback(() => {
    const frameWindow = frameRef.current?.contentWindow;
    const probe = safeAreaProbeRef.current;
    if (!frameWindow || !probe) return;

    const styles = window.getComputedStyle(probe);
    const readInset = (value: string) => {
      const inset = Number.parseFloat(value);
      return Number.isFinite(inset) ? Math.max(0, inset) : 0;
    };

    frameWindow.postMessage(
      {
        source: MESSAGE_SOURCE_GAMEPASS,
        type: "volt-runner:safe-area",
        top: readInset(styles.paddingTop),
        bottom: readInset(styles.paddingBottom),
      },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const scheduleSafeArea = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(postSafeArea);
    };

    const rootStyleObserver = new MutationObserver(scheduleSafeArea);
    rootStyleObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    window.addEventListener("resize", scheduleSafeArea);
    window.addEventListener("orientationchange", scheduleSafeArea);
    window.visualViewport?.addEventListener("resize", scheduleSafeArea);
    scheduleSafeArea();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      rootStyleObserver.disconnect();
      window.removeEventListener("resize", scheduleSafeArea);
      window.removeEventListener("orientationchange", scheduleSafeArea);
      window.visualViewport?.removeEventListener("resize", scheduleSafeArea);
    };
  }, [postSafeArea]);

  useEffect(() => {
    const handleRunnerMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      ) {
        return;
      }

      const message = event.data as {
        source?: unknown;
        type?: unknown;
        state?: unknown;
      };
      if (message.source !== MESSAGE_SOURCE_RUNNER) return;

      if (
        message.type === "volt-runner:state" &&
        (message.state === "menu" ||
          message.state === "running" ||
          message.state === "paused")
      ) {
        setRunnerState(message.state);
      }

      if (message.type === "volt-runner:exit-ready") {
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("message", handleRunnerMessage);
    return () => window.removeEventListener("message", handleRunnerMessage);
  }, [navigate]);

  const handleBack = useCallback(() => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) {
      if (runnerState === "menu") navigate("/", { replace: true });
      return;
    }

    frameWindow.postMessage(
      {
        source: MESSAGE_SOURCE_GAMEPASS,
        type: "volt-runner:request-exit",
      },
      window.location.origin,
    );
  }, [navigate, runnerState]);

  return (
    <div
      className="app-screen force-deflector-screen neon-blade-screen volt-runner-screen"
      data-runner-state={runnerState}
    >
      <TopNav title="VOLT RUNNER" onBack={handleBack} />
      <section className="force-deflector-frame-shell" aria-label="VOLT RUNNER">
        <iframe
          ref={frameRef}
          className="force-deflector-frame"
          title="VOLT RUNNER"
          src="/games/volt-runner/index.html"
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={postSafeArea}
        />
      </section>
      <div
        ref={safeAreaProbeRef}
        className="volt-runner-safe-area-probe"
        aria-hidden="true"
      />
    </div>
  );
}

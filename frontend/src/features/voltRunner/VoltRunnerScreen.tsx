import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

type RunnerState = "menu" | "running" | "paused";

const MESSAGE_SOURCE_GAMEPASS = "gamepass";
const MESSAGE_SOURCE_RUNNER = "volt-runner";
const VOLT_RUNNER_VERSION = "1.1.1";
const VOLT_RUNNER_SOURCE = `/games/volt-runner/index.html?v=${VOLT_RUNNER_VERSION}`;

export function VoltRunnerScreen() {
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const safeAreaProbeRef = useRef<HTMLDivElement>(null);
  const [runnerState, setRunnerState] = useState<RunnerState>("menu");
  const [runnerVersion, setRunnerVersion] = useState("loading");

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

  useLayoutEffect(() => {
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
        version?: unknown;
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

      if (
        message.type === "volt-runner:ready" &&
        typeof message.version === "string"
      ) {
        setRunnerVersion(message.version);
      }
    };

    window.addEventListener("message", handleRunnerMessage);
    return () => window.removeEventListener("message", handleRunnerMessage);
  }, [navigate]);

  const handleFrameLoad = useCallback(() => {
    postSafeArea();
    const requestReady = () =>
      frameRef.current?.contentWindow?.postMessage(
        {
          source: MESSAGE_SOURCE_GAMEPASS,
          type: "volt-runner:request-ready",
        },
        window.location.origin,
      );
    requestReady();
    window.requestAnimationFrame(requestReady);
    window.setTimeout(requestReady, 300);
  }, [postSafeArea]);

  return (
    <div
      className="app-screen force-deflector-screen neon-blade-screen volt-runner-screen"
      data-runner-state={runnerState}
      data-runner-version={runnerVersion}
    >
      <section className="force-deflector-frame-shell" aria-label="VOLT RUNNER">
        <iframe
          ref={frameRef}
          className="force-deflector-frame"
          title="VOLT RUNNER"
          src={VOLT_RUNNER_SOURCE}
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={handleFrameLoad}
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

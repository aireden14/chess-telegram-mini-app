(function attachVoltUI(globalScope) {
  "use strict";

  const DEFAULT_SCREEN_IDS = Object.freeze([
    "menu",
    "pause",
    "info",
    "news",
    "result",
  ]);

  function requireElement(root, id) {
    const element = root.getElementById(id);
    if (!element) throw new Error(`VOLT UI: missing #${id}`);
    return element;
  }

  function setElementState(element, visible, display, interactive = true) {
    element.hidden = !visible;
    element.inert = !visible;
    element.setAttribute("aria-hidden", visible ? "false" : "true");
    element.style.display = visible ? display : "none";
    element.style.pointerEvents = visible
      ? interactive
        ? "auto"
        : ""
      : "none";
  }

  function createScreenController(root, options = {}) {
    const screenIds = options.screenIds || DEFAULT_SCREEN_IDS;
    const screens = new Map(
      screenIds.map((id) => [id, requireElement(root, id)]),
    );
    const hud = requireElement(root, options.hudId || "hud");
    const controls = requireElement(root, options.controlsId || "controls");
    const debugHud = requireElement(root, options.debugId || "debugHud");
    let activeScreen = "menu";

    function show(screenId, flags = {}) {
      if (screenId !== null && !screens.has(screenId)) {
        throw new Error(`VOLT UI: unknown screen ${screenId}`);
      }

      activeScreen = screenId;
      for (const [id, element] of screens) {
        setElementState(element, id === screenId, "flex");
      }

      const gameplayVisible = screenId === null;
      setElementState(hud, gameplayVisible, "block", false);
      setElementState(controls, gameplayVisible, "block", false);
      setElementState(
        debugHud,
        gameplayVisible && flags.labMode && flags.debugEnabled,
        "block",
        false,
      );

      root.documentElement?.setAttribute(
        "data-volt-screen",
        screenId || "game",
      );
      return activeScreen;
    }

    function snapshot() {
      return {
        activeScreen,
        visibleScreens: [...screens]
          .filter(([, element]) => !element.hidden)
          .map(([id]) => id),
        hudVisible: !hud.hidden,
        controlsVisible: !controls.hidden,
      };
    }

    show("menu");
    return Object.freeze({ show, snapshot });
  }

  function bindActions(root, actionMap) {
    const cleanups = [];
    for (const [id, handler] of Object.entries(actionMap)) {
      if (typeof handler !== "function") {
        throw new TypeError(`VOLT UI: action #${id} is not a function`);
      }
      const button = requireElement(root, id);
      button.type = "button";
      const listener = (event) => {
        event.preventDefault();
        if (button.disabled) return;
        handler(event);
      };
      button.addEventListener("click", listener);
      cleanups.push(() => button.removeEventListener("click", listener));
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }

  const api = Object.freeze({
    DEFAULT_SCREEN_IDS,
    bindActions,
    createScreenController,
  });
  globalScope.VoltUI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const UI = require("../engine/ui.js");

function fakeElement() {
  const listeners = new Map();
  return {
    hidden: false,
    inert: false,
    disabled: false,
    style: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    click() {
      listeners.get("click")?.({
        preventDefault() {
          this.defaultPrevented = true;
        },
      });
    },
  };
}

function fakeDocument() {
  const ids = [
    ...UI.DEFAULT_SCREEN_IDS,
    "hud",
    "controls",
    "debugHud",
    "playBtn",
  ];
  const elements = new Map(ids.map((id) => [id, fakeElement()]));
  const documentElement = fakeElement();
  return {
    documentElement,
    elements,
    getElementById(id) {
      return elements.get(id) || null;
    },
  };
}

test("startup makes only the menu visible and interactive", () => {
  const root = fakeDocument();
  const controller = UI.createScreenController(root);
  assert.deepEqual(controller.snapshot(), {
    activeScreen: "menu",
    visibleScreens: ["menu"],
    hudVisible: false,
    controlsVisible: false,
  });
  assert.equal(root.elements.get("menu").style.display, "flex");
  assert.equal(root.elements.get("menu").style.pointerEvents, "auto");
  assert.equal(root.elements.get("result").style.display, "none");
  assert.equal(root.elements.get("result").style.pointerEvents, "none");
  assert.equal(root.elements.get("result").inert, true);
});

test("menu, gameplay, pause and result transitions cannot leave an overlay behind", () => {
  const root = fakeDocument();
  const controller = UI.createScreenController(root);
  controller.show(null);
  assert.deepEqual(controller.snapshot(), {
    activeScreen: null,
    visibleScreens: [],
    hudVisible: true,
    controlsVisible: true,
  });
  assert.equal(root.elements.get("result").hidden, true);
  assert.equal(root.elements.get("hud").style.pointerEvents, "");
  assert.equal(root.elements.get("controls").style.pointerEvents, "");

  controller.show("pause");
  assert.deepEqual(controller.snapshot().visibleScreens, ["pause"]);
  assert.equal(root.elements.get("menu").style.display, "none");
  controller.show(null);
  assert.deepEqual(controller.snapshot().visibleScreens, []);

  controller.show("result");
  assert.deepEqual(controller.snapshot().visibleScreens, ["result"]);
  assert.equal(root.elements.get("hud").style.display, "none");
  assert.equal(root.elements.get("controls").style.display, "none");

  controller.show("menu");
  assert.deepEqual(controller.snapshot().visibleScreens, ["menu"]);
  assert.equal(root.elements.get("result").style.display, "none");
});

test("debug HUD is visible only during debug lab gameplay", () => {
  const root = fakeDocument();
  const controller = UI.createScreenController(root);
  controller.show(null, { labMode: true, debugEnabled: true });
  assert.equal(root.elements.get("debugHud").hidden, false);
  controller.show("pause", { labMode: true, debugEnabled: true });
  assert.equal(root.elements.get("debugHud").hidden, true);
});

test("required click actions bind once and respect disabled buttons", () => {
  const root = fakeDocument();
  let starts = 0;
  const cleanup = UI.bindActions(root, { playBtn: () => starts += 1 });
  root.elements.get("playBtn").click();
  assert.equal(starts, 1);
  root.elements.get("playBtn").disabled = true;
  root.elements.get("playBtn").click();
  assert.equal(starts, 1);
  cleanup();
  root.elements.get("playBtn").disabled = false;
  root.elements.get("playBtn").click();
  assert.equal(starts, 1);
});

test("missing screens and actions fail during boot instead of making a dead UI", () => {
  const root = fakeDocument();
  root.elements.delete("result");
  assert.throws(
    () => UI.createScreenController(root),
    /missing #result/,
  );
  assert.throws(
    () => UI.bindActions(root, { missingButton: () => {} }),
    /missing #missingButton/,
  );
});

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Movement = require("../engine/movement.js");
const DT = 1 / 120;
const ENVIRONMENT = { runSpeed: 420, gravity: 1850 };

function createBody(overrides = {}) {
  return {
    x: 0,
    y: 534,
    vx: 420,
    vy: 0,
    ground: true,
    support: null,
    dashCharge: 1,
    dashing: 0,
    ...overrides,
  };
}

function simulateJump(releaseAt) {
  const controller = Movement.createController();
  const body = createBody();
  Movement.pressJump(controller);
  let minimumY = body.y;
  let elapsed = 0;

  for (let tick = 0; tick < 360; tick += 1) {
    if (elapsed >= releaseAt && controller.jumpHeld) {
      Movement.releaseJump(controller);
    }
    Movement.step(controller, body, ENVIRONMENT, DT);
    body.x += body.vx * DT;
    body.y += body.vy * DT;
    body.ground = false;
    if (body.y >= 534) {
      body.y = 534;
      body.vy = 0;
      Movement.land(controller, body);
    }
    minimumY = Math.min(minimumY, body.y);
    elapsed += DT;
  }
  return minimumY;
}

function runReplay(renderRate, scenario) {
  const controller = Movement.createController();
  const body = createBody();
  const frameDelta = 1 / renderRate;
  let accumulator = 0;
  let tick = 0;

  while (tick < 1200) {
    accumulator += frameDelta;
    while (accumulator + 1e-12 >= DT && tick < 1200) {
      if (scenario.jumpTicks.has(tick)) Movement.pressJump(controller);
      if (scenario.jumpReleaseTicks.has(tick)) Movement.releaseJump(controller);
      if (scenario.dashTicks.has(tick)) Movement.pressDash(controller);
      if (scenario.dashReleaseTicks.has(tick)) Movement.releaseDash(controller);

      Movement.step(controller, body, ENVIRONMENT, DT);
      body.x += body.vx * DT;
      body.y += body.vy * DT;
      body.ground = false;
      if (body.y >= 534) {
        body.y = 534;
        body.vy = 0;
        Movement.land(controller, body);
      }
      tick += 1;
      accumulator -= DT;
    }
  }

  return {
    x: body.x,
    y: body.y,
    vx: body.vx,
    vy: body.vy,
    charge: body.dashCharge,
    controller: Movement.snapshot(controller),
  };
}

function scenarioFor(seed) {
  const jumpTicks = new Set();
  const jumpReleaseTicks = new Set();
  const dashTicks = new Set();
  const dashReleaseTicks = new Set();
  for (let tick = 30 + seed; tick < 1150; tick += 137 + (seed % 9)) {
    jumpTicks.add(tick);
    jumpReleaseTicks.add(tick + 5 + (seed % 12));
  }
  for (let tick = 55 + seed * 2; tick < 1150; tick += 211 + (seed % 7)) {
    dashTicks.add(tick);
    dashReleaseTicks.add(tick + 3);
  }
  return { jumpTicks, jumpReleaseTicks, dashTicks, dashReleaseTicks };
}

test("coyote jump survives 10 fixed ticks but expires after 13", () => {
  const inside = Movement.createController();
  const insideBody = createBody({ ground: false });
  inside.coyote = Movement.DEFAULTS.coyoteTime;
  for (let tick = 0; tick < 10; tick += 1) {
    Movement.step(inside, insideBody, ENVIRONMENT, DT);
  }
  Movement.pressJump(inside);
  const insideEvent = Movement.step(inside, insideBody, ENVIRONMENT, DT);
  assert.equal(insideEvent.jumpType, "ground");

  const outside = Movement.createController();
  const outsideBody = createBody({ ground: false });
  outside.coyote = Movement.DEFAULTS.coyoteTime;
  for (let tick = 0; tick < 13; tick += 1) {
    Movement.step(outside, outsideBody, ENVIRONMENT, DT);
  }
  Movement.pressJump(outside);
  const outsideEvent = Movement.step(outside, outsideBody, ENVIRONMENT, DT);
  assert.equal(outsideEvent.jumpType, "air");
  assert.equal(outside.airJumps, 0);
});

test("landing consumes a 14-tick buffer but not an expired 15-tick buffer", () => {
  const inside = Movement.createController();
  const insideBody = createBody({ ground: false });
  inside.airJumps = 0;
  inside.coyote = 0;
  Movement.pressJump(inside);
  for (let tick = 0; tick < 14; tick += 1) {
    Movement.step(inside, insideBody, ENVIRONMENT, DT);
  }
  const buffered = Movement.land(inside, insideBody);
  assert.equal(buffered.jumped, true);
  assert.equal(buffered.jumpType, "ground");

  const outside = Movement.createController();
  const outsideBody = createBody({ ground: false });
  outside.airJumps = 0;
  outside.coyote = 0;
  Movement.pressJump(outside);
  for (let tick = 0; tick < 15; tick += 1) {
    Movement.step(outside, outsideBody, ENVIRONMENT, DT);
  }
  const expired = Movement.land(outside, outsideBody);
  assert.equal(expired.jumped, false);
});

test("held jump reaches materially higher than a tap", () => {
  const heldApex = simulateJump(0.16);
  const tapApex = simulateJump(0.025);
  assert.ok(
    heldApex < tapApex - 55,
    `held=${heldApex.toFixed(2)} tap=${tapApex.toFixed(2)}`,
  );
});

test("held input does not create repeated edges", () => {
  const controller = Movement.createController();
  assert.equal(Movement.pressJump(controller), true);
  assert.equal(Movement.pressJump(controller), false);
  assert.equal(Movement.pressDash(controller), true);
  assert.equal(Movement.pressDash(controller), false);
});

test("dash buffer, cancel and absolute speed cap remain stable for 10k ticks", () => {
  const controller = Movement.createController();
  const body = createBody();
  let maximumSpeed = body.vx;
  let cancelled = false;

  for (let tick = 0; tick < 10_000; tick += 1) {
    if (tick % 260 === 0) {
      Movement.releaseDash(controller);
      Movement.pressDash(controller);
    }
    if (tick % 260 === 12) {
      Movement.releaseJump(controller);
      Movement.pressJump(controller);
    }
    const event = Movement.step(controller, body, ENVIRONMENT, DT);
    cancelled ||= event.dashCancelled;
    body.x += body.vx * DT;
    body.y += body.vy * DT;
    body.ground = false;
    if (body.y >= 534) {
      body.y = 534;
      body.vy = 0;
      Movement.land(controller, body);
      Movement.releaseJump(controller);
    }
    maximumSpeed = Math.max(maximumSpeed, body.vx);
  }

  assert.ok(cancelled, "jump should cancel a dash after the lock window");
  assert.ok(maximumSpeed <= 850 + 1e-9, `max speed was ${maximumSpeed}`);
});

test("dash buffer waits for recharge and cancel sheds speed", () => {
  const bufferedController = Movement.createController();
  const bufferedBody = createBody({ dashCharge: 0.325 });
  Movement.pressDash(bufferedController);
  let dashedAtTick = -1;
  for (let tick = 0; tick < 15; tick += 1) {
    const event = Movement.step(
      bufferedController,
      bufferedBody,
      ENVIRONMENT,
      DT,
    );
    if (event.dashed) {
      dashedAtTick = tick;
      break;
    }
  }
  assert.ok(dashedAtTick > 0, "dash should wait for recharge");
  assert.ok(dashedAtTick * DT < Movement.DEFAULTS.dashBufferTime);

  const cancelController = Movement.createController();
  const cancelBody = createBody();
  Movement.pressDash(cancelController);
  Movement.step(cancelController, cancelBody, ENVIRONMENT, DT);
  for (let tick = 0; tick < 8; tick += 1) {
    Movement.step(cancelController, cancelBody, ENVIRONMENT, DT);
  }
  const speedBeforeCancel = cancelBody.vx;
  Movement.pressJump(cancelController);
  const cancelEvent = Movement.step(
    cancelController,
    cancelBody,
    ENVIRONMENT,
    DT,
  );
  assert.equal(cancelEvent.dashCancelled, true);
  assert.ok(cancelBody.vx < speedBeforeCancel);
  assert.ok(cancelBody.vx <= cancelEvent.maxRunSpeed);
});

test("the final dash movement tick still protects collisions", () => {
  const controller = Movement.createController();
  const body = createBody();
  controller.dashTimer = DT * 0.8;
  controller.dashAge = 0.1;
  const finalDashTick = Movement.step(controller, body, ENVIRONMENT, DT);
  assert.equal(finalDashTick.dashing, true);
  assert.ok(body.dashing > 0);

  const afterDash = Movement.step(controller, body, ENVIRONMENT, DT);
  assert.equal(afterDash.dashing, false);
  assert.equal(body.dashing, 0);
});

test("a released landing buffer produces a short jump", () => {
  const controller = Movement.createController();
  const body = createBody({ ground: false });
  controller.airJumps = 0;
  controller.coyote = 0;
  Movement.pressJump(controller);
  Movement.releaseJump(controller);
  for (let tick = 0; tick < 10; tick += 1) {
    Movement.step(controller, body, ENVIRONMENT, DT);
  }
  const landingEvent = Movement.land(controller, body);
  assert.equal(landingEvent.jumpType, "ground");
  assert.equal(
    body.vy,
    Movement.DEFAULTS.groundJumpVelocity * 0.52,
  );
  assert.equal(controller.jumpHold, 0);
});

test("jump-cancel clears a queued dash instead of restarting it", () => {
  const controller = Movement.createController();
  const body = createBody();
  Movement.pressDash(controller);
  Movement.step(controller, body, ENVIRONMENT, DT);
  for (let tick = 0; tick < 8; tick += 1) {
    Movement.step(controller, body, ENVIRONMENT, DT);
  }
  Movement.releaseDash(controller);
  Movement.pressDash(controller);
  Movement.pressJump(controller);
  const event = Movement.step(controller, body, ENVIRONMENT, DT);
  assert.equal(event.dashCancelled, true);
  assert.equal(event.dashed, false);
  assert.equal(controller.dashBuffer, 0);
  assert.equal(controller.dashTimer, 0);
});

test("30 replays are deterministic at 30, 60 and 120 render cadence", () => {
  for (let seed = 0; seed < 30; seed += 1) {
    const scenario = scenarioFor(seed);
    const at30 = runReplay(30, scenario);
    const at60 = runReplay(60, scenario);
    const at120 = runReplay(120, scenario);
    for (const candidate of [at30, at60]) {
      assert.ok(Math.abs(candidate.x - at120.x) < 2, `seed ${seed}: x drift`);
      assert.ok(Math.abs(candidate.y - at120.y) < 2, `seed ${seed}: y drift`);
      assert.deepEqual(candidate, at120, `seed ${seed}: replay state drift`);
    }
  }
});

test("swept top collision lands from above and passes through from below", () => {
  const platform = { x: 100, y: 500, w: 120, h: 22 };
  const landing = Movement.sweptTopLanding(
    { x: 120, y: 420, w: 44, h: 56 },
    { x: 150, y: 480, w: 44, h: 56 },
    platform,
    platform,
  );
  assert.ok(landing);
  assert.ok(landing.time >= 0 && landing.time <= 1);

  const fromBelow = Movement.sweptTopLanding(
    { x: 120, y: 520, w: 44, h: 56 },
    { x: 120, y: 430, w: 44, h: 56 },
    platform,
    platform,
  );
  assert.equal(fromBelow, null);
});

test("30 relative sweeps land on moving platforms without tunneling", () => {
  for (let run = 0; run < 30; run += 1) {
    const startX = 180 + run * 3;
    const platformFrom = {
      x: 160 + Math.sin(run) * 20,
      y: 500 + Math.cos(run) * 8,
      w: 150,
      h: 22,
    };
    const platformTo = {
      ...platformFrom,
      x: platformFrom.x + Math.cos(run * 0.7) * 18,
      y: platformFrom.y + Math.sin(run * 0.9) * 6,
    };
    const landing = Movement.sweptTopLanding(
      { x: startX, y: platformFrom.y - 90, w: 44, h: 56 },
      { x: startX + 12, y: platformTo.y + 12, w: 44, h: 56 },
      platformFrom,
      platformTo,
    );
    assert.ok(landing, `run ${run} should land`);
  }
});

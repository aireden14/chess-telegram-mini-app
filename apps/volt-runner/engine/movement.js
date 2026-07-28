(function attachVoltMovement(globalScope) {
  "use strict";

  const DEFAULTS = Object.freeze({
    coyoteTime: 0.1,
    jumpBufferTime: 0.12,
    jumpHoldTime: 0.16,
    groundJumpVelocity: -690,
    airJumpVelocity: -620,
    heldGravityMultiplier: 0.55,
    releasedRiseGravityMultiplier: 1.65,
    fallGravityMultiplier: 1.12,
    maxFallSpeed: 1500,
    dashBufferTime: 0.12,
    dashDuration: 0.24,
    dashCancelLock: 0.06,
    dashCost: 0.34,
    dashBoost: 430,
    dashRecharge: 0.19,
    runAcceleration: 1150,
    dashAcceleration: 5200,
    dashExitAcceleration: 1750,
    absoluteMaxRunSpeed: 980,
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const approach = (value, target, amount) =>
    value < target
      ? Math.min(target, value + amount)
      : Math.max(target, value - amount);

  function mergeConfig(overrides) {
    return { ...DEFAULTS, ...(overrides || {}) };
  }

  function createController(options) {
    const config = mergeConfig(options);
    return {
      config,
      tick: 0,
      jumpHeld: false,
      dashHeld: false,
      jumpReleased: false,
      jumpBuffer: 0,
      dashBuffer: 0,
      coyote: config.coyoteTime,
      jumpHold: 0,
      airJumps: 1,
      dashTimer: 0,
      dashAge: 0,
      lastJumpType: null,
    };
  }

  function resetController(controller, grounded = true) {
    const { config } = controller;
    controller.tick = 0;
    controller.jumpHeld = false;
    controller.dashHeld = false;
    controller.jumpReleased = false;
    controller.jumpBuffer = 0;
    controller.dashBuffer = 0;
    controller.coyote = grounded ? config.coyoteTime : 0;
    controller.jumpHold = 0;
    controller.airJumps = 1;
    controller.dashTimer = 0;
    controller.dashAge = 0;
    controller.lastJumpType = null;
    return controller;
  }

  function pressJump(controller) {
    if (controller.jumpHeld) return false;
    controller.jumpHeld = true;
    controller.jumpReleased = false;
    controller.jumpBuffer = controller.config.jumpBufferTime;
    return true;
  }

  function releaseJump(controller) {
    if (!controller.jumpHeld) return false;
    controller.jumpHeld = false;
    controller.jumpReleased = true;
    return true;
  }

  function pressDash(controller) {
    if (controller.dashHeld) return false;
    controller.dashHeld = true;
    controller.dashBuffer = controller.config.dashBufferTime;
    return true;
  }

  function releaseDash(controller) {
    if (!controller.dashHeld) return false;
    controller.dashHeld = false;
    return true;
  }

  function clearInput(controller) {
    controller.jumpHeld = false;
    controller.dashHeld = false;
    controller.jumpReleased = false;
    controller.jumpBuffer = 0;
    controller.dashBuffer = 0;
  }

  function consumeJump(controller, body, type) {
    const { config } = controller;
    const groundJump = type === "ground";
    body.vy = groundJump
      ? config.groundJumpVelocity
      : config.airJumpVelocity;
    body.ground = false;
    body.support = null;
    controller.jumpBuffer = 0;
    controller.jumpHold = controller.jumpHeld ? config.jumpHoldTime : 0;
    controller.coyote = 0;
    controller.lastJumpType = type;
    if (!groundJump) controller.airJumps = Math.max(0, controller.airJumps - 1);
    if (!controller.jumpHeld) body.vy *= 0.52;

    let dashCancelled = false;
    if (
      controller.dashTimer > 0 &&
      controller.dashAge >= config.dashCancelLock
    ) {
      controller.dashTimer = 0;
      controller.dashAge = 0;
      body.vx *= 0.92;
      dashCancelled = true;
    }

    return { jumped: true, jumpType: type, dashCancelled };
  }

  function tryJump(controller, body) {
    if (controller.jumpBuffer <= 0) {
      return { jumped: false, jumpType: null, dashCancelled: false };
    }
    if (body.ground || controller.coyote > 0) {
      return consumeJump(controller, body, "ground");
    }
    if (controller.airJumps > 0) {
      return consumeJump(controller, body, "air");
    }
    return { jumped: false, jumpType: null, dashCancelled: false };
  }

  function tryDash(controller, body) {
    const { config } = controller;
    if (
      controller.dashBuffer <= 0 ||
      controller.dashTimer > 0 ||
      body.dashCharge + 1e-9 < config.dashCost
    ) {
      return false;
    }
    body.dashCharge = Math.max(0, body.dashCharge - config.dashCost);
    controller.dashBuffer = 0;
    controller.dashTimer = config.dashDuration;
    controller.dashAge = 0;
    return true;
  }

  function step(controller, body, environment, dt) {
    const config = controller.config;
    const runSpeed = Math.max(0, Number(environment.runSpeed) || 0);
    const gravity = Math.max(0, Number(environment.gravity) || 0);
    const maxRunSpeed = Math.min(
      config.absoluteMaxRunSpeed,
      runSpeed + config.dashBoost,
    );
    const wasDashing = controller.dashTimer > 0;

    controller.tick += 1;
    if (body.ground) {
      controller.coyote = config.coyoteTime;
      controller.airJumps = 1;
    } else {
      controller.coyote = Math.max(0, controller.coyote - dt);
    }

    body.dashCharge = clamp(
      Number(body.dashCharge) + config.dashRecharge * dt,
      0,
      1,
    );

    if (controller.jumpReleased) {
      if (body.vy < 0) body.vy *= 0.52;
      controller.jumpHold = 0;
      controller.jumpReleased = false;
    }

    const jumpEvent = tryJump(controller, body);
    if (jumpEvent.dashCancelled) controller.dashBuffer = 0;
    const dashed = jumpEvent.dashCancelled ? false : tryDash(controller, body);
    const dashing = controller.dashTimer > 0;
    const targetSpeed = dashing ? maxRunSpeed : runSpeed;
    const acceleration = dashing
      ? config.dashAcceleration
      : wasDashing
        ? config.dashExitAcceleration
        : config.runAcceleration;
    body.vx = clamp(
      approach(Number(body.vx) || 0, targetSpeed, acceleration * dt),
      0,
      maxRunSpeed,
    );

    let gravityMultiplier = config.fallGravityMultiplier;
    if (body.vy < 0) {
      gravityMultiplier =
        controller.jumpHeld && controller.jumpHold > 0
          ? config.heldGravityMultiplier
          : config.releasedRiseGravityMultiplier;
    }
    body.vy = Math.min(
      config.maxFallSpeed,
      body.vy + gravity * gravityMultiplier * dt,
    );

    if (controller.jumpHeld) {
      controller.jumpHold = Math.max(0, controller.jumpHold - dt);
    }
    if (controller.dashTimer > 0) {
      controller.dashTimer = Math.max(0, controller.dashTimer - dt);
      controller.dashAge += dt;
    } else {
      controller.dashAge = 0;
    }

    controller.jumpBuffer = Math.max(0, controller.jumpBuffer - dt);
    controller.dashBuffer = Math.max(0, controller.dashBuffer - dt);
    body.dashing = dashing
      ? Math.max(controller.dashTimer, Number.EPSILON)
      : 0;

    return {
      ...jumpEvent,
      dashed,
      dashing,
      maxRunSpeed,
    };
  }

  function land(controller, body) {
    body.ground = true;
    controller.coyote = controller.config.coyoteTime;
    controller.airJumps = 1;
    return tryJump(controller, body);
  }

  function sweptTopLanding(bodyFrom, bodyTo, platformFrom, platformTo) {
    const platformEnd = platformTo || platformFrom;
    const oldBottom = bodyFrom.y + bodyFrom.h;
    const newBottom = bodyTo.y + bodyFrom.h;
    const startGap = platformFrom.y - oldBottom;
    const endGap = platformEnd.y - newBottom;
    const relativeTravel = startGap - endGap;
    if (startGap < -10 || endGap > 1 || relativeTravel < 1e-9) return null;

    const time = clamp(startGap / relativeTravel, 0, 1);
    const playerLeft = bodyFrom.x + (bodyTo.x - bodyFrom.x) * time;
    const platformLeft =
      platformFrom.x + (platformEnd.x - platformFrom.x) * time;
    if (
      playerLeft + bodyFrom.w <= platformLeft + 2 ||
      playerLeft >= platformLeft + platformFrom.w - 2
    ) {
      return null;
    }

    return {
      time,
      x: playerLeft,
      y: platformFrom.y + (platformEnd.y - platformFrom.y) * time,
    };
  }

  function snapshot(controller) {
    return {
      tick: controller.tick,
      jumpHeld: controller.jumpHeld,
      dashHeld: controller.dashHeld,
      jumpBuffer: controller.jumpBuffer,
      dashBuffer: controller.dashBuffer,
      coyote: controller.coyote,
      jumpHold: controller.jumpHold,
      airJumps: controller.airJumps,
      dashTimer: controller.dashTimer,
      dashAge: controller.dashAge,
      lastJumpType: controller.lastJumpType,
    };
  }

  const api = Object.freeze({
    DEFAULTS,
    createController,
    resetController,
    pressJump,
    releaseJump,
    pressDash,
    releaseDash,
    clearInput,
    step,
    land,
    sweptTopLanding,
    snapshot,
  });

  globalScope.VoltMovement = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

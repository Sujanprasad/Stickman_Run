import { Player, KeyState, Particle, MotionGhost, GrapplePoint } from './types.ts';
import {
  PHYSICS,
  DASH_CONFIG,
  GRAPPLE_CONFIG,
  findNearestGrapplePoint,
  updateGrapplePhysics,
  lerp,
} from './physics.ts';

export function createInitialPlayer(): Player {
  return {
    x: 0,
    y: 380,
    width: 22,
    height: 52,
    vx: 0,
    vy: 0,
    isGrounded: true,
    wasGrounded: true,
    facing: 'right',
    animState: 'idle',
    animTimer: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    squishX: 1,
    squishY: 1,
    stepSoundTimer: 0,
    // Death state
    isDead: false,
    deathTimer: 0,
    deathRotation: 0,
    deathCause: null,
    // Dash state
    dash: {
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      dashDirection: 'right',
      trailSpawnTimer: 0,
    },
    // Grapple state
    grapple: {
      isGrappling: false,
      targetPoint: null,
      grappleTimer: 0,
      grappleCooldownTimer: 0,
      ropeAttachAnim: 0,
      initialDistance: 0,
    },
  };
}

export function triggerPlayerDash(player: Player, onDashSuccess?: () => void): boolean {
  if (player.isDead || player.dash.isDashing || player.dash.dashCooldownTimer > 0) {
    return false;
  }

  // If grappling, detach cleanly before dashing
  if (player.grapple.isGrappling) {
    releasePlayerGrapple(player, undefined, false);
  }

  player.dash.isDashing = true;
  player.dash.dashTimer = DASH_CONFIG.DURATION;
  player.dash.dashCooldownTimer = DASH_CONFIG.COOLDOWN;
  player.dash.dashDirection = player.facing;
  player.dash.trailSpawnTimer = 0;

  // Horizontal burst velocity
  player.vx = (player.facing === 'right' ? 1 : -1) * DASH_CONFIG.SPEED;
  player.vy = 0; // Float horizontally during dash window

  // Visual stretch for sense of speed
  player.squishX = DASH_CONFIG.STRETCH_X;
  player.squishY = DASH_CONFIG.STRETCH_Y;

  if (onDashSuccess) {
    onDashSuccess();
  }
  return true;
}

/**
 * Initiates the grapple hook attachment to the nearest target anchor
 */
export function triggerPlayerGrapple(
  player: Player,
  grapplePoints: GrapplePoint[],
  onGrappleSuccess?: () => void,
  onNoTarget?: () => void
): boolean {
  if (player.isDead) return false;

  // If already grappling, pressing grapple button releases it!
  if (player.grapple.isGrappling) {
    releasePlayerGrapple(player, undefined, true);
    return false;
  }

  // Prevent repeated grappling if still on cooldown
  if (player.grapple.grappleCooldownTimer > 0) {
    return false;
  }

  const target = findNearestGrapplePoint(player, grapplePoints);
  if (!target) {
    // Subtle no-target feedback, cooldown is NOT consumed
    if (onNoTarget) {
      onNoTarget();
    }
    return false;
  }

  player.grapple.isGrappling = true;
  player.grapple.targetPoint = target;
  player.grapple.grappleTimer = 0;
  player.grapple.ropeAttachAnim = 0.2;
  player.grapple.initialDistance = Math.hypot(
    target.x - player.x,
    target.y - (player.y - player.height * 0.65)
  );

  // If player was dashing, terminate dash so grapple takes priority
  if (player.dash.isDashing) {
    player.dash.isDashing = false;
    player.dash.dashTimer = 0;
  }

  // Visual dynamic stretch
  player.squishX = 0.85;
  player.squishY = 1.15;
  player.isGrounded = false;

  if (onGrappleSuccess) {
    onGrappleSuccess();
  }
  return true;
}

/**
 * Releases the active grapple hook connection
 */
export function releasePlayerGrapple(
  player: Player,
  onRelease?: () => void,
  applyBoost: boolean = true
): void {
  if (!player.grapple.isGrappling) return;

  player.grapple.isGrappling = false;
  player.grapple.targetPoint = null;
  player.grapple.grappleCooldownTimer = GRAPPLE_CONFIG.COOLDOWN;

  if (applyBoost && !player.isDead) {
    // Preserve forward swing momentum + add forward jump boost
    player.vx = Math.max(player.vx + GRAPPLE_CONFIG.RELEASE_FORWARD_BOOST, 340);
    // Upward leap so the player can land cleanly on target platform
    player.vy = Math.min(player.vy, GRAPPLE_CONFIG.RELEASE_UPWARD_BOOST);
  }

  if (onRelease) {
    onRelease();
  }
}

export function triggerPlayerDeath(player: Player, cause: 'spike' | 'void'): void {
  if (player.isDead) return;

  // Cancel any active dash or grapple on death
  player.dash.isDashing = false;
  player.dash.dashTimer = 0;
  player.grapple.isGrappling = false;
  player.grapple.targetPoint = null;

  player.isDead = true;
  player.deathCause = cause;
  player.animState = 'dead';
  player.deathTimer = 0;
  player.deathRotation = 0;

  if (cause === 'spike') {
    const knockDir = player.facing === 'right' ? -1 : 1;
    player.vx = knockDir * 160;
    player.vy = -320;
  } else {
    player.vx *= 0.2;
    player.vy = -150;
  }
}

export function updatePlayerDeath(player: Player, dt: number): void {
  if (!player.isDead) return;

  player.deathTimer += dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.vx = lerp(player.vx, 0, dt * 2.0);
  player.vy = Math.min(player.vy + PHYSICS.GRAVITY * 0.95 * dt, PHYSICS.MAX_FALL_SPEED);

  const spinSpeed = player.vx >= 0 ? 5.5 : -5.5;
  player.deathRotation += spinSpeed * dt;
}

export function updatePlayerInputAndPhysics(
  player: Player,
  keys: KeyState,
  grapplePoints: GrapplePoint[],
  dt: number,
  targetRunSpeed: number,
  onJump?: () => void,
  onDash?: () => void,
  onGrappleAttach?: () => void,
  onGrappleRelease?: () => void,
  onGrappleNoTarget?: () => void
): void {
  if (player.isDead) {
    updatePlayerDeath(player, dt);
    return;
  }

  // Player in auto-runner always faces right
  player.facing = 'right';

  // Update dash cooldown timer
  if (player.dash.dashCooldownTimer > 0) {
    player.dash.dashCooldownTimer = Math.max(0, player.dash.dashCooldownTimer - dt);
  }

  // Update grapple cooldown timer
  if (player.grapple.grappleCooldownTimer > 0) {
    player.grapple.grappleCooldownTimer = Math.max(0, player.grapple.grappleCooldownTimer - dt);
  }

  // Check grapple trigger (one press = grapple / release)
  if (keys.grapplePressedThisFrame) {
    if (player.grapple.isGrappling) {
      releasePlayerGrapple(player, onGrappleRelease, true);
    } else if (player.grapple.grappleCooldownTimer <= 0) {
      triggerPlayerGrapple(player, grapplePoints, onGrappleAttach, onGrappleNoTarget);
    }
  }

  // Check dash trigger (one press = one dash)
  if (keys.dashPressedThisFrame) {
    triggerPlayerDash(player, onDash);
  }

  // 1. ACTIVE DASH BEHAVIOR
  if (player.dash.isDashing) {
    player.dash.dashTimer -= dt;

    // Lock horizontal speed to dash velocity in forward direction
    player.vx = DASH_CONFIG.SPEED;
    player.vy = 0; // Float horizontally during dash

    // When dash finishes, return smoothly to current auto-runner speed
    if (player.dash.dashTimer <= 0) {
      player.dash.isDashing = false;
      player.vx = targetRunSpeed;
    }

    // Return stretch to normal scale
    player.squishX = lerp(player.squishX, 1.0, dt * 10);
    player.squishY = lerp(player.squishY, 1.0, dt * 10);

    player.animState = 'running';
    player.animTimer += dt * 18;
    return;
  }

  // 2. ACTIVE GRAPPLE SWING BEHAVIOR
  if (player.grapple.isGrappling) {
    // If player hits max duration (~2.0 seconds), auto-release the rope
    if (player.grapple.grappleTimer >= GRAPPLE_CONFIG.MAX_DURATION) {
      releasePlayerGrapple(player, onGrappleRelease, true);
    } else {
      updateGrapplePhysics(player, dt, targetRunSpeed);
      player.animState = 'jumping';
      player.animTimer += dt * 8;
      player.isGrounded = false;
      player.coyoteTimer = 0;
    }

    // Jumping while grappling cleanly releases with upward jump impulse
    if (keys.jumpPressedThisFrame) {
      releasePlayerGrapple(player, onGrappleRelease, true);
      player.vy = -PHYSICS.JUMP_IMPULSE;
      if (onJump) onJump();
    }
    return;
  }

  // 3. AUTOMATIC CONSTANT FORWARD MOVEMENT
  player.vx = targetRunSpeed;

  // Coyote time (leniency after leaving platform edge)
  if (player.isGrounded) {
    player.coyoteTimer = PHYSICS.COYOTE_TIME;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  // Jump buffer timer
  if (keys.jumpPressedThisFrame) {
    player.jumpBufferTimer = PHYSICS.JUMP_BUFFER_TIME;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }

  // Trigger jump (strictly 1 jump: only when grounded or within coyote time)
  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = -PHYSICS.JUMP_IMPULSE;
    player.isGrounded = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;

    player.squishX = 0.8;
    player.squishY = 1.25;

    if (onJump) {
      onJump();
    }
  }

  // Variable jump height: releasing jump cuts upward momentum
  if (!keys.jump && player.vy < -PHYSICS.MIN_JUMP_IMPULSE) {
    player.vy = -PHYSICS.MIN_JUMP_IMPULSE;
  }

  // Apply gravity (heavier gravity on fall for snappy platforming)
  const gravityMult = player.vy > 0 ? PHYSICS.FALL_GRAVITY_MULT : 1.0;
  player.vy = Math.min(player.vy + PHYSICS.GRAVITY * gravityMult * dt, PHYSICS.MAX_FALL_SPEED);

  // Return squish to 1.0 smoothly
  player.squishX = lerp(player.squishX, 1.0, dt * PHYSICS.SQUISH_SPEED);
  player.squishY = lerp(player.squishY, 1.0, dt * PHYSICS.SQUISH_SPEED);

  // Animation state update: limb frequency scales directly with current speed!
  if (!player.isGrounded) {
    player.animState = player.vy < 0 ? 'jumping' : 'falling';
    player.animTimer += dt * 5;
  } else {
    player.animState = 'running';
    player.animTimer += dt * (player.vx / 18);
  }
}

/**
 * Creates landing dust particles
 */
export function createLandingDust(x: number, y: number, count: number = 6): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * 1.6;
    const speed = 40 + Math.random() * 80;
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y - 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.4,
      size: 2 + Math.random() * 2.5,
      life: 0,
      maxLife: 0.25 + Math.random() * 0.2,
      color: '#94a3b8',
      alpha: 0.8,
    });
  }
  return particles;
}

/**
 * Creates jump dust particles
 */
export function createJumpDust(x: number, y: number): Particle[] {
  return createLandingDust(x, y, 4);
}

/**
 * Creates electric cyan particles during dash
 */
export function createDashParticles(
  x: number,
  y: number,
  facing: 'left' | 'right',
  count: number = 6
): Particle[] {
  const particles: Particle[] = [];
  const dir = facing === 'right' ? -1 : 1;
  for (let i = 0; i < count; i++) {
    const speed = 120 + Math.random() * 180;
    const angle = (facing === 'right' ? Math.PI : 0) + (Math.random() - 0.5) * 0.5;
    particles.push({
      x: x + dir * 6 + (Math.random() - 0.5) * 6,
      y: y - 10 - Math.random() * 32,
      vx: Math.cos(angle) * speed,
      vy: (Math.random() - 0.5) * 40,
      size: 2.2 + Math.random() * 2.4,
      life: 0,
      maxLife: 0.18 + Math.random() * 0.12,
      color: Math.random() > 0.35 ? '#38bdf8' : '#7dd3fc',
      alpha: 0.85,
    });
  }
  return particles;
}

/**
 * Creates bright sparks when grapple hook latches to anchor
 */
export function createGrappleSparkParticles(x: number, y: number, count: number = 10): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 110;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 2.2,
      life: 0,
      maxLife: 0.24 + Math.random() * 0.16,
      color: Math.random() > 0.4 ? '#38bdf8' : '#ffffff',
      alpha: 0.95,
    });
  }
  return particles;
}

/**
 * Creates death explosion particles
 */
export function createDeathParticles(x: number, y: number, count: number = 24): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 260;
    particles.push({
      x,
      y: y - 26,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      size: 2.5 + Math.random() * 3.5,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.35,
      color: Math.random() > 0.5 ? '#ef4444' : '#f87171',
      alpha: 1.0,
    });
  }
  return particles;
}

/**
 * Creates golden sparkles when collecting coins
 */
export function createCoinCollectParticles(x: number, y: number, count: number = 14): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      size: 2.5 + Math.random() * 2.5,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.25,
      color: Math.random() > 0.3 ? '#facc15' : '#fef08a',
      alpha: 0.9,
    });
  }
  return particles;
}

/**
 * Draws afterimage motion ghosts during dash
 */
export function drawMotionGhost(ctx: CanvasRenderingContext2D, ghost: MotionGhost): void {
  ctx.save();
  ctx.translate(ghost.x, ghost.y);

  const isLeft = ghost.facing === 'left';
  const flip = isLeft ? -1 : 1;
  const progress = ghost.life / ghost.maxLife;
  const currentAlpha = (1 - progress) * ghost.alpha;

  ctx.strokeStyle = `rgba(56, 189, 248, ${currentAlpha})`;
  ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.6})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const totalH = 52;
  const headRadius = 6.5;
  const headCenterY = -totalH + headRadius;
  const neckY = headCenterY + headRadius + 2;
  const hipY = -20;

  ctx.beginPath();
  ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, neckY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // Draw streamlined dash limbs for ghost
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(-6 * flip, -10);
  ctx.lineTo(-14 * flip, 0);
  ctx.moveTo(0, hipY);
  ctx.lineTo(-2 * flip, -10);
  ctx.lineTo(-8 * flip, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, neckY + 3);
  ctx.lineTo(-8 * flip, neckY + 12);
  ctx.lineTo(-16 * flip, neckY + 16);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the stickman player on the canvas
 */
export function drawStickman(ctx: CanvasRenderingContext2D, player: Player): void {
  ctx.save();

  // Position at feet center
  ctx.translate(player.x, player.y);

  // If dead, apply pivot rotation around center of body
  if (player.isDead) {
    const centerY = -player.height / 2;
    ctx.translate(0, centerY);
    ctx.rotate(player.deathRotation);
    ctx.translate(0, -centerY);
  } else {
    // Apply squish/stretch
    ctx.scale(player.squishX, player.squishY);
  }

  const isLeft = player.facing === 'left';
  const flip = isLeft ? -1 : 1;

  // Styling based on state: electric cyan when dashing/grappling, red flash when dead, white normally
  const isDashing = player.dash.isDashing;
  const isGrappling = player.grapple.isGrappling;
  const isDeathFlashing = player.isDead && player.deathTimer < 0.2;

  let strokeColor = '#f8fafc';
  let fillColor = '#f8fafc';

  if (isDeathFlashing) {
    strokeColor = '#ef4444';
    fillColor = '#ef4444';
  } else if (isDashing || isGrappling) {
    strokeColor = '#7dd3fc';
    fillColor = '#38bdf8';
  }

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = isDashing || isGrappling ? 3.6 : 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const t = player.animTimer;

  // Stickman dimensions
  const totalH = player.height;
  const headRadius = 6.5;
  const headCenterY = -totalH + headRadius;
  const neckY = headCenterY + headRadius + 2;
  const hipY = -20;

  // Head
  ctx.beginPath();
  ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Eye / Visor or Death "X"
  if (player.isDead) {
    const eyeX = flip * (headRadius * 0.4);
    const eyeY = headCenterY - 0.5;
    const r = 2;
    ctx.beginPath();
    ctx.moveTo(eyeX - r, eyeY - r);
    ctx.lineTo(eyeX + r, eyeY + r);
    ctx.moveTo(eyeX + r, eyeY - r);
    ctx.lineTo(eyeX - r, eyeY + r);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.lineWidth = 3.2;
  } else {
    ctx.beginPath();
    ctx.arc(flip * (headRadius * 0.45), headCenterY - 0.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spine / Torso (leans forward during dash or swing)
  ctx.beginPath();
  ctx.moveTo(isDashing ? 4 * flip : 0, neckY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // Determine limb angles based on state
  let leftLegAngle = 0;
  let rightLegAngle = 0;
  let leftKneeBend = 0;
  let rightKneeBend = 0;

  let leftArmAngle = 0;
  let rightArmAngle = 0;
  let leftElbowBend = 0;
  let rightElbowBend = 0;

  if (player.isDead) {
    leftLegAngle = -0.7;
    rightLegAngle = 0.8;
    leftKneeBend = 0.5;
    rightKneeBend = 0.6;

    leftArmAngle = -1.8;
    rightArmAngle = 1.6;
    leftElbowBend = 0.8;
    rightElbowBend = 0.7;
  } else if (isDashing) {
    // Streamlined aerodynamic dash pose
    leftLegAngle = -0.9;
    rightLegAngle = -0.6;
    leftKneeBend = 0.7;
    rightKneeBend = 0.5;

    leftArmAngle = -1.6;
    rightArmAngle = -1.4;
    leftElbowBend = 0.2;
    rightElbowBend = 0.3;
  } else if (isGrappling && player.grapple.targetPoint) {
    // Dynamic grappling pose: front arm stretches directly towards target anchor
    const target = player.grapple.targetPoint;
    const shoulderX = 0;
    const shoulderY = neckY + 3;
    const worldShoulderX = player.x + shoulderX;
    const worldShoulderY = player.y + shoulderY;

    const dx = (target.x - worldShoulderX) * flip;
    const dy = target.y - worldShoulderY;
    // In local limb coords: angle 0 is straight down, angle PI/2 is back, angle -PI/2 is forward
    const aimAngle = Math.atan2(dx, dy);

    rightArmAngle = aimAngle;
    rightElbowBend = 0.04;

    leftArmAngle = aimAngle * 0.7 - 0.4;
    leftElbowBend = 0.35;

    leftLegAngle = -0.4;
    rightLegAngle = 0.3;
    leftKneeBend = 0.65;
    rightKneeBend = 0.45;
  } else if (player.animState === 'running') {
    const cycle = Math.sin(t);
    const cosCycle = Math.cos(t);

    leftLegAngle = cycle * 0.85;
    rightLegAngle = -cycle * 0.85;

    leftKneeBend = Math.max(0, -cosCycle) * 0.9;
    rightKneeBend = Math.max(0, cosCycle) * 0.9;

    leftArmAngle = -cycle * 0.75;
    rightArmAngle = cycle * 0.75;
    leftElbowBend = 0.5 + Math.abs(cycle) * 0.3;
    rightElbowBend = 0.5 + Math.abs(cycle) * 0.3;
  } else if (player.animState === 'jumping') {
    leftLegAngle = -0.3;
    rightLegAngle = 0.4;
    leftKneeBend = 0.9;
    rightKneeBend = 0.7;

    leftArmAngle = -1.4;
    rightArmAngle = -1.2;
    leftElbowBend = 0.4;
    rightElbowBend = 0.5;
  } else if (player.animState === 'falling') {
    leftLegAngle = -0.2;
    rightLegAngle = 0.2;
    leftKneeBend = 0.3;
    rightKneeBend = 0.3;

    leftArmAngle = -0.8;
    rightArmAngle = -0.8;
    leftElbowBend = 0.6;
    rightElbowBend = 0.6;
  } else {
    const breath = Math.sin(t) * 0.05;
    leftLegAngle = 0.1;
    rightLegAngle = -0.1;
    leftKneeBend = 0.05;
    rightKneeBend = 0.05;

    leftArmAngle = 0.25 + breath;
    rightArmAngle = -0.25 - breath;
    leftElbowBend = 0.2;
    rightElbowBend = 0.2;
  }

  // Draw Legs
  const thighLen = 11;
  const shinLen = 11;

  const drawLimb = (
    startX: number,
    startY: number,
    angle1: number,
    len1: number,
    angle2: number,
    len2: number
  ) => {
    const jointX = startX + Math.sin(angle1) * len1;
    const jointY = startY + Math.cos(angle1) * len1;
    const endX = jointX + Math.sin(angle1 + angle2) * len2;
    const endY = jointY + Math.cos(angle1 + angle2) * len2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(jointX, jointY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  };

  // Back leg
  drawLimb(
    0,
    hipY,
    leftLegAngle * flip,
    thighLen,
    leftKneeBend * flip,
    shinLen
  );

  // Front leg
  drawLimb(
    0,
    hipY,
    rightLegAngle * flip,
    thighLen,
    rightKneeBend * flip,
    shinLen
  );

  // Draw Arms
  const shoulderX = isDashing ? 3 * flip : 0;
  const shoulderY = neckY + 3;
  const upperArmLen = 10;
  const forearmLen = 9;

  // Back arm
  drawLimb(
    shoulderX,
    shoulderY,
    leftArmAngle * flip,
    upperArmLen,
    leftElbowBend * flip,
    forearmLen
  );

  // Front arm
  drawLimb(
    shoulderX,
    shoulderY,
    rightArmAngle * flip,
    upperArmLen,
    rightElbowBend * flip,
    forearmLen
  );

  ctx.restore();
}

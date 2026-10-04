import { Coin, GameDifficulty, GrapplePoint, Player, Rect, Spike } from './types.ts';

// Physics constants tuned for crisp, responsive platforming
export const PHYSICS = {
  GRAVITY: 1600,             // Pixels per second squared
  FALL_GRAVITY_MULT: 1.35,   // Higher gravity when falling for snappy game feel
  MOVE_SPEED: 340,           // Max horizontal run speed (px/sec)
  ACCELERATION: 2400,        // Horizontal ground acceleration
  AIR_ACCELERATION: 1600,    // Horizontal air control acceleration
  FRICTION: 2200,            // Ground deceleration when no key pressed
  AIR_DRAG: 500,             // Air deceleration
  JUMP_IMPULSE: 620,         // Initial jump velocity (upwards)
  MIN_JUMP_IMPULSE: 320,     // Variable jump height if jump key released early
  MAX_FALL_SPEED: 1100,      // Terminal downward velocity
  COYOTE_TIME: 0.12,         // Allowed seconds to jump after walking off a platform
  JUMP_BUFFER_TIME: 0.12,    // Allowed seconds to buffer a jump before touching ground
  SQUISH_SPEED: 8.0,         // Speed of returning to normal scale after squish/stretch
  VOID_FALL_LIMIT: 850,      // Y-coordinate beyond which the player falls into the abyss
} as const;

export interface DifficultySettings {
  name: GameDifficulty;
  label: string;
  description: string;
  startingSpeed: number;
  maxSpeed: number;
  accelerationRate: number;
  gapScale: number;
  platformWidthScale: number;
  safeSectionFrequency: number;
  spikeCountBonus: number;
  color: string;
}

export const DIFFICULTY_CONFIG: Record<GameDifficulty, DifficultySettings> = {
  EASY: {
    name: 'EASY',
    label: 'Easy',
    description: 'Relaxed speed and generous obstacles',
    startingSpeed: 240,
    maxSpeed: 380,
    accelerationRate: 1.1,
    gapScale: 0.85,
    platformWidthScale: 1.25,
    safeSectionFrequency: 2,
    spikeCountBonus: 0,
    color: '#22c55e',
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Medium',
    description: 'Balanced challenge',
    startingSpeed: 290,
    maxSpeed: 490,
    accelerationRate: 1.85,
    gapScale: 1.0,
    platformWidthScale: 1.0,
    safeSectionFrequency: 3,
    spikeCountBonus: 0,
    color: '#eab308',
  },
  HARD: {
    name: 'HARD',
    label: 'Hard',
    description: 'Fast reactions. No mistakes.',
    startingSpeed: 345,
    maxSpeed: 560,
    accelerationRate: 2.6,
    gapScale: 1.12,
    platformWidthScale: 0.9,
    safeSectionFrequency: 5,
    spikeCountBonus: 1,
    color: '#ef4444',
  },
};

// Fallback constant for backwards compatibility
export const AUTO_RUNNER_CONFIG = {
  STARTING_SPEED: 290,
  MAX_SPEED: 490,
  ACCELERATION_RATE: 1.85,
  DIFFICULTY_INTERVAL: 30,
} as const;

/**
 * Calculates smooth forward run speed based on survival time and difficulty setting
 */
export function calculateRunSpeed(elapsedTime: number, difficulty: GameDifficulty = 'MEDIUM'): number {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.MEDIUM;
  return Math.min(
    cfg.maxSpeed,
    cfg.startingSpeed + elapsedTime * cfg.accelerationRate
  );
}

// Dash ability configuration: easily tunable in one central location
export const DASH_CONFIG = {
  SPEED: 820,                // Horizontal burst velocity during dash (px/s)
  DURATION: 0.18,            // Dash duration in seconds (0.15 - 0.25s)
  COOLDOWN: 1.2,             // Dash cooldown in seconds
  TRAIL_INTERVAL: 0.026,     // Time between afterimage ghosts (seconds)
  TRAIL_LIFETIME: 0.22,      // Lifetime of afterimage ghost trails (seconds)
  SHAKE_INTENSITY: 4.5,      // Screen shake amount on dash activation
  SHAKE_DURATION: 0.14,      // Screen shake duration
  STRETCH_X: 1.35,           // Horizontal stretch factor during dash
  STRETCH_Y: 0.75,           // Vertical squish factor during dash
} as const;

// Grapple Hook ability configuration: generous, reliable, and tuned for responsive platforming
export const GRAPPLE_CONFIG = {
  RANGE: 340,                // Generous detection radius (250-350px world scale)
  MAX_DURATION: 2.0,         // Maximum grapple duration in seconds before auto-release
  COOLDOWN: 1.2,             // Cooldown in seconds after release
  PULL_FORCE: 2100,          // Inward pull acceleration toward anchor (px/s²)
  SWING_TANGENT_BOOST: 950,  // Forward swing acceleration along tangent (px/s²)
  MAX_SWING_SPEED: 700,      // Max velocity clamp during grapple swing
  RELEASE_FORWARD_BOOST: 140,// Generous forward boost upon releasing grapple
  RELEASE_UPWARD_BOOST: -180,// Upward leap upon releasing grapple for clean landing
  ATTACH_ANIM_SPEED: 20.0,   // Rapid line shoot-out animation speed
  SHAKE_INTENSITY: 3.0,      // Subtle screen shake on attach
  SHAKE_DURATION: 0.12,      // Shake duration
} as const;

export const DEBUG_GRAPPLE = false;

/**
 * Clamps a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Axis-Aligned Bounding Box (AABB) intersection check
 */
export function rectsIntersect(r1: Rect, r2: Rect): boolean {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/**
 * Tests collision between player and a triangular spike.
 * The triangle has base (spike.x to spike.x + spike.width at spike.y)
 * and apex at (spike.x + spike.width/2, spike.y - spike.height).
 * Incorporates a subtle 2px forgiveness margin for fair, satisfying platforming.
 */
export function checkPlayerSpikeCollision(player: Player, spike: Spike): boolean {
  // Player bounds (with 2px inner margin)
  const pMargin = 2;
  const pLeft = player.x - player.width / 2 + pMargin;
  const pRight = player.x + player.width / 2 - pMargin;
  const pTop = player.y - player.height + pMargin;
  const pBottom = player.y;

  // Spike bounds
  const sLeft = spike.x;
  const sRight = spike.x + spike.width;
  const sTop = spike.y - spike.height;
  const sBottom = spike.y;

  // Bounding box test first
  if (pRight < sLeft || pLeft > sRight || pBottom < sTop || pTop > sBottom) {
    return false;
  }

  // Check if spike apex is inside player box
  const apexX = spike.x + spike.width / 2;
  const apexY = sTop;
  if (apexX >= pLeft && apexX <= pRight && apexY >= pTop && apexY <= pBottom) {
    return true;
  }

  // Check sample points along the player's lower feet / body against triangular slope
  const samplePointsX = [pLeft, player.x, pRight];
  const halfW = spike.width / 2;

  for (const px of samplePointsX) {
    if (px >= sLeft && px <= sRight) {
      // Calculate top slope Y of the triangle at this X
      let triangleSlopeY: number;
      if (px < apexX) {
        triangleSlopeY = sBottom - ((px - sLeft) / halfW) * spike.height;
      } else {
        triangleSlopeY = sBottom - ((sRight - px) / halfW) * spike.height;
      }

      // If player's bottom touches or penetrates the triangle surface
      if (pBottom >= triangleSlopeY && pTop <= sBottom) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Tests collision between player bounding box and a circular coin
 */
export function checkPlayerCoinCollision(player: Player, coin: Coin): boolean {
  if (coin.collected) return false;

  const pLeft = player.x - player.width / 2;
  const pRight = player.x + player.width / 2;
  const pTop = player.y - player.height;
  const pBottom = player.y;

  // Find closest point on player rectangle to coin center
  const closestX = clamp(coin.x, pLeft, pRight);
  const closestY = clamp(coin.y, pTop, pBottom);

  const dx = coin.x - closestX;
  const dy = coin.y - closestY;

  return (dx * dx + dy * dy) <= (coin.radius * coin.radius);
}

/**
 * Searches for the nearest valid grapple point within a generous radius around the player.
 * Prioritizes points that are in front of and above the player, without requiring
 * pixel-perfect accuracy.
 */
export function findNearestGrapplePoint(
  player: Player,
  points: GrapplePoint[],
  range: number = GRAPPLE_CONFIG.RANGE
): GrapplePoint | null {
  let nearest: GrapplePoint | null = null;
  let minScore = Infinity;

  const playerHandX = player.x;
  const playerHandY = player.y - player.height * 0.65;

  for (const pt of points) {
    const dx = pt.x - playerHandX;
    const dy = pt.y - playerHandY;
    const dist = Math.hypot(dx, dy);

    // Only consider points within generous range
    if (dist > range) continue;

    // Ignore points that are significantly behind the player
    if (dx < -50) continue;

    // Intelligent heuristic scoring:
    // 1. Base distance
    let score = dist;

    // 2. Strong preference for points in front of player
    if (dx > 0) {
      score -= dx * 0.45;
    } else {
      score += Math.abs(dx) * 1.5;
    }

    // 3. Strong preference for overhead anchors (dy < 0)
    if (dy < 0) {
      score -= Math.abs(dy) * 0.3;
    } else {
      score += dy * 2.0; // Penalty for points below the player's waist
    }

    if (score < minScore) {
      minScore = score;
      nearest = pt;
    }
  }

  return nearest;
}

/**
 * Smooth grapple pulling and swing physics
 * Pulls player toward anchor with smooth momentum and forward swing assistance.
 */
export function updateGrapplePhysics(
  player: Player,
  dt: number,
  baseRunSpeed: number
): void {
  const g = player.grapple;
  if (!g.isGrappling || !g.targetPoint) return;

  g.grappleTimer += dt;
  if (g.ropeAttachAnim < 1.0) {
    g.ropeAttachAnim = Math.min(1.0, g.ropeAttachAnim + dt * GRAPPLE_CONFIG.ATTACH_ANIM_SPEED);
  }

  const anchorX = g.targetPoint.x;
  const anchorY = g.targetPoint.y;

  const playerHandX = player.x;
  const playerHandY = player.y - player.height * 0.65;

  const dx = anchorX - playerHandX;
  const dy = anchorY - playerHandY;
  const dist = Math.hypot(dx, dy);

  if (dist < 1) return;

  const dirX = dx / dist;
  const dirY = dy / dist;

  // Tangent vector perpendicular to line of rope
  const tangentX = -dirY;
  const tangentY = dirX;

  // 1. Inward pull force towards the anchor (spring tension)
  // When player has swung past the anchor (dx < 0), avoid pulling backward so forward momentum is preserved!
  const pullFactor = Math.max(0.65, Math.min(1.4, dist / 200));
  let pullAccX = dirX * GRAPPLE_CONFIG.PULL_FORCE * pullFactor;
  if (dx < 0) {
    // Player is ahead of anchor; do not fight their forward flight!
    pullAccX = Math.max(0, pullAccX * 0.2);
  }
  const pullAccY = dirY * GRAPPLE_CONFIG.PULL_FORCE * pullFactor;

  // 2. Forward swing boost along tangent
  const forwardTangSign = tangentX >= 0 ? 1 : -1;
  const swingAccX = (tangentX * forwardTangSign) * GRAPPLE_CONFIG.SWING_TANGENT_BOOST;
  const swingAccY = (tangentY * forwardTangSign) * GRAPPLE_CONFIG.SWING_TANGENT_BOOST;

  // Apply accelerations with reduced gravity while swinging
  player.vx += (pullAccX + swingAccX) * dt;
  player.vy += (pullAccY + swingAccY + PHYSICS.GRAVITY * 0.25) * dt;

  // Ensure forward auto-run momentum is rewarded and preserved
  if (player.vx < baseRunSpeed * 1.05) {
    player.vx = lerp(player.vx, baseRunSpeed * 1.15, 5.0 * dt);
  }

  // Clamp maximum swing velocity
  const currentSpeed = Math.hypot(player.vx, player.vy);
  if (currentSpeed > GRAPPLE_CONFIG.MAX_SWING_SPEED) {
    const scale = GRAPPLE_CONFIG.MAX_SWING_SPEED / currentSpeed;
    player.vx *= scale;
    player.vy *= scale;
  }
}

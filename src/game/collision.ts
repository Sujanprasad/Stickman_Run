import { Player, Platform, Rect } from './types.ts';
import { rectsIntersect } from './physics.ts';

export interface CollisionResult {
  landed: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

/**
 * Resolves player movement and collisions with all platforms using axis separation.
 * This prevents snagging on corners and reliably detects ground and ceilings.
 */
export function resolveMovementAndCollisions(
  player: Player,
  platforms: Platform[],
  dt: number
): CollisionResult {
  const result: CollisionResult = {
    landed: false,
    hitCeiling: false,
    hitWall: false,
  };

  // 1. HORIZONTAL MOVEMENT & COLLISION
  player.x += player.vx * dt;

  const playerBoxX: Rect = {
    x: player.x - player.width / 2,
    y: player.y - player.height,
    width: player.width,
    height: player.height,
  };

  for (const plat of platforms) {
    if (rectsIntersect(playerBoxX, plat)) {
      if (player.vx > 0) {
        // Moving right, hit left edge of platform
        player.x = plat.x - player.width / 2;
        player.vx = 0;
        result.hitWall = true;
      } else if (player.vx < 0) {
        // Moving left, hit right edge of platform
        player.x = plat.x + plat.width + player.width / 2;
        player.vx = 0;
        result.hitWall = true;
      }
      playerBoxX.x = player.x - player.width / 2;
    }
  }

  // 2. VERTICAL MOVEMENT & COLLISION
  player.y += player.vy * dt;

  const playerBoxY: Rect = {
    x: player.x - player.width / 2,
    y: player.y - player.height,
    width: player.width,
    height: player.height,
  };

  let onGround = false;

  for (const plat of platforms) {
    if (rectsIntersect(playerBoxY, plat)) {
      if (player.vy >= 0) {
        // Falling down, landed on platform top
        player.y = plat.y;
        player.vy = 0;
        onGround = true;
        result.landed = true;
      } else if (player.vy < 0) {
        // Moving up, hit platform bottom (ceiling)
        player.y = plat.y + plat.height + player.height;
        player.vy = 0;
        result.hitCeiling = true;
      }
      playerBoxY.y = player.y - player.height;
    }
  }

  // Ground check redundancy: if we didn't just land, check if feet are touching ground
  if (!onGround) {
    // Check 2 pixels beneath the feet
    const feetBox: Rect = {
      x: player.x - player.width / 2 + 3,
      y: player.y,
      width: player.width - 6,
      height: 3,
    };
    for (const plat of platforms) {
      if (rectsIntersect(feetBox, plat)) {
        onGround = true;
        break;
      }
    }
  }

  player.wasGrounded = player.isGrounded;
  player.isGrounded = onGround;

  return result;
}

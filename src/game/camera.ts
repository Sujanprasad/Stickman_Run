import { Camera, Player, Rect } from './types.ts';
import { lerp } from './physics.ts';

/**
 * Calculates adaptive zoom to preserve crisp details and appropriate field-of-view
 * across all screen sizes (small phones, large phones, tablets, desktops)
 * while strictly maintaining a 1:1 world aspect ratio (zero distortion).
 */
export function calculateAdaptiveZoom(viewportWidth: number, viewportHeight: number): number {
  const isPortrait = viewportHeight > viewportWidth;

  if (isPortrait) {
    // Narrow vertical screen (e.g. mobile phone in portrait: 360px - 430px)
    // Scale smoothly so stickman is appropriately sized and obstacles ahead are visible
    const widthRatio = viewportWidth / 440;
    return Math.min(1.0, Math.max(0.72, widthRatio));
  } else {
    // Landscape / Desktop screen (height: 360px - 1080px+)
    const heightRatio = viewportHeight / 520;
    return Math.min(1.15, Math.max(0.70, heightRatio));
  }
}

export function createCamera(viewportWidth: number, viewportHeight: number): Camera {
  const zoom = calculateAdaptiveZoom(viewportWidth, viewportHeight);
  return {
    x: 0,
    y: 350,
    targetX: 0,
    targetY: 350,
    viewportWidth,
    viewportHeight,
    zoom,
    shakeIntensity: 0,
    shakeDuration: 0,
    shakeTimer: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0,
  };
}

export function triggerCameraShake(camera: Camera, intensity = 8, duration = 0.35): void {
  camera.shakeIntensity = intensity;
  camera.shakeDuration = duration;
  camera.shakeTimer = duration;
}

export function updateCamera(camera: Camera, player: Player, dt: number): void {
  // If player is dead, don't move camera rapidly to follow the fall, stay relatively anchored
  if (!player.isDead) {
    const isPortrait = camera.viewportHeight > camera.viewportWidth;
    // In portrait, keep player ~22% from left so there's ample forward runway for obstacles
    // In landscape, ~28% from left
    const playerRatio = isPortrait ? 0.22 : 0.28;
    const worldVisibleWidth = camera.viewportWidth / camera.zoom;
    const lookAheadX = worldVisibleWidth * (0.5 - playerRatio);
    const targetX = player.x + Math.max(70, lookAheadX);

    // Vertical framing: keep stickman slightly below center so landing platforms are visible
    const targetY = player.y - (camera.viewportHeight / camera.zoom) * 0.10;

    const lerpFactorX = Math.min(1.0, 9.5 * dt);
    const lerpFactorY = Math.min(1.0, 6.0 * dt);

    camera.x = lerp(camera.x, targetX, lerpFactorX);
    camera.y = lerp(camera.y, targetY, lerpFactorY);
  }

  // Handle camera shake decay
  if (camera.shakeTimer > 0) {
    camera.shakeTimer -= dt;
    const progress = Math.max(0, camera.shakeTimer / camera.shakeDuration);
    const currentIntensity = camera.shakeIntensity * progress;
    camera.shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    camera.shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
  } else {
    camera.shakeOffsetX = 0;
    camera.shakeOffsetY = 0;
  }
}

/**
 * Returns world-space bounding box of the current camera view (with padding)
 */
export function getCameraVisibleBounds(camera: Camera, padding = 100): Rect {
  const halfW = (camera.viewportWidth / (2 * camera.zoom)) + padding;
  const halfH = (camera.viewportHeight / (2 * camera.zoom)) + padding;
  return {
    x: camera.x - halfW,
    y: camera.y - halfH,
    width: halfW * 2,
    height: halfH * 2,
  };
}

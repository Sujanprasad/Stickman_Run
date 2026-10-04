import { Camera, Checkpoint, Coin, FinishLine, FloatingText, GrapplePoint, MotionGhost, Particle, Platform, Player, Rect, Spike } from './types.ts';
import { getCameraVisibleBounds } from './camera.ts';
import { findNearestGrapplePoint, lerp, rectsIntersect } from './physics.ts';
import { drawStickman, drawMotionGhost } from './player.ts';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  player: Player,
  platforms: Platform[],
  spikes: Spike[],
  coins: Coin[],
  floatingTexts: FloatingText[],
  particles: Particle[],
  ghosts: MotionGhost[],
  camera: Camera,
  gameTime: number,
  currentRunSpeed: number = 290,
  grapplePoints: GrapplePoint[] = [],
  checkpoints: Checkpoint[] = [],
  finishLine: FinishLine | null = null
): void {
  const width = camera.viewportWidth;
  const height = camera.viewportHeight;

  // 1. Clear background with deep modern dark color
  ctx.fillStyle = '#080a0f';
  ctx.fillRect(0, 0, width, height);

  // 2. Parallax background grid & subtle geometric accents
  drawBackgroundParallax(ctx, camera, width, height);

  // Ambient speed lines at high speeds
  drawAmbientSpeedLines(ctx, width, height, currentRunSpeed, gameTime);

  // 3. World Space Transform (with camera screen shake)
  ctx.save();
  ctx.translate(
    width / 2 + camera.shakeOffsetX,
    height / 2 + camera.shakeOffsetY
  );
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  const visibleBounds = getCameraVisibleBounds(camera, 150);

  // 4. Draw Platforms
  for (const plat of platforms) {
    if (!rectsIntersect(plat, visibleBounds)) continue;
    drawPlatform(ctx, plat);
  }

  // 5. Draw Spikes
  for (const spike of spikes) {
    const spikeRect: Rect = {
      x: spike.x,
      y: spike.y - spike.height,
      width: spike.width,
      height: spike.height,
    };
    if (!rectsIntersect(spikeRect, visibleBounds)) continue;
    drawSpike(ctx, spike);
  }

  // 6. Draw Collectible Coins
  for (const coin of coins) {
    if (coin.collected) continue;
    const coinRect: Rect = {
      x: coin.x - coin.radius - 5,
      y: coin.y - coin.radius - 5,
      width: (coin.radius + 5) * 2,
      height: (coin.radius + 5) * 2,
    };
    if (!rectsIntersect(coinRect, visibleBounds)) continue;
    drawCoin(ctx, coin, gameTime);
  }

  // 6.5. Draw Grapple Anchors & Targeting Reticles
  const targetedPoint =
    !player.grapple.isGrappling && player.grapple.grappleCooldownTimer <= 0
      ? findNearestGrapplePoint(player, grapplePoints)
      : null;

  // 6.6. Draw faint targeting guide line toward preferred target anchor
  if (targetedPoint && !player.isDead) {
    drawGrappleTargetingLine(ctx, player, targetedPoint, gameTime);
  }

  for (const pt of grapplePoints) {
    const isTargeted = targetedPoint?.id === pt.id;
    const isHooked = player.grapple.targetPoint?.id === pt.id;
    drawGrapplePoint(ctx, pt, isTargeted, isHooked, gameTime);
  }

  // 6.8. Draw Grapple Rope
  if (player.grapple.isGrappling && player.grapple.targetPoint) {
    drawGrappleRope(ctx, player, player.grapple.targetPoint, player.grapple.ropeAttachAnim, gameTime);
  }

  // 6.9. Draw Checkpoints
  for (const cp of checkpoints) {
    drawCheckpoint(ctx, cp, gameTime);
  }

  // 6.95. Draw Finish Line Archway
  if (finishLine) {
    drawFinishLine(ctx, finishLine, gameTime);
  }

  // 7. Draw Afterimage Motion Ghost Trails
  for (const ghost of ghosts) {
    drawMotionGhost(ctx, ghost);
  }

  // 8. Draw Dash Speed Lines
  if (player.dash.isDashing) {
    drawDashSpeedLines(ctx, player);
  }

  // 9. Draw Particles (dust, spark, coin bursts, dash streaks)
  drawParticles(ctx, particles);

  // 10. Draw Player (Stickman)
  drawStickman(ctx, player);

  // 11. Draw Floating Score Text Popups in World Space
  drawFloatingTexts(ctx, floatingTexts);

  // 12. Subtle void danger gradient at bottom
  drawVoidGradient(ctx, visibleBounds);

  ctx.restore();

  // 13. Death screen flash effect
  if (player.isDead && player.deathTimer < 0.28) {
    const flashAlpha = (1 - player.deathTimer / 0.28) * 0.25;
    ctx.save();
    ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

/**
 * Minimalist geometric parallax grid
 */
function drawBackgroundParallax(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number
): void {
  ctx.save();

  // Subtle grid lines with slow parallax
  const gridSize = 80;
  const parallaxSpeed = 0.25;

  const offsetX = -(camera.x * parallaxSpeed) % gridSize;
  const offsetY = -(camera.y * parallaxSpeed) % gridSize;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = offsetX - gridSize; x < width + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = offsetY - gridSize; y < height + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Ambient soft radial glow in center-top
  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.35,
    50,
    width * 0.5,
    height * 0.35,
    width * 0.6
  );
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Draws an individual platform with modern sleek styling
 */
function drawPlatform(ctx: CanvasRenderingContext2D, plat: Platform): void {
  ctx.save();

  const isMilestone = plat.type === 'milestone';
  const isStart = plat.type === 'start';
  const isMoving = plat.type === 'moving' || plat.isMoving;

  // Base platform body
  ctx.fillStyle =
    plat.color ||
    (isStart ? '#151d2a' : isMilestone ? '#161c28' : isMoving ? '#0f1f26' : '#111622');
  ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

  // Subtle platform outline
  ctx.strokeStyle = isMoving ? 'rgba(45, 212, 191, 0.3)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

  // Luminous top edge line (where the stickman runs)
  const topColor =
    plat.borderColor ||
    (isStart ? '#38bdf8' : isMilestone ? '#a855f7' : isMoving ? '#2dd4bf' : '#94a3b8');
  ctx.strokeStyle = topColor;
  ctx.lineWidth = isMoving ? 3 : 2.5;
  ctx.beginPath();
  ctx.moveTo(plat.x, plat.y);
  ctx.lineTo(plat.x + plat.width, plat.y);
  ctx.stroke();

  // Subtle top glow line
  ctx.strokeStyle = topColor;
  ctx.globalAlpha = isMoving ? 0.35 : 0.25;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(plat.x, plat.y + 1);
  ctx.lineTo(plat.x + plat.width, plat.y + 1);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Milestone or Start label or moving indicator
  if (plat.label) {
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = topColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(plat.label, plat.x + plat.width / 2, plat.y + Math.min(22, plat.height / 2));
  } else if (isMoving) {
    ctx.fillStyle = topColor;
    ctx.globalAlpha = 0.75;
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↕', plat.x + plat.width / 2, plat.y + 18);
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();
}

/**
 * Draws a sharp triangular spike hazard
 */
function drawSpike(ctx: CanvasRenderingContext2D, spike: Spike): void {
  ctx.save();

  const left = spike.x;
  const right = spike.x + spike.width;
  const base = spike.y;
  const apexX = spike.x + spike.width / 2;
  const apexY = spike.y - spike.height;

  // Triangular path
  ctx.beginPath();
  ctx.moveTo(left, base);
  ctx.lineTo(apexX, apexY);
  ctx.lineTo(right, base);
  ctx.closePath();

  // Dark crimson gradient fill
  const grad = ctx.createLinearGradient(0, apexY, 0, base);
  grad.addColorStop(0, '#5f121d');
  grad.addColorStop(1, '#20080d');
  ctx.fillStyle = grad;
  ctx.fill();

  // Dangerous bright red glowing stroke
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  // Outer subtle red glow around the apex
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Highlight gleam on apex tip
  ctx.beginPath();
  ctx.arc(apexX, apexY + 2, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = '#fecaca';
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a glowing, rotating collectible coin with subtle floating animation
 */
function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin, time: number): void {
  ctx.save();

  // Floating bob animation
  const floatOffset = Math.sin(time * 3.5 + coin.animPhase) * 4.5;
  const currentY = coin.baseY + floatOffset;

  // Update animated Y coordinate for accurate hit testing
  coin.y = currentY;

  // 3D-like spinning scale
  const rawSpin = Math.cos(time * 4.2 + coin.animPhase);
  const scaleX = Math.abs(rawSpin) < 0.12 ? (rawSpin >= 0 ? 0.12 : -0.12) : rawSpin;
  const absScaleX = Math.abs(scaleX);

  ctx.translate(coin.x, currentY);

  // 1. Soft golden ambient glow
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, coin.radius * 1.8);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
  glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, coin.radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer rim ellipse
  ctx.save();
  ctx.scale(absScaleX, 1.0);

  const grad = ctx.createLinearGradient(0, -coin.radius, 0, coin.radius);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.5, '#eab308');
  grad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
  ctx.fill();

  // Coin border
  ctx.strokeStyle = '#fef9c3';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner coin ridge
  if (absScaleX > 0.4) {
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(161, 98, 7, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Star/diamond center gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws sharp, aerodynamic speed lines behind dashing stickman
 */
function drawDashSpeedLines(ctx: CanvasRenderingContext2D, player: Player): void {
  ctx.save();
  const dir = player.facing === 'right' ? -1 : 1;
  const numLines = 6;

  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  for (let i = 0; i < numLines; i++) {
    const yOffset = -8 - i * 7 + (Math.sin(player.animTimer * 10 + i) * 3);
    const startX = player.x + dir * (6 + (i % 3) * 6);
    const length = 28 + ((i * 17) % 32);
    const endX = startX + dir * length;

    const grad = ctx.createLinearGradient(startX, 0, endX, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.75)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(startX, player.y + yOffset);
    ctx.lineTo(endX, player.y + yOffset);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws active particles
 */
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const progress = p.life / p.maxLife;
    const alpha = (1 - progress) * p.alpha;
    if (alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draws floating "+10" score text popups
 */
function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  for (const ft of texts) {
    const progress = ft.life / ft.maxLife;
    const alpha = Math.max(0, 1 - progress);
    const yOffset = progress * 28;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black text shadow / stroke for high contrast readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y - yOffset);

    // Glowing golden fill
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y - yOffset);

    ctx.restore();
  }
}

/**
 * Subtle void abyss warning at the bottom of the world
 */
function drawVoidGradient(ctx: CanvasRenderingContext2D, bounds: Rect): void {
  const voidStart = 680;
  if (bounds.y + bounds.height < voidStart) return;

  ctx.save();
  const grad = ctx.createLinearGradient(0, voidStart, 0, voidStart + 240);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(bounds.x, voidStart, bounds.width, 300);
  ctx.restore();
}

/**
 * Draws subtle screen-edge speed streak lines at higher auto-runner speeds
 */
function drawAmbientSpeedLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  speed: number,
  time: number
): void {
  if (speed <= 360) return;
  const intensity = Math.min(1.0, (speed - 360) / 120);

  ctx.save();
  ctx.lineWidth = 1.2;

  const count = Math.floor(4 + intensity * 6);
  for (let i = 0; i < count; i++) {
    const y = (i * 97 + time * 380) % height;
    const lineLen = 80 + ((i * 43) % 110);
    const x = ((width + 250) - ((time * (speed * 1.6) + i * 220) % (width + 350)));

    const grad = ctx.createLinearGradient(x, 0, x + lineLen, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.6, `rgba(56, 189, 248, ${0.12 * intensity})`);
    grad.addColorStop(1, `rgba(255, 255, 255, ${0.22 * intensity})`);

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lineLen, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a subtle, elegant targeting line from stickman toward the locked grapple anchor
 */
function drawGrappleTargetingLine(
  ctx: CanvasRenderingContext2D,
  player: Player,
  targetPoint: GrapplePoint,
  gameTime: number
): void {
  ctx.save();
  const handX = player.x + (player.facing === 'right' ? 8 : -8);
  const handY = player.y - player.height * 0.65;
  const anchorX = targetPoint.x;
  const anchorY = targetPoint.y;

  // Subtle pulsing dashed guide line
  const pulse = Math.sin(gameTime * 6);
  const alpha = 0.38 + pulse * 0.12;

  ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -gameTime * 45; // Glides smoothly toward anchor

  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(anchorX, anchorY);
  ctx.stroke();

  // Subtle energy pip gliding towards anchor
  const travelT = (gameTime * 2.2) % 1;
  const pipX = lerp(handX, anchorX, travelT);
  const pipY = lerp(handY, anchorY, travelT);

  ctx.setLineDash([]);
  ctx.fillStyle = '#7dd3fc';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(pipX, pipY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a glowing circular anchor grapple point with targeting reticle
 */
function drawGrapplePoint(
  ctx: CanvasRenderingContext2D,
  pt: GrapplePoint,
  isTargeted: boolean,
  isHooked: boolean,
  gameTime: number
): void {
  ctx.save();
  ctx.translate(pt.x, pt.y);

  const pulse = Math.sin(gameTime * 5.0);
  const ambientPulse = Math.sin(gameTime * 2.5);
  const outerRadius = pt.radius + (isHooked ? 5 : isTargeted ? 3 + pulse * 2 : 1 + ambientPulse * 1.2);

  // 1. Ambient cyan glow aura (always subtle so visible in distance, prominent when targeted or hooked)
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, outerRadius * 2.5);
  const glowAlpha = isHooked ? 0.75 : isTargeted ? 0.6 + pulse * 0.15 : 0.22 + ambientPulse * 0.08;
  glow.addColorStop(0, `rgba(56, 189, 248, ${glowAlpha})`);
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer metal ring
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isHooked ? '#ffffff' : isTargeted ? '#38bdf8' : '#0284c7';
  ctx.lineWidth = isHooked || isTargeted ? 2.8 : 1.8;
  ctx.stroke();

  // 3. Inner neon cyan core ring
  ctx.fillStyle = isHooked ? '#38bdf8' : isTargeted ? '#38bdf8' : '#0369a1';
  ctx.beginPath();
  ctx.arc(0, 0, pt.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // 4. Center bright gleam dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Targeting Reticle and lock ring when within reach
  if (isTargeted && !isHooked) {
    // Rotating lock dashed ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = gameTime * 25;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 Corner brackets
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.8;
    const reticleDist = outerRadius + 8 + pulse * 2;
    const bracketLen = 6;

    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx * reticleDist, cy * (reticleDist - bracketLen));
      ctx.lineTo(cx * reticleDist, cy * reticleDist);
      ctx.lineTo(cx * (reticleDist - bracketLen), cy * reticleDist);
      ctx.stroke();
    }
  }

  // 6. Active Connection Sparkle ring when hooked
  if (isHooked) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius + 4 + Math.sin(gameTime * 8) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the high-visibility glowing energy grapple rope
 */
function drawGrappleRope(
  ctx: CanvasRenderingContext2D,
  player: Player,
  targetPoint: GrapplePoint,
  ropeAttachAnim: number,
  gameTime: number
): void {
  ctx.save();

  const handX = player.x + (player.facing === 'right' ? 8 : -8);
  const handY = player.y - player.height * 0.65;

  const anchorX = targetPoint.x;
  const anchorY = targetPoint.y;

  // Attachment progression (rapid shoot-out line animation)
  const t = Math.min(1.0, Math.max(0, ropeAttachAnim));
  const currentEndX = lerp(handX, anchorX, t);
  const currentEndY = lerp(handY, anchorY, t);

  // Subtle cable sag when distance is long
  const midX = (handX + currentEndX) / 2;
  const midY = (handY + currentEndY) / 2 + (1 - t) * 6;

  // Layer 1: Wide electric cyan glow
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.quadraticCurveTo(midX, midY, currentEndX, currentEndY);
  ctx.stroke();

  // Layer 2: Vibrant cyber-cyan cable
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.quadraticCurveTo(midX, midY, currentEndX, currentEndY);
  ctx.stroke();

  // Layer 3: Crisp bright white core
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.quadraticCurveTo(midX, midY, currentEndX, currentEndY);
  ctx.stroke();

  // Animated energy pulses travelling along rope
  const pulsePhase = (gameTime * 5) % 1;
  const pulseX = lerp(handX, currentEndX, pulsePhase);
  const pulseY = lerp(handY, currentEndY, pulsePhase);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(pulseX, pulseY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the finish portal archway and glowing finish line banner
 */
function drawFinishLine(ctx: CanvasRenderingContext2D, finish: FinishLine, gameTime: number): void {
  ctx.save();
  const x = finish.x;
  const bottomY = finish.y + finish.height;
  const topY = finish.y;
  const gateWidth = finish.width || 40;

  // 1. Ambient vertical portal light beam
  const beamGrad = ctx.createLinearGradient(x - 20, 0, x + gateWidth + 20, 0);
  beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  beamGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
  beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(x - 20, topY - 140, gateWidth + 40, finish.height + 140);

  // 2. Left and Right neon holographic pillars
  const pillarW = 8;
  // Left pillar
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x, topY - 40, pillarW, finish.height + 40);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x + 2, topY - 40, pillarW - 4, finish.height + 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 3, topY - 40, 2, finish.height + 40);

  // Right pillar
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x + gateWidth - pillarW, topY - 40, pillarW, finish.height + 40);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x + gateWidth - pillarW + 2, topY - 40, pillarW - 4, finish.height + 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + gateWidth - pillarW + 3, topY - 40, 2, finish.height + 40);

  // 3. Overhead Cyber Banner "FINISH"
  const bannerY = topY - 44;
  const bannerW = gateWidth + 36;
  const bannerH = 26;
  const bannerX = x - 18;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

  // Checkered pattern inside banner
  const numChecks = 6;
  const checkW = bannerW / numChecks;
  for (let i = 0; i < numChecks; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(bannerX + i * checkW, bannerY, checkW, bannerH);
    }
  }

  // Text "FINISH"
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', x + gateWidth / 2, bannerY + bannerH / 2);

  // 4. Ground laser threshold line
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 12, bottomY);
  ctx.lineTo(x + gateWidth + 12, bottomY);
  ctx.stroke();

  // Floating celebratory beacon pulse
  const pulse = (Math.sin(gameTime * 5) + 1) * 0.5;
  ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.35})`;
  ctx.beginPath();
  ctx.arc(x + gateWidth / 2, bannerY - 8, 5 + pulse * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws checkpoint beacons
 */
function drawCheckpoint(ctx: CanvasRenderingContext2D, cp: Checkpoint, gameTime: number): void {
  ctx.save();
  ctx.translate(cp.x, cp.y);

  const isReached = Boolean(cp.reached);
  const color = isReached ? '#22c55e' : '#38bdf8';

  // Vertical light beacon pole
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -55);
  ctx.stroke();

  // Holographic flag
  const wave = Math.sin(gameTime * 4) * 3;
  ctx.fillStyle = isReached ? 'rgba(34, 197, 94, 0.4)' : 'rgba(56, 189, 248, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, -55);
  ctx.lineTo(24 + wave, -42);
  ctx.lineTo(0, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Text indicator
  ctx.fillStyle = color;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(isReached ? 'SAVED' : 'CHECK', 0, -62);

  ctx.restore();
}



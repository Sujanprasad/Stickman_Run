import { Coin, GameDifficulty, GrapplePoint, Platform, Spike } from './types.ts';
import { clamp, DIFFICULTY_CONFIG, DifficultySettings } from './physics.ts';

// ---------------------------------------------------------------------------
// DEVELOPER CONFIGURATION & TESTING FLAGS
// ---------------------------------------------------------------------------

/**
 * Optional seed for reproducible run generation.
 * If null: Generates a completely new random run every time.
 * If a number (e.g. 42): Generates an identical deterministic level.
 */
export const GAME_SEED: number | null = null;

/**
 * Optional developer debugging mode to force specific pattern generation.
 * Values: 'gap' | 'spikes' | 'dash' | 'moving' | 'coins' | 'combination' | 'grapple' | null
 */
export const DEBUG_PATTERN: 'gap' | 'spikes' | 'dash' | 'moving' | 'coins' | 'combination' | 'grapple' | null = null;

// ---------------------------------------------------------------------------
// PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
// ---------------------------------------------------------------------------

export class PRNG {
  private seed: number;

  constructor(seed?: number | null) {
    this.seed = seed !== null && seed !== undefined
      ? seed
      : Math.floor(Math.random() * 2147483647);
  }

  public getSeed(): number {
    return this.seed;
  }

  public next(): number {
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

// ---------------------------------------------------------------------------
// PATTERN TYPES & INTERFACES
// ---------------------------------------------------------------------------

export type PatternType =
  | 'basic_gap'
  | 'spike_run'
  | 'long_gap'
  | 'dash_spikes'
  | 'coin_risk'
  | 'double_gap'
  | 'moving_platform'
  | 'spike_coin'
  | 'safe_section'
  | 'combination'
  | 'grapple_gap'
  | 'grapple_coin'
  | 'grapple_escape'
  | 'grapple_dash';

export type DifficultyTier = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';

export interface PatternResult {
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  grapplePoints?: GrapplePoint[];
  endX: number;
  endY: number;
}

// ---------------------------------------------------------------------------
// LEVEL GENERATOR CLASS
// ---------------------------------------------------------------------------

export class LevelGenerator {
  public platforms: Platform[] = [];
  public spikes: Spike[] = [];
  public coins: Coin[] = [];
  public grapplePoints: GrapplePoint[] = [];

  private rng: PRNG;
  private currentX = 0;
  private currentY = 380;
  private platformCounter = 0;
  private spikeCounter = 0;
  private coinCounter = 0;
  private grappleCounter = 0;

  // History tracking to enforce variety and prevent repetitive patterns
  private recentPatterns: PatternType[] = [];
  private patternsSinceSafe = 0;
  private nextMilestoneMeter = 200;

  // Lookahead and cleanup thresholds (pixels)
  private readonly AHEAD_BUFFER = 2800;
  private readonly BEHIND_BUFFER = 1200;

  public difficulty: GameDifficulty = 'MEDIUM';

  constructor(seed: number | null = GAME_SEED, difficulty: GameDifficulty = 'MEDIUM') {
    this.rng = new PRNG(seed);
    this.reset(seed, difficulty);
  }

  /**
   * Resets generator state and builds the safe starting tutorial section (0 - ~180m).
   */
  public reset(seed: number | null = GAME_SEED, difficulty: GameDifficulty = 'MEDIUM'): void {
    this.rng = new PRNG(seed);
    this.difficulty = difficulty;
    this.platforms = [];
    this.spikes = [];
    this.coins = [];
    this.grapplePoints = [];
    this.platformCounter = 0;
    this.spikeCounter = 0;
    this.coinCounter = 0;
    this.grappleCounter = 0;
    this.recentPatterns = [];
    this.patternsSinceSafe = 0;
    this.nextMilestoneMeter = 200;

    this.buildSafeStartingSection();
  }

  /**
   * Safe starting tutorial section (0 to ~180m):
   * Introduces running, gentle hops, simple centered spikes, and coin waves
   * with generous reaction time.
   */
  private buildSafeStartingSection(): void {
    // 1. Initial runway (x: -250 to 650, width: 900)
    const startPlat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: -250,
      y: 390,
      width: 900,
      height: 90,
      type: 'start',
      label: 'START',
      color: '#161e2e',
      borderColor: '#38bdf8',
    };
    this.platforms.push(startPlat);

    // Welcome coins on runway
    this.addCoin(100, 340);
    this.addCoin(240, 340);
    this.addCoin(380, 340);
    this.addCoin(520, 340);

    // 2. First gentle hop: gap 90px, platform width 340px
    const hop1X = 650 + 90;
    const plat1: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop1X,
      y: 390,
      width: 340,
      height: 80,
      type: 'standard',
    };
    this.platforms.push(plat1);

    // Arc of coins over the first gap
    this.addCoin(695, 330);

    // 3. Platform with 2 centered spikes: gap 95px, platform width 380px
    const hop2X = hop1X + 340 + 95;
    const plat2: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop2X,
      y: 390,
      width: 380,
      height: 80,
      type: 'standard',
    };
    this.platforms.push(plat2);

    // 2 Spikes in center (runway before: 165px, landing after: 179px)
    this.addSpikes(hop2X + 165, 390, 2);
    // Apex coins over spikes
    this.addCoin(hop2X + 155, 320);
    this.addCoin(hop2X + 183, 305);
    this.addCoin(hop2X + 211, 320);

    // 4. Stepped elevated platform with coin wave: gap 90px, step up 40px
    const hop3X = hop2X + 380 + 90;
    const plat3: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop3X,
      y: 350,
      width: 340,
      height: 90,
      type: 'standard',
    };
    this.platforms.push(plat3);
    this.addCoin(hop3X + 70, 300);
    this.addCoin(hop3X + 140, 280);
    this.addCoin(hop3X + 210, 280);
    this.addCoin(hop3X + 280, 300);

    // 5. 100m Milestone checkpoint: gap 95px, width 400px
    const hop4X = hop3X + 340 + 95;
    const plat4: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop4X,
      y: 350,
      width: 400,
      height: 60,
      type: 'milestone',
      label: '100m CHECKPOINT',
      borderColor: '#38bdf8',
    };
    this.platforms.push(plat4);
    this.addCoin(hop4X + 130, 290);
    this.addCoin(hop4X + 270, 290);

    // 6. Gentle double hop:
    // Hop A: gap 90px, width 200px
    const hop5X = hop4X + 400 + 90;
    const plat5A: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop5X,
      y: 350,
      width: 200,
      height: 60,
      type: 'standard',
    };
    this.platforms.push(plat5A);
    this.addCoin(hop5X + 100, 290);

    // Hop B: gap 90px, width 320px
    const hop6X = hop5X + 200 + 90;
    const plat5B: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop6X,
      y: 350,
      width: 320,
      height: 60,
      type: 'standard',
    };
    this.platforms.push(plat5B);
    this.addCoin(hop6X + 110, 290);
    this.addCoin(hop6X + 210, 290);

    // 7. 150m Milestone: gap 95px, width 380px
    const hop7X = hop6X + 320 + 95;
    const plat6: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop7X,
      y: 350,
      width: 380,
      height: 60,
      type: 'milestone',
      label: '150m',
      borderColor: '#34d399',
    };
    this.platforms.push(plat6);
    this.addCoin(hop7X + 190, 290);

    // 8. Introductory Grapple Gap (demonstrates the Grapple Hook ability safely)
    const hop8X = hop7X + 380 + 260;
    const anchorIntro: GrapplePoint = {
      id: `grapple-${++this.grappleCounter}`,
      x: hop7X + 380 + 130,
      y: 190,
      radius: 12,
      active: true,
    };
    this.grapplePoints.push(anchorIntro);
    this.addCoin(hop7X + 380 + 90, 285);
    this.addCoin(hop7X + 380 + 130, 295);
    this.addCoin(hop7X + 380 + 170, 285);

    const plat7: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: hop8X,
      y: 350,
      width: 360,
      height: 60,
      type: 'standard',
    };
    this.platforms.push(plat7);
    this.addCoin(hop8X + 180, 290);

    this.currentX = hop8X + 360;
    this.currentY = 350;
  }

  /**
   * Continuous level update:
   * Generates new patterns ahead of player and removes platforms far behind.
   */
  public update(playerX: number, gameTime: number, dt: number): void {
    // 1. Generate patterns ahead to maintain the buffer
    while (this.currentX < playerX + this.AHEAD_BUFFER) {
      this.generateNextPattern();
    }

    // 2. Update dynamic moving platforms
    for (const plat of this.platforms) {
      if (plat.isMoving && plat.baseY !== undefined) {
        plat.prevY = plat.y;
        plat.prevX = plat.x;

        const speed = plat.moveSpeed || 1.8;
        const phase = plat.movePhase || 0;
        const range = plat.moveRange || 28;

        plat.y = plat.baseY + Math.sin(gameTime * speed + phase) * range;
        plat.currentVy = dt > 0 ? (plat.y - (plat.prevY ?? plat.y)) / dt : 0;

        // Keep attached coins moving synchronously with the platform
        for (const coin of this.coins) {
          if (coin.platformId === plat.id && coin.offsetY !== undefined) {
            coin.y = plat.y + coin.offsetY;
            coin.baseY = plat.y + coin.offsetY;
          }
        }
      }
    }

    // 3. Prune old objects behind the player to maintain lean memory footprint
    const cleanupX = playerX - this.BEHIND_BUFFER;
    this.platforms = this.platforms.filter((p) => p.x + p.width > cleanupX);
    this.spikes = this.spikes.filter((s) => s.x + s.width > cleanupX);
    this.coins = this.coins.filter((c) => c.x + c.radius > cleanupX);
    this.grapplePoints = this.grapplePoints.filter((g) => g.x + g.radius > cleanupX);
  }

  /**
   * Determines the current difficulty tier based on distance in meters.
   */
  public getDifficultyTier(distanceMeters: number): DifficultyTier {
    if (distanceMeters < 300) return 'very_easy';
    if (distanceMeters < 600) return 'easy';
    if (distanceMeters < 1000) return 'medium';
    if (distanceMeters < 1500) return 'hard';
    return 'very_hard';
  }

  /**
   * Generates the next obstacle pattern ahead using controlled randomness.
   */
  private generateNextPattern(): void {
    const distanceMeters = Math.max(0, Math.floor(this.currentX / 20));
    const tier = this.getDifficultyTier(distanceMeters);

    const patternType = this.selectPatternType(tier);
    this.recentPatterns.push(patternType);
    if (this.recentPatterns.length > 5) {
      this.recentPatterns.shift();
    }

    if (patternType === 'safe_section') {
      this.patternsSinceSafe = 0;
    } else {
      this.patternsSinceSafe++;
    }

    // Build the pattern
    const result = this.buildPattern(patternType, tier, distanceMeters);

    this.platforms.push(...result.platforms);
    this.spikes.push(...result.spikes);
    this.coins.push(...result.coins);
    if (result.grapplePoints) {
      this.grapplePoints.push(...result.grapplePoints);
    }

    this.currentX = result.endX;
    this.currentY = result.endY;
  }

  /**
   * Selects an obstacle pattern respecting difficulty tier and avoiding repetitive sequences.
   */
  private selectPatternType(tier: DifficultyTier): PatternType {
    // 1. Developer test mode override
    if (DEBUG_PATTERN) {
      const mapping: Record<string, PatternType> = {
        gap: 'basic_gap',
        spikes: 'spike_run',
        dash: 'dash_spikes',
        moving: 'moving_platform',
        coins: 'spike_coin',
        combination: 'combination',
        grapple: 'grapple_gap',
      };
      if (mapping[DEBUG_PATTERN]) {
        // Interleave with safe section so test runs are survivable
        if (this.patternsSinceSafe >= 1) {
          return 'safe_section';
        }
        return mapping[DEBUG_PATTERN];
      }
    }

    const cfg = DIFFICULTY_CONFIG[this.difficulty] || DIFFICULTY_CONFIG.MEDIUM;

    // 2. Guarantee breathing room: force a safe section every safeSectionFrequency patterns
    if (this.patternsSinceSafe >= cfg.safeSectionFrequency) {
      return 'safe_section';
    }

    // 3. Check for 50m milestones
    const currentMeter = Math.floor(this.currentX / 20);
    if (currentMeter >= this.nextMilestoneMeter) {
      this.nextMilestoneMeter += 50;
      return 'safe_section';
    }

    // Adapt effective tier based on chosen difficulty
    let effectiveTier = tier;
    if (this.difficulty === 'EASY') {
      // In Easy mode, cap pattern complexity at easy
      effectiveTier = tier === 'very_easy' ? 'very_easy' : 'easy';
    } else if (this.difficulty === 'HARD') {
      // In Hard mode, elevate pattern complexity
      if (tier === 'very_easy' || tier === 'easy') effectiveTier = 'medium';
    }

    // 4. Candidate pool with weights based on effective difficulty tier
    const candidates: { type: PatternType; weight: number }[] = [];

    switch (effectiveTier) {
      case 'very_easy':
        candidates.push(
          { type: 'safe_section', weight: 4 },
          { type: 'basic_gap', weight: 4 },
          { type: 'grapple_gap', weight: 2 },
          { type: 'spike_coin', weight: 3 },
          { type: 'coin_risk', weight: 2 },
          { type: 'spike_run', weight: 2 }
        );
        break;

      case 'easy':
        candidates.push(
          { type: 'basic_gap', weight: 4 },
          { type: 'grapple_gap', weight: 3 },
          { type: 'grapple_coin', weight: 3 },
          { type: 'spike_run', weight: 3 },
          { type: 'spike_coin', weight: 3 },
          { type: 'coin_risk', weight: 3 },
          { type: 'safe_section', weight: 3 },
          { type: 'double_gap', weight: 2 },
          { type: 'dash_spikes', weight: 2 }
        );
        break;

      case 'medium':
        candidates.push(
          { type: 'basic_gap', weight: 3 },
          { type: 'grapple_gap', weight: 3 },
          { type: 'grapple_coin', weight: 3 },
          { type: 'grapple_escape', weight: 3 },
          { type: 'spike_run', weight: 3 },
          { type: 'long_gap', weight: 3 },
          { type: 'dash_spikes', weight: 3 },
          { type: 'coin_risk', weight: 3 },
          { type: 'double_gap', weight: 3 },
          { type: 'moving_platform', weight: 3 },
          { type: 'spike_coin', weight: 3 },
          { type: 'safe_section', weight: 2 },
          { type: 'combination', weight: 3 }
        );
        break;

      case 'hard':
        candidates.push(
          { type: 'grapple_escape', weight: 4 },
          { type: 'grapple_dash', weight: 3 },
          { type: 'grapple_gap', weight: 3 },
          { type: 'grapple_coin', weight: 3 },
          { type: 'spike_run', weight: 3 },
          { type: 'long_gap', weight: 4 },
          { type: 'dash_spikes', weight: 4 },
          { type: 'double_gap', weight: 4 },
          { type: 'moving_platform', weight: 4 },
          { type: 'combination', weight: 4 },
          { type: 'coin_risk', weight: 3 },
          { type: 'spike_coin', weight: 3 },
          { type: 'basic_gap', weight: 2 },
          { type: 'safe_section', weight: 2 }
        );
        break;

      case 'very_hard':
        candidates.push(
          { type: 'combination', weight: 5 },
          { type: 'grapple_escape', weight: 4 },
          { type: 'grapple_dash', weight: 4 },
          { type: 'dash_spikes', weight: 4 },
          { type: 'long_gap', weight: 4 },
          { type: 'moving_platform', weight: 4 },
          { type: 'double_gap', weight: 4 },
          { type: 'spike_run', weight: 3 },
          { type: 'coin_risk', weight: 3 },
          { type: 'spike_coin', weight: 3 },
          { type: 'grapple_coin', weight: 3 },
          { type: 'safe_section', weight: 2 }
        );
        break;
    }

    // Deprioritize patterns used in the last 2 choices to guarantee variety
    const last1 = this.recentPatterns[this.recentPatterns.length - 1];
    const last2 = this.recentPatterns[this.recentPatterns.length - 2];

    const filtered = candidates.map((item) => {
      let w = item.weight;
      if (item.type === last1) w = 0; // Never pick same pattern back to back
      else if (item.type === last2) w *= 0.35; // Drastically lower chance of picking recent pattern
      return { type: item.type, weight: w };
    });

    // Weighted random selection
    const totalWeight = filtered.reduce((acc, curr) => acc + curr.weight, 0);
    let randomVal = this.rng.range(0, totalWeight);

    for (const item of filtered) {
      if (item.weight <= 0) continue;
      if (randomVal <= item.weight) {
        return item.type;
      }
      randomVal -= item.weight;
    }

    return 'safe_section';
  }

  /**
   * Builds the specified pattern and returns its entities.
   */
  private buildPattern(
    type: PatternType,
    tier: DifficultyTier,
    distanceMeters: number
  ): PatternResult {
    switch (type) {
      case 'basic_gap':
        return this.buildBasicGapPattern();
      case 'spike_run':
        return this.buildSpikeRunPattern(tier);
      case 'long_gap':
        return this.buildLongGapPattern();
      case 'dash_spikes':
        return this.buildDashSpikesPattern(tier);
      case 'coin_risk':
        return this.buildCoinRiskPattern();
      case 'double_gap':
        return this.buildDoubleGapPattern();
      case 'moving_platform':
        return this.buildMovingPlatformPattern();
      case 'spike_coin':
        return this.buildSpikeCoinPattern(tier);
      case 'safe_section':
        return this.buildSafeSectionPattern(distanceMeters);
      case 'combination':
        return this.buildCombinationPattern(tier);
      case 'grapple_gap':
        return this.buildGrappleGapPattern();
      case 'grapple_coin':
        return this.buildGrappleCoinPattern();
      case 'grapple_escape':
        return this.buildGrappleEscapePattern(tier);
      case 'grapple_dash':
        return this.buildGrappleDashPattern(tier);
      default:
        return this.buildSafeSectionPattern(distanceMeters);
    }
  }

  // -------------------------------------------------------------------------
  // PATTERN 1 — BASIC GAP
  // A small gap that requires a normal jump, guided by coin trajectory.
  // -------------------------------------------------------------------------
  private buildBasicGapPattern(): PatternResult {
    const gap = this.rng.range(90, 120);
    const platWidth = this.rng.range(260, 340);

    // Subtle gentle height step (-25 to +25px)
    const targetY = clamp(this.currentY + this.rng.range(-25, 25), 230, 400);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    // Parabolic coin arc over the gap
    const midX = this.currentX + gap / 2;
    const apexY = Math.min(this.currentY, targetY) - 45;
    const coins: Coin[] = [
      this.createCoin(midX - 22, apexY + 12),
      this.createCoin(midX, apexY),
      this.createCoin(midX + 22, apexY + 12),
    ];

    return {
      platforms: [plat],
      spikes: [],
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 2 — SPIKE RUN
  // A group of 2-3 spikes safely centered on a platform with ample reaction runway.
  // -------------------------------------------------------------------------
  private buildSpikeRunPattern(tier: DifficultyTier): PatternResult {
    const gap = this.rng.range(60, 85);
    const spikeCount = tier === 'hard' || tier === 'very_hard' ? 3 : 2;
    const spikeW = spikeCount * 18;

    const runwayBefore = this.rng.range(150, 180);
    const runwayAfter = this.rng.range(150, 180);
    const platWidth = runwayBefore + spikeW + runwayAfter;

    const targetY = clamp(this.currentY + this.rng.range(-20, 20), 240, 400);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const spikeX = startX + runwayBefore;
    const spikes = this.createSpikeCluster(spikeX, targetY, spikeCount);

    // Coins forming jump apex right above the spikes
    const coins: Coin[] = [
      this.createCoin(spikeX - 20, targetY - 45),
      this.createCoin(spikeX + spikeW / 2, targetY - 65),
      this.createCoin(spikeX + spikeW + 20, targetY - 45),
    ];

    return {
      platforms: [plat],
      spikes,
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 3 — LONG GAP
  // A larger gap (155-185px) safely clearable with strong jump or mid-air dash.
  // -------------------------------------------------------------------------
  private buildLongGapPattern(): PatternResult {
    const gap = this.rng.range(155, 185);
    const platWidth = this.rng.range(280, 360); // Wide landing platform for mobile safety
    const targetY = clamp(this.currentY + this.rng.range(-15, 15), 250, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    // Horizontal dash/jump guidance coins spanning the gap
    const coins: Coin[] = [
      this.createCoin(this.currentX + gap * 0.3, targetY - 45),
      this.createCoin(this.currentX + gap * 0.5, targetY - 50),
      this.createCoin(this.currentX + gap * 0.7, targetY - 45),
    ];

    return {
      platforms: [plat],
      spikes: [],
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 4 — DASH SPIKES
  // A spike section designed to be passed using dash invulnerability.
  // -------------------------------------------------------------------------
  private buildDashSpikesPattern(tier: DifficultyTier): PatternResult {
    const gap = this.rng.range(60, 80);
    const spikeCount = tier === 'hard' || tier === 'very_hard' ? 5 : 4;
    const spikeW = spikeCount * 18;

    const runwayBefore = this.rng.range(160, 190);
    const runwayAfter = this.rng.range(160, 190);
    const platWidth = runwayBefore + spikeW + runwayAfter;

    const targetY = clamp(this.currentY + this.rng.range(-20, 20), 240, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
      borderColor: '#38bdf8', // Luminous sky-blue cue indicating dash opportunity
    };

    const spikeX = startX + runwayBefore;
    const spikes = this.createSpikeCluster(spikeX, targetY, spikeCount, 18, 24);

    // Coins placed along the dash path through/over spikes
    const coins: Coin[] = [
      this.createCoin(spikeX - 25, targetY - 30),
      this.createCoin(spikeX + spikeW * 0.3, targetY - 30),
      this.createCoin(spikeX + spikeW * 0.7, targetY - 30),
      this.createCoin(spikeX + spikeW + 25, targetY - 30),
    ];

    return {
      platforms: [plat],
      spikes,
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 5 — COIN RISK
  // A completely safe path with an optional risky coin position.
  // -------------------------------------------------------------------------
  private buildCoinRiskPattern(): PatternResult {
    const gap = this.rng.range(60, 80);
    const platWidth = this.rng.range(380, 460);
    const targetY = clamp(this.currentY + this.rng.range(-20, 20), 250, 390);
    const startX = this.currentX + gap;

    // Main platform is 100% safe
    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    // A single spike hazard with juicy bonus coins hovering close
    const spikeX = startX + platWidth * 0.45;
    const spikes = this.createSpikeCluster(spikeX, targetY, 2);

    // The player can safely jump or dash to get the coins, but can also just hop over or stay clear
    const coins: Coin[] = [
      this.createCoin(startX + 80, targetY - 40),
      this.createCoin(spikeX + 18, targetY - 45), // Risk coin close to hazard apex
      this.createCoin(startX + platWidth - 80, targetY - 40),
    ];

    return {
      platforms: [plat],
      spikes,
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 6 — DOUBLE GAP
  // Two small gaps separated by a stable stepping stone platform.
  // -------------------------------------------------------------------------
  private buildDoubleGapPattern(): PatternResult {
    const gap1 = this.rng.range(90, 115);
    const stepPlatWidth = this.rng.range(170, 210); // Generous stepping stone for mobile touch
    const stepY = clamp(this.currentY + this.rng.range(-25, 25), 240, 390);
    const stepX = this.currentX + gap1;

    const plat1: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: stepX,
      y: stepY,
      width: stepPlatWidth,
      height: 60,
      type: 'standard',
    };

    const gap2 = this.rng.range(90, 115);
    const landingPlatWidth = this.rng.range(260, 340);
    const landingY = clamp(stepY + this.rng.range(-25, 25), 240, 390);
    const landingX = stepX + stepPlatWidth + gap2;

    const plat2: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: landingX,
      y: landingY,
      width: landingPlatWidth,
      height: 60,
      type: 'standard',
    };

    // Rhythmic coins guiding the double hop
    const coins: Coin[] = [
      this.createCoin(stepX - gap1 / 2, stepY - 35),
      this.createCoin(stepX + stepPlatWidth / 2, stepY - 30),
      this.createCoin(landingX - gap2 / 2, landingY - 35),
      this.createCoin(landingX + 60, landingY - 30),
    ];

    return {
      platforms: [plat1, plat2],
      spikes: [],
      coins,
      endX: landingX + landingPlatWidth,
      endY: landingY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 7 — MOVING PLATFORM
  // A moving platform section with safe landing areas before and after.
  // -------------------------------------------------------------------------
  private buildMovingPlatformPattern(): PatternResult {
    // 1. Launch platform
    const launchWidth = this.rng.range(190, 230);
    const launchPlat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: this.currentX + 60,
      y: this.currentY,
      width: launchWidth,
      height: 60,
      type: 'standard',
    };

    // 2. Oscillating Moving Platform
    const gap1 = this.rng.range(80, 95);
    const moveWidth = this.rng.range(160, 190);
    const moveX = launchPlat.x + launchWidth + gap1;
    const moveBaseY = clamp(this.currentY, 260, 370);
    const moveId = `plat-move-${++this.platformCounter}`;

    const movePlat: Platform = {
      id: moveId,
      x: moveX,
      y: moveBaseY,
      width: moveWidth,
      height: 38,
      type: 'moving',
      borderColor: '#2dd4bf', // Glowing teal/emerald accent
      isMoving: true,
      baseX: moveX,
      baseY: moveBaseY,
      moveAxis: 'y',
      moveRange: 26, // Smooth ±26px vertical oscillation
      moveSpeed: 1.6, // Gentle ~3.9s period
      movePhase: this.rng.range(0, Math.PI * 2),
      prevX: moveX,
      prevY: moveBaseY,
    };

    // 3. Safe landing platform
    const gap2 = this.rng.range(80, 95);
    const landingWidth = this.rng.range(260, 340);
    const landingX = moveX + moveWidth + gap2;
    const landingY = clamp(moveBaseY + this.rng.range(-20, 20), 240, 390);

    const landingPlat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: landingX,
      y: landingY,
      width: landingWidth,
      height: 60,
      type: 'standard',
    };

    // Coins on moving platform that ride with it
    const coins: Coin[] = [
      {
        id: `coin-${++this.coinCounter}`,
        x: moveX + moveWidth * 0.35,
        y: moveBaseY - 35,
        baseY: moveBaseY - 35,
        radius: 9.5,
        collected: false,
        animPhase: this.rng.range(0, Math.PI * 2),
        value: 10,
        platformId: moveId,
        offsetY: -35,
      },
      {
        id: `coin-${++this.coinCounter}`,
        x: moveX + moveWidth * 0.65,
        y: moveBaseY - 35,
        baseY: moveBaseY - 35,
        radius: 9.5,
        collected: false,
        animPhase: this.rng.range(0, Math.PI * 2),
        value: 10,
        platformId: moveId,
        offsetY: -35,
      },
      this.createCoin(landingX + 60, landingY - 30),
    ];

    return {
      platforms: [launchPlat, movePlat, landingPlat],
      spikes: [],
      coins,
      endX: landingX + landingWidth,
      endY: landingY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 8 — SPIKE + COIN
  // Spikes with coins hovering above the safe jump trajectory.
  // -------------------------------------------------------------------------
  private buildSpikeCoinPattern(tier: DifficultyTier): PatternResult {
    const gap = this.rng.range(60, 80);
    const spikeCount = tier === 'hard' || tier === 'very_hard' ? 3 : 2;
    const spikeW = spikeCount * 18;

    const runwayBefore = 150;
    const runwayAfter = 160;
    const platWidth = runwayBefore + spikeW + runwayAfter;

    const targetY = clamp(this.currentY + this.rng.range(-20, 20), 240, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const spikeX = startX + runwayBefore;
    const spikes = this.createSpikeCluster(spikeX, targetY, spikeCount);

    // Coins placed along parabolic jump curve peaking directly over the spikes
    const coins: Coin[] = [
      this.createCoin(spikeX - 25, targetY - 40),
      this.createCoin(spikeX + spikeW / 2, targetY - 68),
      this.createCoin(spikeX + spikeW + 25, targetY - 40),
    ];

    return {
      platforms: [plat],
      spikes,
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 9 — SAFE SECTION
  // A short obstacle-free section where the player can recover and celebrate milestones.
  // -------------------------------------------------------------------------
  private buildSafeSectionPattern(distanceMeters: number): PatternResult {
    const gap = this.rng.range(50, 75);
    const platWidth = this.rng.range(320, 440);
    const targetY = clamp(this.currentY + this.rng.range(-15, 15), 250, 390);
    const startX = this.currentX + gap;

    // Check if this safe section corresponds to a 50m milestone
    const endMeter = Math.floor((startX + platWidth) / 20);
    const isMilestone = endMeter >= this.nextMilestoneMeter - 15;
    let label: string | undefined = undefined;
    let borderColor: string | undefined = undefined;

    if (isMilestone) {
      label = `${this.nextMilestoneMeter}m`;
      borderColor = '#38bdf8';
    }

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: isMilestone ? 'milestone' : 'standard',
      label,
      borderColor,
    };

    // Clean straight coin wave
    const coins: Coin[] = [
      this.createCoin(startX + 60, targetY - 30),
      this.createCoin(startX + 140, targetY - 30),
      this.createCoin(startX + 220, targetY - 30),
    ];

    return {
      platforms: [plat],
      spikes: [],
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 10 — COMBINATION
  // A moderate combination of jump + spikes + coins with guaranteed safe landing.
  // -------------------------------------------------------------------------
  private buildCombinationPattern(tier: DifficultyTier): PatternResult {
    const gap = this.rng.range(90, 115);
    const spikeCount = tier === 'very_hard' ? 3 : 2;
    const spikeW = spikeCount * 18;

    const runwayBefore = 140;
    const runwayAfter = 160;
    const platWidth = runwayBefore + spikeW + runwayAfter;

    const targetY = clamp(this.currentY + this.rng.range(-25, 25), 240, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const spikeX = startX + runwayBefore;
    const spikes = this.createSpikeCluster(spikeX, targetY, spikeCount);

    const coins: Coin[] = [
      // Gap coin
      this.createCoin(this.currentX + gap / 2, targetY - 40),
      // Apex coin over spikes
      this.createCoin(spikeX + spikeW / 2, targetY - 65),
      // Reward coin on landing
      this.createCoin(startX + platWidth - 60, targetY - 30),
    ];

    return {
      platforms: [plat],
      spikes,
      coins,
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 11 — GRAPPLE GAP
  // Large gap with an overhead grapple point allowing a thrilling swing across.
  // -------------------------------------------------------------------------
  private buildGrappleGapPattern(): PatternResult {
    const gap = this.rng.range(270, 320);
    const platWidth = this.rng.range(280, 340);
    const targetY = clamp(this.currentY + this.rng.range(-20, 20), 240, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const anchorX = this.currentX + gap * 0.52;
    const anchorY = Math.min(this.currentY, targetY) - this.rng.range(135, 155);

    const anchor: GrapplePoint = {
      id: `grapple-${++this.grappleCounter}`,
      x: anchorX,
      y: anchorY,
      radius: 12,
      active: true,
    };

    // Arc of 3 coins along the pendulum swing path
    const coins: Coin[] = [
      this.createCoin(anchorX - 45, anchorY + 95),
      this.createCoin(anchorX, anchorY + 110),
      this.createCoin(anchorX + 45, anchorY + 95),
    ];

    return {
      platforms: [plat],
      spikes: [],
      coins,
      grapplePoints: [anchor],
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 12 — GRAPPLE + COIN
  // High coin trail positioned along a scenic grapple swing trajectory.
  // -------------------------------------------------------------------------
  private buildGrappleCoinPattern(): PatternResult {
    const gap = this.rng.range(240, 290);
    const platWidth = this.rng.range(280, 340);
    const targetY = clamp(this.currentY + this.rng.range(-15, 20), 240, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const anchorX = this.currentX + gap * 0.5;
    const anchorY = Math.min(this.currentY, targetY) - 150;

    const anchor: GrapplePoint = {
      id: `grapple-${++this.grappleCounter}`,
      x: anchorX,
      y: anchorY,
      radius: 12,
      active: true,
    };

    // 5-coin golden arc rewarding the swing
    const coins: Coin[] = [
      this.createCoin(anchorX - 60, anchorY + 85),
      this.createCoin(anchorX - 30, anchorY + 102),
      this.createCoin(anchorX, anchorY + 112),
      this.createCoin(anchorX + 30, anchorY + 102),
      this.createCoin(anchorX + 60, anchorY + 85),
    ];

    return {
      platforms: [plat],
      spikes: [],
      coins,
      grapplePoints: [anchor],
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 13 — GRAPPLE ESCAPE
  // Dangerous spike bed safely crossed by grappling the overhead anchor.
  // -------------------------------------------------------------------------
  private buildGrappleEscapePattern(tier: DifficultyTier): PatternResult {
    const spikeCount = tier === 'hard' || tier === 'very_hard' ? 4 : 3;
    const spikeW = spikeCount * 18;
    const runwayBefore = 140;
    const runwayAfter = 180;
    const platWidth = runwayBefore + spikeW + runwayAfter;

    const targetY = clamp(this.currentY + this.rng.range(-20, 20), 240, 390);
    const gap = this.rng.range(70, 95);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const spikeStartX = startX + runwayBefore;
    const spikes = this.createSpikeCluster(spikeStartX, targetY, spikeCount);

    const anchorX = spikeStartX + spikeW * 0.5;
    const anchorY = targetY - 145;

    const anchor: GrapplePoint = {
      id: `grapple-${++this.grappleCounter}`,
      x: anchorX,
      y: anchorY,
      radius: 12,
      active: true,
    };

    // Coins floating safely above the spikes along the swing
    const coins: Coin[] = [
      this.createCoin(anchorX - 40, anchorY + 95),
      this.createCoin(anchorX, anchorY + 105),
      this.createCoin(anchorX + 40, anchorY + 95),
    ];

    return {
      platforms: [plat],
      spikes,
      coins,
      grapplePoints: [anchor],
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // PATTERN 14 — GRAPPLE DASH
  // High-speed challenge: swing across a wide chasm and burst with dash or jump!
  // -------------------------------------------------------------------------
  private buildGrappleDashPattern(tier: DifficultyTier): PatternResult {
    const gap = this.rng.range(340, 420);
    const platWidth = this.rng.range(280, 360);
    const targetY = clamp(this.currentY + this.rng.range(-25, 20), 240, 390);
    const startX = this.currentX + gap;

    const plat: Platform = {
      id: `plat-${++this.platformCounter}`,
      x: startX,
      y: targetY,
      width: platWidth,
      height: 60,
      type: 'standard',
    };

    const anchorX = this.currentX + 160;
    const anchorY = Math.min(this.currentY, targetY) - 155;

    const anchor: GrapplePoint = {
      id: `grapple-${++this.grappleCounter}`,
      x: anchorX,
      y: anchorY,
      radius: 12,
      active: true,
    };

    const coins: Coin[] = [
      this.createCoin(anchorX - 35, anchorY + 90),
      this.createCoin(anchorX + 35, anchorY + 90),
      this.createCoin(this.currentX + gap * 0.75, targetY - 45),
    ];

    return {
      platforms: [plat],
      spikes: [],
      coins,
      grapplePoints: [anchor],
      endX: startX + platWidth,
      endY: targetY,
    };
  }

  // -------------------------------------------------------------------------
  // HELPER FACTORIES
  // -------------------------------------------------------------------------

  private createCoin(x: number, y: number): Coin {
    return {
      id: `coin-${++this.coinCounter}`,
      x,
      y,
      baseY: y,
      radius: 9.5,
      collected: false,
      animPhase: this.rng.range(0, Math.PI * 2),
      value: 10,
    };
  }

  private addCoin(x: number, y: number): void {
    this.coins.push(this.createCoin(x, y));
  }

  private createSpikeCluster(
    startX: number,
    baseY: number,
    count: number,
    width = 18,
    height = 22
  ): Spike[] {
    const cluster: Spike[] = [];
    for (let i = 0; i < count; i++) {
      cluster.push({
        id: `spike-${++this.spikeCounter}`,
        x: startX + i * width,
        y: baseY,
        width,
        height,
      });
    }
    return cluster;
  }

  private addSpikes(startX: number, baseY: number, count: number): void {
    this.spikes.push(...this.createSpikeCluster(startX, baseY, count));
  }
}

import {
  Coin,
  GameDifficulty,
  GrapplePoint,
  HandcraftedLevel,
  Platform,
  Spike,
  Checkpoint,
} from './types.ts';

// ---------------------------------------------------------------------------
// DEVELOPER TESTING CONFIGURATION
// If set to e.g. 'easy_1' | 'easy_2' | 'easy_3' | 'medium_1' | 'hard_1',
// the engine directly boots into that level for instant testing.
// Set to null for production gameplay.
// ---------------------------------------------------------------------------
export const DEBUG_LEVEL: string | null = null;

// Helper to create collectible coins
function makeCoin(id: string, x: number, y: number, value = 10): Coin {
  return {
    id,
    x,
    y,
    baseY: y,
    radius: 9.5,
    collected: false,
    animPhase: Math.random() * Math.PI * 2,
    value,
  };
}

// Helper to create spike clusters
function makeSpikeCluster(baseId: string, startX: number, baseY: number, count: number, w = 18, h = 22): Spike[] {
  const spikes: Spike[] = [];
  for (let i = 0; i < count; i++) {
    spikes.push({
      id: `${baseId}-${i}`,
      x: startX + i * w,
      y: baseY,
      width: w,
      height: h,
    });
  }
  return spikes;
}

// ===========================================================================
// EASY LEVELS (1 — 5)
// ===========================================================================

// --- EASY LEVEL 1: "First Steps" ---
// Teach: Auto-running, single tap jumping, landing runway, coin arcs.
function createEasyLevel1(): HandcraftedLevel {
  const platforms: Platform[] = [
    // 0: Starting platform (generous 650px runway to get comfortable)
    { id: 'e1-p0', x: -80, y: 380, width: 750, height: 60, type: 'start', label: 'START' },
    // 1: First gentle gap (80px gap)
    { id: 'e1-p1', x: 750, y: 380, width: 380, height: 60, type: 'standard' },
    // 2: Slight step up (gap 90px, y 360)
    { id: 'e1-p2', x: 1220, y: 360, width: 420, height: 80, type: 'standard' },
    // 3: Downward step (gap 85px, y 380)
    { id: 'e1-p3', x: 1725, y: 380, width: 440, height: 60, type: 'standard' },
    // 4: Final grand finish platform (700px long)
    { id: 'e1-p4', x: 2250, y: 380, width: 650, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const coins: Coin[] = [
    // Runway coins
    makeCoin('e1-c1', 250, 320),
    makeCoin('e1-c2', 350, 320),
    makeCoin('e1-c3', 450, 320),
    // Jump 1 coin arc over gap 1 (between 670 and 750)
    makeCoin('e1-c4', 680, 300),
    makeCoin('e1-c5', 710, 275),
    makeCoin('e1-c6', 740, 300),
    // Platform 1 coins
    makeCoin('e1-c7', 940, 320),
    // Jump 2 coin arc to raised platform
    makeCoin('e1-c8', 1150, 290),
    makeCoin('e1-c9', 1185, 270),
    // Raised platform coins
    makeCoin('e1-c10', 1380, 300),
    makeCoin('e1-c11', 1480, 300),
    // Jump 3 arc
    makeCoin('e1-c12', 1665, 300),
    makeCoin('e1-c13', 1700, 290),
    // Finish stretch coins
    makeCoin('e1-c14', 2400, 320),
    makeCoin('e1-c15', 2500, 320),
  ];

  return {
    id: 'easy_1',
    difficulty: 'EASY',
    levelNumber: 1,
    title: 'First Steps',
    subtitle: 'Run & Jump Basics',
    lengthMeters: 130,
    startingSpeed: 230,
    maxSpeed: 280,
    platforms,
    spikes: [], // Hazard free for Level 1!
    coins,
    grapplePoints: [],
    finishLine: { x: 2650, y: 260, width: 32, height: 120 },
  };
}

// --- EASY LEVEL 2: "Spike Run" ---
// Introduce: Spikes on flat ground, small gap, simple dash utility.
function createEasyLevel2(): HandcraftedLevel {
  const platforms: Platform[] = [
    // 0: Start runway
    { id: 'e2-p0', x: -80, y: 380, width: 620, height: 60, type: 'start', label: 'START' },
    // 1: Platform with single spike (2 spikes, easily jumped)
    { id: 'e2-p1', x: 620, y: 380, width: 560, height: 60, type: 'standard' },
    // 2: Small gap to platform with 2 spikes & dash recommendation
    { id: 'e2-p2', x: 1260, y: 380, width: 600, height: 60, type: 'standard' },
    // 3: Elevated recovery platform
    { id: 'e2-p3', x: 1940, y: 350, width: 500, height: 90, type: 'standard' },
    // 4: Final stretch to finish
    { id: 'e2-p4', x: 2520, y: 380, width: 700, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const spikes: Spike[] = [
    // First encounter: 2 spikes safely centered on platform 1 (x: 880, runway before is 260px!)
    ...makeSpikeCluster('e2-s1', 880, 380, 2),
    // Second encounter: 3 spikes centered on platform 2 (x: 1540, runway before is 280px)
    ...makeSpikeCluster('e2-s2', 1540, 380, 3),
    // Third encounter: 2 spikes on platform 3 (x: 2180)
    ...makeSpikeCluster('e2-s3', 2180, 350, 2),
  ];

  const coins: Coin[] = [
    makeCoin('e2-c1', 200, 320),
    makeCoin('e2-c2', 320, 320),
    // Coin arc over first spike cluster
    makeCoin('e2-c3', 880, 290),
    makeCoin('e2-c4', 898, 275),
    makeCoin('e2-c5', 916, 290),
    // Gap coin
    makeCoin('e2-c6', 1220, 300),
    // Golden coins over second spike cluster (can dash or jump!)
    makeCoin('e2-c7', 1540, 295),
    makeCoin('e2-c8', 1567, 280),
    makeCoin('e2-c9', 1594, 295),
    // Platform 3 coins
    makeCoin('e2-c10', 2040, 290),
    makeCoin('e2-c11', 2180, 260),
    // Finish stretch
    makeCoin('e2-c12', 2680, 320),
    makeCoin('e2-c13', 2800, 320),
  ];

  return {
    id: 'easy_2',
    difficulty: 'EASY',
    levelNumber: 2,
    title: 'Spike Run',
    subtitle: 'Hazard Timing & Dash',
    lengthMeters: 165,
    startingSpeed: 240,
    maxSpeed: 300,
    platforms,
    spikes,
    coins,
    grapplePoints: [],
    finishLine: { x: 3050, y: 260, width: 32, height: 120 },
  };
}

// --- EASY LEVEL 3: "First Swing" ---
// Introduce: Overhead grapple anchors, large chasms, scenic high-altitude coin arcs.
function createEasyLevel3(): HandcraftedLevel {
  const platforms: Platform[] = [
    // 0: Start runway
    { id: 'e3-p0', x: -80, y: 380, width: 650, height: 60, type: 'start', label: 'START' },
    // 1: Large gap (280px) crossed via Grapple Anchor 1
    { id: 'e3-p1', x: 850, y: 380, width: 480, height: 60, type: 'standard' },
    // 2: Safe stepping stone
    { id: 'e3-p2', x: 1410, y: 360, width: 440, height: 80, type: 'standard' },
    // 3: Scenic grapple chasm (300px) crossed via Grapple Anchor 2
    { id: 'e3-p3', x: 2150, y: 380, width: 500, height: 60, type: 'standard' },
    // 4: Final safe runway to finish
    { id: 'e3-p4', x: 2730, y: 380, width: 680, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const grapplePoints: GrapplePoint[] = [
    // Anchor 1: Centered over gap 1 (between 570 and 850)
    { id: 'e3-g1', x: 710, y: 210, radius: 12, active: true },
    // Anchor 2: Centered over gap 2 (between 1850 and 2150)
    { id: 'e3-g2', x: 2000, y: 200, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    // Gentle spike cluster on middle platform 2 (x: 1620)
    ...makeSpikeCluster('e3-s1', 1620, 360, 2),
  ];

  const coins: Coin[] = [
    makeCoin('e3-c1', 250, 320),
    makeCoin('e3-c2', 400, 320),
    // Pendulum swing coins along Anchor 1 arc
    makeCoin('e3-c3', 665, 305),
    makeCoin('e3-c4', 710, 320),
    makeCoin('e3-c5', 755, 305),
    // Platform 1 coins
    makeCoin('e3-c6', 1050, 320),
    makeCoin('e3-c7', 1200, 320),
    // High apex coins rewarding Grapple swing over Anchor 2
    makeCoin('e3-c8', 1940, 290),
    makeCoin('e3-c9', 2000, 305),
    makeCoin('e3-c10', 2060, 290),
    // Safe finish stretch
    makeCoin('e3-c11', 2850, 320),
    makeCoin('e3-c12', 3000, 320),
  ];

  return {
    id: 'easy_3',
    difficulty: 'EASY',
    levelNumber: 3,
    title: 'First Swing',
    subtitle: 'Grapple Hook Mastery',
    lengthMeters: 175,
    startingSpeed: 240,
    maxSpeed: 310,
    platforms,
    spikes,
    coins,
    grapplePoints,
    finishLine: { x: 3240, y: 260, width: 32, height: 120 },
  };
}

// --- EASY LEVEL 4: "Crossfire" ---
// Combine: Jump, Dash, Grapple, plus a mid-level Checkpoint!
function createEasyLevel4(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'e4-p0', x: -80, y: 380, width: 600, height: 60, type: 'start', label: 'START' },
    // Platform with spikes requiring dash or high jump
    { id: 'e4-p1', x: 600, y: 380, width: 520, height: 60, type: 'standard' },
    // Checkpoint platform
    { id: 'e4-p2', x: 1200, y: 370, width: 480, height: 70, type: 'standard', label: 'CHECKPOINT' },
    // Grapple chasm
    { id: 'e4-p3', x: 1960, y: 380, width: 500, height: 60, type: 'standard' },
    // Finish platform
    { id: 'e4-p4', x: 2540, y: 380, width: 680, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const checkpoints: Checkpoint[] = [
    { id: 'e4-cp1', x: 1320, y: 370 },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'e4-g1', x: 1820, y: 200, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('e4-s1', 820, 380, 2),
    ...makeSpikeCluster('e4-s2', 2140, 380, 3),
  ];

  const coins: Coin[] = [
    makeCoin('e4-c1', 200, 320),
    makeCoin('e4-c2', 360, 320),
    makeCoin('e4-c3', 820, 280),
    makeCoin('e4-c4', 856, 280),
    makeCoin('e4-c5', 1400, 310),
    makeCoin('e4-c6', 1780, 290),
    makeCoin('e4-c7', 1820, 305),
    makeCoin('e4-c8', 1860, 290),
    makeCoin('e4-c9', 2680, 320),
  ];

  return {
    id: 'easy_4',
    difficulty: 'EASY',
    levelNumber: 4,
    title: 'Crossfire',
    subtitle: 'Combined Movement Trial',
    lengthMeters: 165,
    startingSpeed: 250,
    maxSpeed: 320,
    platforms,
    spikes,
    coins,
    grapplePoints,
    checkpoints,
    finishLine: { x: 3050, y: 260, width: 32, height: 120 },
  };
}

// --- EASY LEVEL 5: "Final Escape" ---
// Culmination of Easy: Moving platform, grapple swing, and dash finish!
function createEasyLevel5(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'e5-p0', x: -80, y: 380, width: 600, height: 60, type: 'start', label: 'START' },
    // Moving platform oscillating gently
    {
      id: 'e5-p1',
      x: 600,
      y: 360,
      width: 220,
      height: 50,
      type: 'moving',
      isMoving: true,
      baseX: 600,
      baseY: 360,
      moveAxis: 'y',
      moveRange: 24,
      moveSpeed: 1.5,
      movePhase: 0,
      borderColor: '#38bdf8',
    },
    // Safe mid landing
    { id: 'e5-p2', x: 900, y: 380, width: 440, height: 60, type: 'standard' },
    // Grapple chasm
    { id: 'e5-p3', x: 1620, y: 370, width: 480, height: 70, type: 'standard' },
    // Grand finale finish runway
    { id: 'e5-p4', x: 2180, y: 380, width: 700, height: 60, type: 'milestone', label: 'VICTORY' },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'e5-g1', x: 1480, y: 195, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('e5-s1', 1080, 380, 2),
    ...makeSpikeCluster('e5-s2', 1800, 370, 3),
  ];

  const coins: Coin[] = [
    makeCoin('e5-c1', 200, 320),
    makeCoin('e5-c2', 360, 320),
    makeCoin('e5-c3', 710, 280),
    makeCoin('e5-c4', 1080, 280),
    makeCoin('e5-c5', 1440, 290),
    makeCoin('e5-c6', 1480, 305),
    makeCoin('e5-c7', 1520, 290),
    makeCoin('e5-c8', 2350, 320),
    makeCoin('e5-c9', 2500, 320),
  ];

  return {
    id: 'easy_5',
    difficulty: 'EASY',
    levelNumber: 5,
    title: 'Final Escape',
    subtitle: 'Easy Graduation',
    lengthMeters: 155,
    startingSpeed: 250,
    maxSpeed: 330,
    platforms,
    spikes,
    coins,
    grapplePoints,
    finishLine: { x: 2700, y: 260, width: 32, height: 120 },
  };
}

// ===========================================================================
// MEDIUM LEVELS (1 — 5)
// ===========================================================================

function createMediumLevel1(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'm1-p0', x: -80, y: 380, width: 550, height: 60, type: 'start', label: 'START' },
    { id: 'm1-p1', x: 550, y: 380, width: 440, height: 60, type: 'standard' },
    {
      id: 'm1-p2',
      x: 1070,
      y: 350,
      width: 200,
      height: 50,
      type: 'moving',
      isMoving: true,
      baseX: 1070,
      baseY: 350,
      moveAxis: 'y',
      moveRange: 32,
      moveSpeed: 1.8,
      movePhase: 0.5,
      borderColor: '#38bdf8',
    },
    { id: 'm1-p3', x: 1350, y: 380, width: 500, height: 60, type: 'standard' },
    { id: 'm1-p4', x: 1930, y: 370, width: 620, height: 70, type: 'milestone', label: 'FINISH' },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('m1-s1', 750, 380, 3),
    ...makeSpikeCluster('m1-s2', 1560, 380, 3),
  ];

  const coins: Coin[] = [
    makeCoin('m1-c1', 200, 320),
    makeCoin('m1-c2', 750, 275),
    makeCoin('m1-c3', 1170, 270),
    makeCoin('m1-c4', 1560, 275),
    makeCoin('m1-c5', 2100, 310),
  ];

  return {
    id: 'medium_1',
    difficulty: 'MEDIUM',
    levelNumber: 1,
    title: 'Swift Momentum',
    subtitle: 'Pace Acceleration',
    lengthMeters: 135,
    startingSpeed: 290,
    maxSpeed: 380,
    platforms,
    spikes,
    coins,
    grapplePoints: [],
    finishLine: { x: 2380, y: 250, width: 32, height: 120 },
  };
}

function createMediumLevel2(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'm2-p0', x: -80, y: 380, width: 520, height: 60, type: 'start', label: 'START' },
    { id: 'm2-p1', x: 520, y: 380, width: 480, height: 60, type: 'standard' },
    { id: 'm2-p2', x: 1090, y: 370, width: 520, height: 70, type: 'standard' },
    { id: 'm2-p3', x: 1700, y: 380, width: 600, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('m2-s1', 720, 380, 3),
    ...makeSpikeCluster('m2-s2', 1300, 370, 4),
  ];

  const coins: Coin[] = [
    makeCoin('m2-c1', 240, 320),
    makeCoin('m2-c2', 720, 270),
    makeCoin('m2-c3', 1300, 260),
    makeCoin('m2-c4', 1880, 320),
  ];

  return {
    id: 'medium_2',
    difficulty: 'MEDIUM',
    levelNumber: 2,
    title: 'Spike Canyon',
    subtitle: 'Precision Dash Timing',
    lengthMeters: 125,
    startingSpeed: 300,
    maxSpeed: 400,
    platforms,
    spikes,
    coins,
    grapplePoints: [],
    finishLine: { x: 2150, y: 260, width: 32, height: 120 },
  };
}

function createMediumLevel3(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'm3-p0', x: -80, y: 380, width: 500, height: 60, type: 'start', label: 'START' },
    { id: 'm3-p1', x: 740, y: 380, width: 440, height: 60, type: 'standard' },
    { id: 'm3-p2', x: 1480, y: 370, width: 450, height: 70, type: 'standard' },
    { id: 'm3-p3', x: 2020, y: 380, width: 600, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'm3-g1', x: 620, y: 190, radius: 12, active: true },
    { id: 'm3-g2', x: 1330, y: 190, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('m3-s1', 930, 380, 3),
  ];

  const coins: Coin[] = [
    makeCoin('m3-c1', 580, 290),
    makeCoin('m3-c2', 620, 305),
    makeCoin('m3-c3', 660, 290),
    makeCoin('m3-c4', 1290, 290),
    makeCoin('m3-c5', 1330, 305),
    makeCoin('m3-c6', 1370, 290),
  ];

  return {
    id: 'medium_3',
    difficulty: 'MEDIUM',
    levelNumber: 3,
    title: 'Aerial Acrobat',
    subtitle: 'Dual Anchor Swings',
    lengthMeters: 135,
    startingSpeed: 300,
    maxSpeed: 410,
    platforms,
    spikes,
    coins,
    grapplePoints,
    finishLine: { x: 2450, y: 260, width: 32, height: 120 },
  };
}

function createMediumLevel4(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'm4-p0', x: -80, y: 380, width: 500, height: 60, type: 'start', label: 'START' },
    {
      id: 'm4-p1',
      x: 520,
      y: 350,
      width: 180,
      height: 50,
      type: 'moving',
      isMoving: true,
      baseX: 520,
      baseY: 350,
      moveAxis: 'y',
      moveRange: 35,
      moveSpeed: 2.1,
      borderColor: '#38bdf8',
    },
    { id: 'm4-p2', x: 790, y: 370, width: 440, height: 70, type: 'standard' },
    { id: 'm4-p3', x: 1530, y: 380, width: 440, height: 60, type: 'standard' },
    { id: 'm4-p4', x: 2060, y: 380, width: 620, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const checkpoints: Checkpoint[] = [
    { id: 'm4-cp1', x: 920, y: 370 },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'm4-g1', x: 1380, y: 190, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('m4-s1', 1010, 370, 3),
    ...makeSpikeCluster('m4-s2', 1710, 380, 4),
  ];

  const coins: Coin[] = [
    makeCoin('m4-c1', 200, 320),
    makeCoin('m4-c2', 610, 270),
    makeCoin('m4-c3', 1340, 290),
    makeCoin('m4-c4', 1380, 305),
    makeCoin('m4-c5', 1420, 290),
    makeCoin('m4-c6', 2250, 320),
  ];

  return {
    id: 'medium_4',
    difficulty: 'MEDIUM',
    levelNumber: 4,
    title: 'Moving Heights',
    subtitle: 'Kinetic Obstacles',
    lengthMeters: 140,
    startingSpeed: 310,
    maxSpeed: 420,
    platforms,
    spikes,
    coins,
    grapplePoints,
    checkpoints,
    finishLine: { x: 2500, y: 260, width: 32, height: 120 },
  };
}

function createMediumLevel5(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'm5-p0', x: -80, y: 380, width: 500, height: 60, type: 'start', label: 'START' },
    { id: 'm5-p1', x: 500, y: 380, width: 460, height: 60, type: 'standard' },
    {
      id: 'm5-p2',
      x: 1040,
      y: 350,
      width: 190,
      height: 50,
      type: 'moving',
      isMoving: true,
      baseX: 1040,
      baseY: 350,
      moveAxis: 'y',
      moveRange: 32,
      moveSpeed: 2.2,
      borderColor: '#38bdf8',
    },
    { id: 'm5-p3', x: 1320, y: 380, width: 440, height: 60, type: 'standard' },
    { id: 'm5-p4', x: 2060, y: 380, width: 620, height: 60, type: 'milestone', label: 'CHAMPION' },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'm5-g1', x: 1910, y: 190, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('m5-s1', 720, 380, 4),
    ...makeSpikeCluster('m5-s2', 1510, 380, 4),
  ];

  const coins: Coin[] = [
    makeCoin('m5-c1', 200, 320),
    makeCoin('m5-c2', 720, 260),
    makeCoin('m5-c3', 1135, 270),
    makeCoin('m5-c4', 1870, 290),
    makeCoin('m5-c5', 1910, 305),
    makeCoin('m5-c6', 1950, 290),
    makeCoin('m5-c7', 2280, 320),
  ];

  return {
    id: 'medium_5',
    difficulty: 'MEDIUM',
    levelNumber: 5,
    title: 'Skyline Gauntlet',
    subtitle: 'Medium Finale',
    lengthMeters: 145,
    startingSpeed: 320,
    maxSpeed: 440,
    platforms,
    spikes,
    coins,
    grapplePoints,
    finishLine: { x: 2500, y: 260, width: 32, height: 120 },
  };
}

// ===========================================================================
// HARD LEVELS (1 — 5)
// ===========================================================================

function createHardLevel1(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'h1-p0', x: -80, y: 380, width: 480, height: 60, type: 'start', label: 'START' },
    { id: 'h1-p1', x: 480, y: 380, width: 450, height: 60, type: 'standard' },
    { id: 'h1-p2', x: 1040, y: 370, width: 450, height: 70, type: 'standard' },
    { id: 'h1-p3', x: 1600, y: 380, width: 600, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('h1-s1', 680, 380, 4),
    ...makeSpikeCluster('h1-s2', 1240, 370, 4),
  ];

  const coins: Coin[] = [
    makeCoin('h1-c1', 200, 320),
    makeCoin('h1-c2', 680, 260),
    makeCoin('h1-c3', 1240, 250),
    makeCoin('h1-c4', 1800, 320),
  ];

  return {
    id: 'hard_1',
    difficulty: 'HARD',
    levelNumber: 1,
    title: 'Adrenaline',
    subtitle: 'Fast Starting Tempo',
    lengthMeters: 120,
    startingSpeed: 350,
    maxSpeed: 480,
    platforms,
    spikes,
    coins,
    grapplePoints: [],
    finishLine: { x: 2020, y: 260, width: 32, height: 120 },
  };
}

function createHardLevel2(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'h2-p0', x: -80, y: 380, width: 460, height: 60, type: 'start', label: 'START' },
    { id: 'h2-p1', x: 460, y: 380, width: 460, height: 60, type: 'standard' },
    { id: 'h2-p2', x: 1020, y: 370, width: 460, height: 70, type: 'standard' },
    { id: 'h2-p3', x: 1580, y: 380, width: 600, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('h2-s1', 670, 380, 5),
    ...makeSpikeCluster('h2-s2', 1230, 370, 5),
  ];

  const coins: Coin[] = [
    makeCoin('h2-c1', 200, 320),
    makeCoin('h2-c2', 670, 255),
    makeCoin('h2-c3', 1230, 245),
  ];

  return {
    id: 'hard_2',
    difficulty: 'HARD',
    levelNumber: 2,
    title: 'Needle Eye',
    subtitle: 'Air Dash Infiltration',
    lengthMeters: 120,
    startingSpeed: 360,
    maxSpeed: 500,
    platforms,
    spikes,
    coins,
    grapplePoints: [],
    finishLine: { x: 2000, y: 260, width: 32, height: 120 },
  };
}

function createHardLevel3(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'h3-p0', x: -80, y: 380, width: 460, height: 60, type: 'start', label: 'START' },
    { id: 'h3-p1', x: 740, y: 380, width: 440, height: 60, type: 'standard' },
    { id: 'h3-p2', x: 1540, y: 370, width: 450, height: 70, type: 'standard' },
    { id: 'h3-p3', x: 2100, y: 380, width: 600, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'h3-g1', x: 600, y: 185, radius: 12, active: true },
    { id: 'h3-g2', x: 1390, y: 185, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('h3-s1', 940, 380, 4),
  ];

  const coins: Coin[] = [
    makeCoin('h3-c1', 560, 285),
    makeCoin('h3-c2', 600, 300),
    makeCoin('h3-c3', 640, 285),
    makeCoin('h3-c4', 1350, 285),
    makeCoin('h3-c5', 1390, 300),
    makeCoin('h3-c6', 1430, 285),
  ];

  return {
    id: 'hard_3',
    difficulty: 'HARD',
    levelNumber: 3,
    title: 'Apex Swing',
    subtitle: 'High Velocity Swings',
    lengthMeters: 140,
    startingSpeed: 365,
    maxSpeed: 520,
    platforms,
    spikes,
    coins,
    grapplePoints,
    finishLine: { x: 2500, y: 260, width: 32, height: 120 },
  };
}

function createHardLevel4(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'h4-p0', x: -80, y: 380, width: 440, height: 60, type: 'start', label: 'START' },
    {
      id: 'h4-p1',
      x: 460,
      y: 350,
      width: 170,
      height: 50,
      type: 'moving',
      isMoving: true,
      baseX: 460,
      baseY: 350,
      moveAxis: 'y',
      moveRange: 38,
      moveSpeed: 2.5,
      borderColor: '#ef4444',
    },
    { id: 'h4-p2', x: 720, y: 370, width: 420, height: 70, type: 'standard' },
    { id: 'h4-p3', x: 1500, y: 380, width: 440, height: 60, type: 'standard' },
    { id: 'h4-p4', x: 2040, y: 380, width: 620, height: 60, type: 'milestone', label: 'FINISH' },
  ];

  const checkpoints: Checkpoint[] = [
    { id: 'h4-cp1', x: 840, y: 370 },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'h4-g1', x: 1360, y: 185, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('h4-s1', 930, 370, 4),
    ...makeSpikeCluster('h4-s2', 1700, 380, 5),
  ];

  const coins: Coin[] = [
    makeCoin('h4-c1', 200, 320),
    makeCoin('h4-c2', 545, 270),
    makeCoin('h4-c3', 1320, 285),
    makeCoin('h4-c4', 1360, 300),
    makeCoin('h4-c5', 1400, 285),
    makeCoin('h4-c6', 2250, 320),
  ];

  return {
    id: 'hard_4',
    difficulty: 'HARD',
    levelNumber: 4,
    title: 'Overclocked',
    subtitle: 'Moving Death Traps',
    lengthMeters: 140,
    startingSpeed: 370,
    maxSpeed: 540,
    platforms,
    spikes,
    coins,
    grapplePoints,
    checkpoints,
    finishLine: { x: 2480, y: 260, width: 32, height: 120 },
  };
}

function createHardLevel5(): HandcraftedLevel {
  const platforms: Platform[] = [
    { id: 'h5-p0', x: -80, y: 380, width: 440, height: 60, type: 'start', label: 'START' },
    { id: 'h5-p1', x: 440, y: 380, width: 440, height: 60, type: 'standard' },
    {
      id: 'h5-p2',
      x: 990,
      y: 350,
      width: 170,
      height: 50,
      type: 'moving',
      isMoving: true,
      baseX: 990,
      baseY: 350,
      moveAxis: 'y',
      moveRange: 38,
      moveSpeed: 2.8,
      borderColor: '#ef4444',
    },
    { id: 'h5-p3', x: 1260, y: 380, width: 420, height: 60, type: 'standard' },
    { id: 'h5-p4', x: 2040, y: 380, width: 620, height: 60, type: 'milestone', label: 'LEGEND' },
  ];

  const grapplePoints: GrapplePoint[] = [
    { id: 'h5-g1', x: 1880, y: 185, radius: 12, active: true },
  ];

  const spikes: Spike[] = [
    ...makeSpikeCluster('h5-s1', 650, 380, 5),
    ...makeSpikeCluster('h5-s2', 1460, 380, 5),
  ];

  const coins: Coin[] = [
    makeCoin('h5-c1', 200, 320),
    makeCoin('h5-c2', 650, 255),
    makeCoin('h5-c3', 1075, 270),
    makeCoin('h5-c4', 1840, 285),
    makeCoin('h5-c5', 1880, 300),
    makeCoin('h5-c6', 1920, 285),
    makeCoin('h5-c7', 2250, 320),
  ];

  return {
    id: 'hard_5',
    difficulty: 'HARD',
    levelNumber: 5,
    title: 'Final Mastery',
    subtitle: 'The Ultimate Trial',
    lengthMeters: 145,
    startingSpeed: 380,
    maxSpeed: 560,
    platforms,
    spikes,
    coins,
    grapplePoints,
    finishLine: { x: 2480, y: 260, width: 32, height: 120 },
  };
}

// ---------------------------------------------------------------------------
// LEVEL REGISTRY LOOKUP
// ---------------------------------------------------------------------------
export function getHandcraftedLevel(difficulty: GameDifficulty, levelNumber: number): HandcraftedLevel {
  const num = Math.min(Math.max(1, levelNumber), 5);
  switch (difficulty) {
    case 'EASY':
      if (num === 1) return createEasyLevel1();
      if (num === 2) return createEasyLevel2();
      if (num === 3) return createEasyLevel3();
      if (num === 4) return createEasyLevel4();
      return createEasyLevel5();

    case 'MEDIUM':
      if (num === 1) return createMediumLevel1();
      if (num === 2) return createMediumLevel2();
      if (num === 3) return createMediumLevel3();
      if (num === 4) return createMediumLevel4();
      return createMediumLevel5();

    case 'HARD':
      if (num === 1) return createHardLevel1();
      if (num === 2) return createHardLevel2();
      if (num === 3) return createHardLevel3();
      if (num === 4) return createHardLevel4();
      return createHardLevel5();

    default:
      return createEasyLevel1();
  }
}

export function getHandcraftedLevelById(levelId: string): HandcraftedLevel | null {
  const parts = levelId.split('_');
  if (parts.length !== 2) return null;
  const diff = parts[0].toUpperCase() as GameDifficulty;
  const num = parseInt(parts[1], 10);
  if (!['EASY', 'MEDIUM', 'HARD'].includes(diff) || isNaN(num)) return null;
  return getHandcraftedLevel(diff, num);
}

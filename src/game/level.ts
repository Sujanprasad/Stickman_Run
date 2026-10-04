import { Coin, Platform, Spike } from './types.ts';

/**
 * Creates the platform layout tuned for 2D Auto-Runner flow.
 *
 * Sequence:
 * START runway
 *   ↓
 * Normal platform
 *   ↓
 * Small gap
 *   ↓
 * Spikes (jump over spikes)
 *   ↓
 * Coin section
 *   ↓
 * Stepped / elevated platform
 *   ↓
 * Spike section (jump or dash invulnerably)
 *   ↓
 * Long gap (jump + mid-air dash)
 *   ↓
 * Finish / Checkpoint
 *   ↓
 * Endless progressive runner track
 */
export function createLevel(): Platform[] {
  const platforms: Platform[] = [
    // 1. START Runway (Safe start to build momentum)
    {
      id: 'plat-start',
      x: -250,
      y: 400,
      width: 780,
      height: 90,
      type: 'start',
      label: 'START',
      color: '#1a2234',
      borderColor: '#38bdf8',
    },

    // 2. Normal platform after a gentle 95px gap
    {
      id: 'plat-1',
      x: 625,
      y: 400,
      width: 290,
      height: 80,
      type: 'standard',
    },

    // 3. Platform after small 100px gap with 2 spikes on it
    {
      id: 'plat-2',
      x: 1015,
      y: 400,
      width: 320,
      height: 80,
      type: 'standard',
    },

    // 4. Coin section platform (elevated step up)
    {
      id: 'plat-3',
      x: 1435,
      y: 350,
      width: 300,
      height: 90,
      type: 'standard',
    },

    // 5. Stepped / elevated platform
    {
      id: 'plat-4',
      x: 1835,
      y: 300,
      width: 240,
      height: 100,
      type: 'standard',
    },

    // 6. Spike Section platform (jump or dash with invulnerability)
    {
      id: 'plat-5',
      x: 2175,
      y: 300,
      width: 340,
      height: 40,
      type: 'standard',
    },

    // 7. Finish / Checkpoint platform after a LONG GAP (230px, requires mid-air dash!)
    {
      id: 'plat-checkpoint-100m',
      x: 2745,
      y: 300,
      width: 380,
      height: 50,
      type: 'milestone',
      label: '100m CHECKPOINT',
      borderColor: '#38bdf8',
    },

    // 8. Continuing course
    {
      id: 'plat-7',
      x: 3225,
      y: 260,
      width: 220,
      height: 40,
      type: 'standard',
    },
    {
      id: 'plat-8',
      x: 3545,
      y: 220,
      width: 240,
      height: 40,
      type: 'standard',
    },

    // 150m Milestone
    {
      id: 'plat-milestone-150m',
      x: 3885,
      y: 260,
      width: 340,
      height: 45,
      type: 'milestone',
      label: '150m',
      borderColor: '#34d399',
    },

    // Rhythmic hops & staggered ledges
    {
      id: 'plat-9',
      x: 4325,
      y: 260,
      width: 180,
      height: 40,
      type: 'standard',
    },
    {
      id: 'plat-10',
      x: 4605,
      y: 210,
      width: 180,
      height: 40,
      type: 'standard',
    },

    // 200m Milestone
    {
      id: 'plat-milestone-200m',
      x: 4885,
      y: 250,
      width: 360,
      height: 50,
      type: 'milestone',
      label: '200m',
      borderColor: '#f59e0b',
    },
  ];

  // Procedural extended runner course with gaps tuned for scaling speeds
  let currentX = 5345;
  let currentY = 250;
  let counter = 11;
  const targetDistance = 30000;

  while (currentX < targetDistance) {
    const gap = 90 + Math.random() * 85;
    const width = 160 + Math.random() * 180;
    const height = 36 + Math.floor(Math.random() * 20);

    const deltaY = (Math.random() - 0.5) * 80;
    currentY = Math.max(140, Math.min(420, currentY + deltaY));
    currentX += gap;

    const meters = Math.round(currentX / 20);
    const isMilestone = meters % 50 < 4;

    platforms.push({
      id: `plat-proc-${counter++}`,
      x: currentX,
      y: currentY,
      width: isMilestone ? Math.max(width, 280) : width,
      height,
      type: isMilestone ? 'milestone' : 'standard',
      label: isMilestone ? `${Math.floor(meters / 10) * 10}m` : undefined,
      borderColor: isMilestone ? '#38bdf8' : undefined,
    });

    currentX += width;
  }

  return platforms;
}

/**
 * Creates triangular spike obstacles tuned for auto-runner reaction times.
 */
export function createSpikes(platforms: Platform[]): Spike[] {
  const spikes: Spike[] = [];
  let spikeCounter = 1;

  const addSpikeCluster = (startX: number, baseY: number, count: number, width = 18, height = 22) => {
    for (let i = 0; i < count; i++) {
      spikes.push({
        id: `spike-${spikeCounter++}`,
        x: startX + i * width,
        y: baseY,
        width,
        height,
      });
    }
  };

  // 1. Spikes on plat-2 (x: 1015, y: 400). Two spikes in center to jump over
  addSpikeCluster(1140, 400, 2, 18, 22);

  // 2. Spike Section on plat-5 (x: 2175, y: 300, width: 340).
  // 4 spikes together (width ~72px). Great for jumping or using DASH invulnerability!
  addSpikeCluster(2310, 300, 4, 18, 24);

  // 3. Spikes on continuing course (plat-7, plat-8, plat-milestone-150m)
  addSpikeCluster(3320, 260, 2, 18, 22);
  addSpikeCluster(3640, 220, 3, 18, 22);
  addSpikeCluster(4010, 260, 4, 18, 24);
  addSpikeCluster(5030, 250, 3, 18, 24);

  // 4. Procedural spikes on wide platforms in extended runner zone
  for (const plat of platforms) {
    if (plat.id.startsWith('plat-proc-') && plat.width >= 200) {
      const hash = Math.sin(plat.x) * 10000;
      const rand = hash - Math.floor(hash);

      if (rand > 0.6) {
        const spikeCount = rand > 0.85 ? 3 : 2;
        const totalW = spikeCount * 18;
        const startX = plat.x + (plat.width - totalW) / 2;
        addSpikeCluster(startX, plat.y, spikeCount, 18, 22);
      }
    }
  }

  return spikes;
}

/**
 * Creates collectible coins placed in rhythm along runner jumps and trajectory arcs.
 */
export function createCoins(platforms: Platform[], spikes: Spike[]): Coin[] {
  const coins: Coin[] = [];
  let coinCounter = 1;

  const addCoin = (x: number, y: number, animPhase = Math.random() * Math.PI * 2) => {
    coins.push({
      id: `coin-${coinCounter++}`,
      x,
      y,
      baseY: y,
      radius: 9.5,
      collected: false,
      animPhase,
      value: 10,
    });
  };

  // 1. Opening runway encouragement coins
  addCoin(120, 350, 0);
  addCoin(260, 350, 0.8);
  addCoin(400, 350, 1.6);

  // 2. Trajectory arc over first gap (between plat-start and plat-1)
  addCoin(575, 330, 2.2);

  // 3. Jump arc over spikes on plat-2 (spikes at 1140)
  addCoin(1120, 330, 0.4);
  addCoin(1155, 310, 1.0); // Apex of jump over spikes!
  addCoin(1190, 330, 1.6);

  // 4. Dedicated Coin Section on plat-3 (x: 1435, y: 350)
  // Rhythmic wave of 4 golden coins
  addCoin(1480, 300, 2.0);
  addCoin(1540, 280, 2.6);
  addCoin(1600, 280, 3.2);
  addCoin(1660, 300, 3.8);

  // 5. Coins on stepped platform plat-4
  addCoin(1910, 250, 4.4);
  addCoin(1980, 250, 5.0);

  // 6. Hazardous spike section on plat-5: Coins directly over spike bed
  addCoin(2280, 250, 5.6);
  addCoin(2335, 230, 0.2); // Hovering over spikes (reward for dashing or high jump!)
  addCoin(2390, 250, 0.8);

  // 7. Long Gap Trajectory Coins (between plat-5 and checkpoint, x: 2515 to 2665)
  // Rewarding the player for mid-air DASH!
  addCoin(2540, 260, 1.4);
  addCoin(2605, 260, 2.0);
  addCoin(2670, 260, 2.6);

  // 8. Checkpoint celebration coins
  addCoin(2820, 250, 3.2);
  addCoin(2940, 250, 3.8);

  // 9. Continuing course coins
  addCoin(3335, 210, 4.4);
  addCoin(3655, 170, 5.0);
  addCoin(3990, 210, 5.6);
  addCoin(4050, 210, 0.2);
  addCoin(4415, 210, 0.8);
  addCoin(4695, 160, 1.4);
  addCoin(4990, 200, 2.0);
  addCoin(5090, 200, 2.6);

  // 10. Procedural coins across extended platforms
  for (let i = 0; i < platforms.length; i++) {
    const plat = platforms[i];
    if (!plat.id.startsWith('plat-proc-')) continue;

    const platformSpikes = spikes.filter(
      (s) => s.x >= plat.x && s.x + s.width <= plat.x + plat.width && Math.abs(s.y - plat.y) < 5
    );

    if (platformSpikes.length > 0) {
      const centerSpike = platformSpikes[Math.floor(platformSpikes.length / 2)];
      addCoin(centerSpike.x + centerSpike.width / 2, plat.y - 65);
    } else {
      const hash = Math.sin(plat.x) * 10000;
      const rand = hash - Math.floor(hash);

      if (rand > 0.35) {
        addCoin(plat.x + plat.width * 0.4, plat.y - 45);
      }
      if (rand > 0.7) {
        addCoin(plat.x + plat.width * 0.75, plat.y - 45);
      }
    }
  }

  return coins;
}

/**
 * Checks if the player has fallen into the void
 */
export function isPlayerInVoid(playerY: number, voidThreshold = 800): boolean {
  return playerY > voidThreshold;
}

import {
  Camera,
  Checkpoint,
  Coin,
  FinishLine,
  FloatingText,
  GameDifficulty,
  GameOptions,
  GameStats,
  GameStatus,
  GrapplePoint,
  HandcraftedLevel,
  KeyState,
  MotionGhost,
  Particle,
  Platform,
  Player,
  Spike,
} from './types.ts';
import {
  DEBUG_LEVEL,
  getHandcraftedLevel,
  getHandcraftedLevelById,
} from './handcraftedLevels.ts';
import {
  createInitialPlayer,
  updatePlayerInputAndPhysics,
  updatePlayerDeath,
  triggerPlayerDeath,
  triggerPlayerGrapple,
  releasePlayerGrapple,
  createLandingDust,
  createJumpDust,
  createDeathParticles,
  createCoinCollectParticles,
  createDashParticles,
  createGrappleSparkParticles,
} from './player.ts';
import { createCamera, updateCamera, triggerCameraShake, calculateAdaptiveZoom } from './camera.ts';
import { resolveMovementAndCollisions } from './collision.ts';
import {
  checkPlayerSpikeCollision,
  checkPlayerCoinCollision,
  DASH_CONFIG,
  GRAPPLE_CONFIG,
  findNearestGrapplePoint,
  calculateRunSpeed,
  DIFFICULTY_CONFIG,
} from './physics.ts';
import { renderGame } from './renderer.ts';
import { soundManager } from './audio.ts';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private gameTime = 0;

  // Entities & Level State
  public status: GameStatus = 'MAIN_MENU';
  public player: Player;
  public currentLevel: HandcraftedLevel;
  public platforms: Platform[] = [];
  public spikes: Spike[] = [];
  public coins: Coin[] = [];
  public grapplePoints: GrapplePoint[] = [];
  public checkpoints: Checkpoint[] = [];
  public finishLine: FinishLine | null = null;
  public activeCheckpoint: Checkpoint | null = null;

  public floatingTexts: FloatingText[] = [];
  public ghosts: MotionGhost[] = [];
  public camera: Camera;
  public particles: Particle[] = [];
  public dpr = 1;

  // Navigation tracking
  public previousMenu: 'MAIN_MENU' | 'PAUSED' = 'MAIN_MENU';

  // Stats
  public stats: GameStats = {
    distance: 0,
    maxDistance: 0,
    bestDistance: 0,
    coinsCount: 0,
    score: 0,
    bestScore: 0,
    movesCount: 0,
    jumpsCount: 0,
    elapsedTime: 0,
    // Handcrafted level stats
    currentLevelNumber: 1,
    levelTitle: 'First Steps',
    levelSubtitle: 'Run & Jump Basics',
    levelLengthMeters: 130,
    isLevelComplete: false,
    unlockedLevels: {
      EASY: 1,
      MEDIUM: 1,
      HARD: 1,
    },
    bestScoreByLevel: {},
    bestTimeByLevel: {},
    activeCheckpoint: null,
    coinsInLevel: 0,
    totalCoinsInLevel: 0,
    // Difficulty
    difficulty: 'EASY',
    bestDistanceByDifficulty: {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    },
    bestScoreByDifficulty: {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    },
    options: {
      sound: true,
      music: true,
      screenShake: true,
      particles: true,
    },
    dashReady: true,
    dashCooldownProgress: 1,
    isDashing: false,
    grappleReady: true,
    grappleCooldownProgress: 1,
    isGrappling: false,
    grappleHasTarget: false,
    grappleNoTargetPulse: false,
  };

  private grappleNoTargetTimer = 0;

  // Keyboard and Input state
  public keys: KeyState = {
    left: false,
    right: false,
    jump: false,
    jumpPressedThisFrame: false,
    dash: false,
    dashPressedThisFrame: false,
    grapple: false,
    grapplePressedThisFrame: false,
    restart: false,
  };

  private stepDistanceAccumulator = 0;
  private onStateChangeCallback?: (engine: GameEngine) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;

    // Load options from localStorage
    try {
      const savedOptions = localStorage.getItem('stickman_options');
      if (savedOptions) {
        const parsed = JSON.parse(savedOptions);
        this.stats.options = {
          sound: parsed.sound ?? true,
          music: parsed.music ?? true,
          screenShake: parsed.screenShake ?? true,
          particles: parsed.particles ?? true,
        };
      }
    } catch {}

    soundManager.enabled = this.stats.options.sound;

    // Load unlocked level progress per difficulty
    try {
      const diffs: GameDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
      for (const d of diffs) {
        const key = `stickman_unlocked_${d.toLowerCase()}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const val = parseInt(saved, 10);
          if (!isNaN(val) && val >= 1) {
            this.stats.unlockedLevels[d] = Math.min(val, 5);
          }
        }
      }
    } catch {}

    // Load best scores & times for every handcrafted level
    try {
      const diffs: GameDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
      for (const d of diffs) {
        for (let lvl = 1; lvl <= 5; lvl++) {
          const key = `${d.toLowerCase()}_${lvl}`;
          const savedScore = localStorage.getItem(`stickman_best_${key}_score`);
          if (savedScore) {
            this.stats.bestScoreByLevel[key] = parseInt(savedScore, 10) || 0;
          }
          const savedTime = localStorage.getItem(`stickman_best_${key}_time`);
          if (savedTime) {
            this.stats.bestTimeByLevel[key] = parseFloat(savedTime) || 0;
          }
        }
      }
    } catch {}

    this.player = createInitialPlayer();
    this.currentLevel = getHandcraftedLevel('EASY', 1);
    this.camera = createCamera(canvas.width, canvas.height);

    // Initial level setup
    this.loadLevel('EASY', 1, false);

    // Developer debug override
    if (DEBUG_LEVEL) {
      const dbg = getHandcraftedLevelById(DEBUG_LEVEL);
      if (dbg) {
        this.stats.difficulty = dbg.difficulty;
        this.status = 'PLAYING';
        this.loadLevel(dbg.difficulty, dbg.levelNumber, false);
      }
    }

    this.setupEventListeners();
  }

  public setOnStateChange(cb: (engine: GameEngine) => void) {
    this.onStateChangeCallback = cb;
  }

  public resize(width: number, height: number, dpr: number = 1) {
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.camera.viewportWidth = width;
    this.camera.viewportHeight = height;
    this.camera.zoom = calculateAdaptiveZoom(width, height);
  }

  // -------------------------------------------------------------------------
  // GAME STATE & HANDCRAFTED LEVEL NAVIGATION
  // -------------------------------------------------------------------------

  public goToMainMenu() {
    this.status = 'MAIN_MENU';
    this.notifyState();
  }

  public goToDifficultySelect() {
    this.status = 'DIFFICULTY_SELECT';
    this.notifyState();
  }

  public selectDifficulty(difficulty: GameDifficulty) {
    this.stats.difficulty = difficulty;
    this.status = 'LEVEL_SELECT';
    this.notifyState();
  }

  public goToLevelSelect() {
    this.status = 'LEVEL_SELECT';
    this.notifyState();
  }

  public startLevel(difficulty: GameDifficulty, levelNumber: number) {
    this.stats.difficulty = difficulty;
    this.status = 'PLAYING';
    this.activeCheckpoint = null;
    this.loadLevel(difficulty, levelNumber, false);
  }

  public restartGame(fromCheckpoint = false) {
    this.status = 'PLAYING';
    this.loadLevel(this.stats.difficulty, this.stats.currentLevelNumber, fromCheckpoint);
  }

  public nextLevel() {
    if (this.stats.currentLevelNumber < 5) {
      this.startLevel(this.stats.difficulty, this.stats.currentLevelNumber + 1);
    } else {
      this.goToLevelSelect();
    }
  }

  public pauseGame() {
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      this.notifyState();
    }
  }

  public resumeGame() {
    if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      this.notifyState();
    }
  }

  public togglePause() {
    if (this.status === 'PLAYING') {
      this.pauseGame();
    } else if (this.status === 'PAUSED') {
      this.resumeGame();
    }
  }

  public openOptions(from: 'MAIN_MENU' | 'PAUSED' = 'MAIN_MENU') {
    this.previousMenu = from;
    this.status = 'OPTIONS';
    this.notifyState();
  }

  public closeOptions() {
    this.status = this.previousMenu;
    this.notifyState();
  }

  public setOption<K extends keyof GameOptions>(key: K, value: GameOptions[K]) {
    this.stats.options[key] = value;
    if (key === 'sound') {
      soundManager.enabled = Boolean(value);
    }
    try {
      localStorage.setItem('stickman_options', JSON.stringify(this.stats.options));
    } catch {}
    this.notifyState();
  }

  // -------------------------------------------------------------------------
  // LEVEL LOADING & CHECKPOINT RESPAWN
  // -------------------------------------------------------------------------

  public loadLevel(difficulty: GameDifficulty, levelNumber: number, fromCheckpoint = false) {
    this.stats.difficulty = difficulty;
    this.stats.currentLevelNumber = levelNumber;

    const level = getHandcraftedLevel(difficulty, levelNumber);
    this.currentLevel = level;

    this.stats.levelTitle = level.title;
    this.stats.levelSubtitle = level.subtitle;
    this.stats.levelLengthMeters = level.lengthMeters;
    this.stats.isLevelComplete = false;

    // Deep clone level entities so mutability during a run is cleanly reset
    this.platforms = level.platforms.map((p) => ({ ...p }));
    this.spikes = level.spikes.map((s) => ({ ...s }));
    this.coins = level.coins.map((c) => ({ ...c, collected: false }));
    this.grapplePoints = level.grapplePoints.map((g) => ({ ...g }));
    this.checkpoints = (level.checkpoints || []).map((cp) => ({
      ...cp,
      reached: fromCheckpoint && this.activeCheckpoint?.id === cp.id,
    }));
    this.finishLine = { ...level.finishLine };

    this.stats.totalCoinsInLevel = this.coins.length;
    this.stats.coinsInLevel = 0;
    this.stats.coinsCount = 0;
    this.stats.score = 0;
    this.stats.elapsedTime = 0;
    this.stats.distance = 0;
    this.stats.maxDistance = 0;
    this.stats.movesCount = 0;
    this.stats.jumpsCount = 0;

    // Spawn player at start (or at active checkpoint if checkpoint restart)
    this.player = createInitialPlayer();
    if (fromCheckpoint && this.activeCheckpoint) {
      this.player.x = this.activeCheckpoint.x;
      this.player.y = this.activeCheckpoint.y;
    } else {
      this.player.x = 0;
      this.player.y = 380;
      this.activeCheckpoint = null;
    }

    this.particles = [];
    this.floatingTexts = [];
    this.ghosts = [];

    this.stats.dashReady = true;
    this.stats.dashCooldownProgress = 1;
    this.stats.isDashing = false;
    this.stats.grappleReady = true;
    this.stats.grappleCooldownProgress = 1;
    this.stats.isGrappling = false;
    this.stepDistanceAccumulator = 0;

    // Level best score lookup
    const levelKey = `${difficulty.toLowerCase()}_${levelNumber}`;
    this.stats.bestScore = this.stats.bestScoreByLevel[levelKey] || 0;

    // Center camera immediately
    this.camera.x = this.player.x + 80;
    this.camera.y = this.player.y - this.camera.viewportHeight * 0.12;
    this.camera.shakeIntensity = 0;
    this.camera.shakeTimer = 0;
    this.camera.shakeOffsetX = 0;
    this.camera.shakeOffsetY = 0;

    this.notifyState();
  }

  // -------------------------------------------------------------------------
  // INPUT LISTENERS
  // -------------------------------------------------------------------------

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  public stopLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public cleanup() {
    this.stopLoop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // ESC pauses/resumes gameplay or backs out of menus
    if (e.code === 'Escape') {
      e.preventDefault();
      if (this.status === 'PLAYING') {
        this.pauseGame();
        return;
      }
      if (this.status === 'PAUSED') {
        this.resumeGame();
        return;
      }
      if (this.status === 'OPTIONS') {
        this.closeOptions();
        return;
      }
      if (this.status === 'LEVEL_SELECT') {
        this.goToDifficultySelect();
        return;
      }
      if (this.status === 'DIFFICULTY_SELECT') {
        this.goToMainMenu();
        return;
      }
    }

    // Quick restart key
    if (e.code === 'KeyR') {
      if (this.status === 'PLAYING' || this.status === 'PAUSED' || this.status === 'GAME_OVER') {
        this.restartGame(false);
        return;
      }
    }

    // Game Over space / enter restart
    if (this.status === 'GAME_OVER') {
      if ((e.code === 'Space' || e.code === 'Enter') && this.player.deathTimer > 0.3) {
        this.restartGame(Boolean(this.activeCheckpoint));
      }
      return;
    }

    // Level Complete Enter / Space next level
    if (this.status === 'LEVEL_COMPLETE') {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.nextLevel();
      }
      return;
    }

    // Only process movement & jump/dash/grapple inputs when actually PLAYING
    if (this.status !== 'PLAYING') {
      return;
    }

    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyG'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      this.keys.left = true;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      this.keys.right = true;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (!this.keys.jump) {
        this.keys.jumpPressedThisFrame = true;
      }
      this.keys.jump = true;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (!this.keys.dash) {
        this.keys.dashPressedThisFrame = true;
      }
      this.keys.dash = true;
    }
    if (e.code === 'KeyG') {
      if (!this.keys.grapple) {
        this.keys.grapple = true;
        this.triggerGrappleAction();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      this.keys.left = false;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      this.keys.right = false;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      this.keys.jump = false;
      this.keys.jumpPressedThisFrame = false;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.keys.dash = false;
      this.keys.dashPressedThisFrame = false;
    }
    if (e.code === 'KeyG') {
      this.keys.grapple = false;
      this.keys.grapplePressedThisFrame = false;
    }
  };

  private handleBlur = () => {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.jumpPressedThisFrame = false;
    this.keys.dash = false;
    this.keys.dashPressedThisFrame = false;
    this.keys.grapple = false;
    this.keys.grapplePressedThisFrame = false;
    if (this.status === 'PLAYING') {
      this.pauseGame();
    }
  };

  /**
   * Feedback when attempting to grapple without a valid target in range
   */
  public handleGrappleNoTarget() {
    soundManager.playNoTargetSound();
    this.floatingTexts.push({
      id: `fnt-${Math.random()}`,
      x: this.player.x,
      y: this.player.y - 45,
      text: 'NO ANCHOR',
      life: 0,
      maxLife: 0.5,
      color: '#94a3b8',
    });
    this.stats.grappleNoTargetPulse = true;
    this.grappleNoTargetTimer = 0.25;
    this.notifyState();
  }

  /**
   * Single unified entry point for both Desktop G and Mobile GRAPPLE button.
   * - If already grappling: releases rope immediately with forward fling boost.
   * - If ready and target in range: immediately attaches, starts swing, spawns sparks.
   * - If ready and no target in range: triggers subtle feedback without consuming cooldown.
   */
  public triggerGrappleAction(): boolean {
    if (this.status !== 'PLAYING' || this.player.isDead) return false;

    // 1. Release if currently grappling
    if (this.player.grapple.isGrappling) {
      releasePlayerGrapple(
        this.player,
        () => {
          soundManager.playGrappleReleaseSound();
          this.notifyState();
        },
        true
      );
      return true;
    }

    // 2. Cannot grapple if on cooldown
    if (this.player.grapple.grappleCooldownTimer > 0) {
      return false;
    }

    // 3. Attach if valid anchor in range, else give no-target feedback
    const success = triggerPlayerGrapple(
      this.player,
      this.grapplePoints,
      () => {
        soundManager.playGrappleAttachSound();
        if (this.stats.options.screenShake) {
          triggerCameraShake(this.camera, GRAPPLE_CONFIG.SHAKE_INTENSITY, GRAPPLE_CONFIG.SHAKE_DURATION);
        }
        if (this.stats.options.particles && this.player.grapple.targetPoint) {
          this.particles.push(
            ...createGrappleSparkParticles(
              this.player.grapple.targetPoint.x,
              this.player.grapple.targetPoint.y,
              12
            )
          );
        }
        this.notifyState();
      },
      () => {
        this.handleGrappleNoTarget();
      }
    );

    return success;
  }

  // External input triggers for touch buttons
  public setVirtualInput(action: 'left' | 'right' | 'jump' | 'dash' | 'grapple', active: boolean) {
    if (this.status === 'GAME_OVER') {
      if (action === 'jump' && active && this.player.deathTimer > 0.3) {
        this.restartGame(Boolean(this.activeCheckpoint));
      }
      return;
    }

    if (this.status === 'LEVEL_COMPLETE') {
      if (action === 'jump' && active) {
        this.nextLevel();
      }
      return;
    }

    if (this.status !== 'PLAYING') {
      return;
    }

    if (action === 'left') this.keys.left = active;
    if (action === 'right') this.keys.right = active;
    if (action === 'jump') {
      if (active && !this.keys.jump) {
        this.keys.jumpPressedThisFrame = true;
      }
      this.keys.jump = active;
    }
    if (action === 'dash') {
      if (active && !this.keys.dash) {
        this.keys.dashPressedThisFrame = true;
      }
      this.keys.dash = active;
    }
    if (action === 'grapple') {
      if (active && !this.keys.grapple) {
        this.triggerGrappleAction();
      }
      this.keys.grapple = active;
    }
  }

  // -------------------------------------------------------------------------
  // MAIN GAME LOOP
  // -------------------------------------------------------------------------

  public startLoop() {
    // Explicitly cancel and clear any existing animation loop first
    // to prevent multiple overlapping loops from running concurrently
    this.stopLoop();

    this.lastTime = performance.now();
    const loop = (timestamp: number) => {
      // If loop was stopped or cancelled while this frame was pending, abort immediately
      if (this.animationFrameId === null) return;

      const rawDt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      const dt = Math.min(rawDt, 0.05);

      if (this.status === 'PLAYING') {
        this.update(dt);
      } else if (this.status === 'GAME_OVER') {
        if (this.player.deathTimer < 1.0) {
          this.updateDeathAnimation(dt);
        }
      }

      this.render();

      // Reset single-frame flags
      this.keys.jumpPressedThisFrame = false;
      this.keys.dashPressedThisFrame = false;
      this.keys.grapplePressedThisFrame = false;

      // Only schedule next frame if loop hasn't been stopped
      if (this.animationFrameId !== null) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private handleDeath(cause: 'spike' | 'void') {
    if (this.status === 'GAME_OVER' || this.player.isDead) return;

    this.status = 'GAME_OVER';
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.jumpPressedThisFrame = false;
    this.keys.dash = false;
    this.keys.dashPressedThisFrame = false;
    this.keys.grapple = false;
    this.keys.grapplePressedThisFrame = false;

    // Trigger player death physics & cancel abilities
    triggerPlayerDeath(this.player, cause);

    // Camera screen shake
    if (this.stats.options.screenShake) {
      triggerCameraShake(this.camera, cause === 'spike' ? 11 : 7, 0.38);
    }

    // Spawn death particles
    if (this.stats.options.particles) {
      this.particles.push(...createDeathParticles(this.player.x, this.player.y, 28));
    }

    soundManager.playDeathSound();
    this.notifyState();
  }

  private handleLevelComplete() {
    if (this.status === 'LEVEL_COMPLETE' || this.stats.isLevelComplete) return;

    this.status = 'LEVEL_COMPLETE';
    this.stats.isLevelComplete = true;

    // Release player inputs
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.jumpPressedThisFrame = false;
    this.keys.dash = false;
    this.keys.dashPressedThisFrame = false;
    this.keys.grapple = false;
    this.keys.grapplePressedThisFrame = false;

    // Completion score bonus (+500)
    this.stats.score += 500;

    // Audio cue
    soundManager.playLevelCompleteSound();

    // Celebration screen shake & particles
    if (this.stats.options.screenShake) {
      triggerCameraShake(this.camera, 6, 0.4);
    }
    if (this.stats.options.particles) {
      for (let i = 0; i < 35; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const speed = 100 + Math.random() * 240;
        this.particles.push({
          x: this.player.x + (Math.random() - 0.5) * 40,
          y: this.player.y - 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 3,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.4,
          color: Math.random() > 0.4 ? '#38bdf8' : '#facc15',
          alpha: 1.0,
        });
      }
    }

    // Progression: Unlock next level
    const diff = this.stats.difficulty;
    const currentNum = this.stats.currentLevelNumber;
    const currentHighest = this.stats.unlockedLevels[diff] || 1;
    if (currentNum >= currentHighest && currentNum < 5) {
      this.stats.unlockedLevels[diff] = currentNum + 1;
      try {
        localStorage.setItem(`stickman_unlocked_${diff.toLowerCase()}`, String(currentNum + 1));
      } catch {}
    }

    // Save best score & best time
    const levelKey = `${diff.toLowerCase()}_${currentNum}`;
    const previousBestScore = this.stats.bestScoreByLevel[levelKey] || 0;
    if (this.stats.score > previousBestScore) {
      this.stats.bestScoreByLevel[levelKey] = this.stats.score;
      this.stats.bestScore = this.stats.score;
      try {
        localStorage.setItem(`stickman_best_${levelKey}_score`, String(this.stats.score));
      } catch {}
    }

    const previousBestTime = this.stats.bestTimeByLevel[levelKey] || 0;
    if (previousBestTime === 0 || this.stats.elapsedTime < previousBestTime) {
      const roundedTime = Math.round(this.stats.elapsedTime * 10) / 10;
      this.stats.bestTimeByLevel[levelKey] = roundedTime;
      try {
        localStorage.setItem(`stickman_best_${levelKey}_time`, String(roundedTime));
      } catch {}
    }

    this.notifyState();
  }

  private updateDeathAnimation(dt: number) {
    updatePlayerDeath(this.player, dt);

    if (this.stats.options.particles) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
        }
      }
    }

    updateCamera(this.camera, this.player, dt);
  }

  private update(dt: number) {
    this.gameTime += dt;
    this.stats.elapsedTime += dt;

    // Calculate run speed tuned to this level's pacing
    const diffCfg = DIFFICULTY_CONFIG[this.stats.difficulty] || DIFFICULTY_CONFIG.EASY;
    const currentRunSpeed = Math.min(
      this.currentLevel.maxSpeed || diffCfg.maxSpeed,
      this.currentLevel.startingSpeed + this.stats.elapsedTime * diffCfg.accelerationRate
    );

    // Update dynamic moving platforms
    for (const plat of this.platforms) {
      if (plat.isMoving && plat.baseY !== undefined) {
        plat.prevY = plat.y;
        plat.prevX = plat.x;

        const speed = plat.moveSpeed || 1.8;
        const phase = plat.movePhase || 0;
        const range = plat.moveRange || 28;

        plat.y = plat.baseY + Math.sin(this.gameTime * speed + phase) * range;
        plat.currentVy = dt > 0 ? (plat.y - (plat.prevY ?? plat.y)) / dt : 0;
      }
    }

    // Handle player input, physics, dash, and grapple with handcrafted level run speed
    updatePlayerInputAndPhysics(
      this.player,
      this.keys,
      this.grapplePoints,
      dt,
      currentRunSpeed,
      () => {
        this.stats.jumpsCount++;
        if (this.stats.options.particles) {
          this.particles.push(...createJumpDust(this.player.x, this.player.y));
        }
        soundManager.playJumpSound();
        this.notifyState();
      },
      () => {
        soundManager.playDashSound();
        if (this.stats.options.screenShake) {
          triggerCameraShake(this.camera, DASH_CONFIG.SHAKE_INTENSITY, DASH_CONFIG.SHAKE_DURATION);
        }
        if (this.stats.options.particles) {
          this.particles.push(...createDashParticles(this.player.x, this.player.y, this.player.facing, 8));
        }
        this.notifyState();
      },
      () => {
        soundManager.playGrappleAttachSound();
        if (this.stats.options.screenShake) {
          triggerCameraShake(this.camera, GRAPPLE_CONFIG.SHAKE_INTENSITY, GRAPPLE_CONFIG.SHAKE_DURATION);
        }
        if (this.stats.options.particles && this.player.grapple.targetPoint) {
          this.particles.push(...createGrappleSparkParticles(this.player.grapple.targetPoint.x, this.player.grapple.targetPoint.y, 10));
        }
        this.notifyState();
      },
      () => {
        soundManager.playGrappleReleaseSound();
        this.notifyState();
      },
      () => {
        this.handleGrappleNoTarget();
      }
    );

    // Handle dash motion ghost trail spawning
    if (this.player.dash.isDashing) {
      this.player.dash.trailSpawnTimer += dt;
      if (this.player.dash.trailSpawnTimer >= DASH_CONFIG.TRAIL_INTERVAL) {
        this.player.dash.trailSpawnTimer = 0;
        this.ghosts.push({
          id: `ghost-${Math.random()}`,
          x: this.player.x,
          y: this.player.y,
          facing: this.player.facing,
          animState: this.player.animState,
          animTimer: this.player.animTimer,
          squishX: this.player.squishX,
          squishY: this.player.squishY,
          alpha: 0.65,
          life: 0,
          maxLife: DASH_CONFIG.TRAIL_LIFETIME,
        });
        if (this.stats.options.particles) {
          this.particles.push(...createDashParticles(this.player.x, this.player.y, this.player.facing, 2));
        }
      }
    }

    // Handle collision and movement with platforms
    const collision = resolveMovementAndCollisions(this.player, this.platforms, dt);

    // Support standing on moving platforms smoothly
    if (this.player.isGrounded && !this.player.dash.isDashing) {
      for (const plat of this.platforms) {
        if (
          plat.isMoving &&
          plat.prevY !== undefined &&
          this.player.x >= plat.x - 6 &&
          this.player.x <= plat.x + plat.width + 6 &&
          Math.abs(this.player.y - plat.prevY) < 8
        ) {
          this.player.y = plat.y;
          break;
        }
      }
    }

    // On Landing juice & dust
    if (collision.landed) {
      this.player.squishX = 1.25;
      this.player.squishY = 0.8;
      if (this.stats.options.particles) {
        this.particles.push(...createLandingDust(this.player.x, this.player.y, 6));
      }
    }

    // 1. Check spike hazard collisions (invulnerable during dash)
    if (!this.player.dash.isDashing) {
      for (const spike of this.spikes) {
        if (checkPlayerSpikeCollision(this.player, spike)) {
          this.handleDeath('spike');
          return;
        }
      }
    }

    // 2. Check collectible coin collisions
    for (const coin of this.coins) {
      if (!coin.collected && checkPlayerCoinCollision(this.player, coin)) {
        coin.collected = true;
        this.stats.coinsCount++;
        this.stats.coinsInLevel = this.stats.coinsCount;

        if (this.stats.options.particles) {
          this.particles.push(...createCoinCollectParticles(coin.x, coin.y, 16));
        }

        this.floatingTexts.push({
          id: `ft-${Math.random()}`,
          x: coin.x,
          y: coin.y - 12,
          text: '+10',
          life: 0,
          maxLife: 0.65,
          color: '#fde047',
        });

        soundManager.playCoinSound();
        this.notifyState();
      }
    }

    // 3. Check Checkpoints
    for (const cp of this.checkpoints) {
      if (!cp.reached && this.player.x >= cp.x - 15) {
        cp.reached = true;
        this.activeCheckpoint = { ...cp };
        this.stats.activeCheckpoint = { ...cp };
        soundManager.playCheckpointSound();
        this.floatingTexts.push({
          id: `cp-${Math.random()}`,
          x: cp.x,
          y: cp.y - 65,
          text: 'CHECKPOINT!',
          life: 0,
          maxLife: 1.0,
          color: '#22c55e',
        });
        if (this.stats.options.particles) {
          for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 70;
            this.particles.push({
              x: cp.x,
              y: cp.y - 30,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2.5,
              life: 0,
              maxLife: 0.35,
              color: '#22c55e',
              alpha: 0.9,
            });
          }
        }
        this.notifyState();
      }
    }

    // 4. Check Finish Line completion
    if (this.finishLine && this.player.x >= this.finishLine.x) {
      this.handleLevelComplete();
      return;
    }

    // 5. Void check (falling into abyss is fatal)
    if (this.status === 'PLAYING' && this.player.y > 680) {
      this.handleDeath('void');
      return;
    }

    // Update distance in meters (clamped to level length)
    const currentDistMeters = Math.min(
      this.currentLevel.lengthMeters,
      Math.max(0, Math.floor(this.player.x / 20))
    );
    this.stats.distance = currentDistMeters;

    if (currentDistMeters > this.stats.maxDistance) {
      this.stats.maxDistance = currentDistMeters;
    }

    // Score = (Coins * 10) + Distance
    this.stats.score = this.stats.coinsCount * 10 + this.stats.distance;

    // Update abilities HUD stats
    this.stats.dashReady = !this.player.dash.isDashing && this.player.dash.dashCooldownTimer <= 0;
    this.stats.dashCooldownProgress = this.player.dash.dashCooldownTimer <= 0
      ? 1
      : 1 - (this.player.dash.dashCooldownTimer / DASH_CONFIG.COOLDOWN);
    this.stats.isDashing = this.player.dash.isDashing;

    this.stats.grappleReady = !this.player.grapple.isGrappling && this.player.grapple.grappleCooldownTimer <= 0;
    this.stats.isGrappling = this.player.grapple.isGrappling;
    this.stats.grappleCooldownProgress = this.player.grapple.grappleCooldownTimer <= 0
      ? 1
      : 1 - (this.player.grapple.grappleCooldownTimer / GRAPPLE_CONFIG.COOLDOWN);

    // Detect if valid target anchor is currently in range
    const targetAnchor =
      !this.player.grapple.isGrappling && this.player.grapple.grappleCooldownTimer <= 0
        ? findNearestGrapplePoint(this.player, this.grapplePoints)
        : null;
    this.stats.grappleHasTarget = Boolean(targetAnchor);

    // Timer for no-target feedback pulse
    if (this.grappleNoTargetTimer > 0) {
      this.grappleNoTargetTimer -= dt;
      if (this.grappleNoTargetTimer <= 0) {
        this.stats.grappleNoTargetPulse = false;
      }
    }

    // Track movement strides for sound & foot dust
    if (Math.abs(this.player.vx) > 20 && this.player.isGrounded && !this.player.dash.isDashing) {
      this.stepDistanceAccumulator += Math.abs(this.player.vx) * dt;
      if (this.stepDistanceAccumulator >= 35) {
        this.stepDistanceAccumulator = 0;
        this.stats.movesCount++;
        if (this.stats.options.particles) {
          this.particles.push(
            ...createLandingDust(
              this.player.x - (this.player.facing === 'right' ? 8 : -8),
              this.player.y,
              2
            )
          );
        }
      }
    }

    // Update Motion Ghosts
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.life += dt;
      if (g.life >= g.maxLife) {
        this.ghosts.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Particles
    if (this.stats.options.particles) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
        }
      }
    }

    // Update Camera
    updateCamera(this.camera, this.player, dt);
  }

  private render() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const diffCfg = DIFFICULTY_CONFIG[this.stats.difficulty] || DIFFICULTY_CONFIG.EASY;
    const currentRunSpeed =
      this.status === 'PLAYING'
        ? Math.min(
            this.currentLevel?.maxSpeed || diffCfg.maxSpeed,
            (this.currentLevel?.startingSpeed || 240) + this.stats.elapsedTime * diffCfg.accelerationRate
          )
        : this.currentLevel?.startingSpeed || diffCfg.startingSpeed;

    renderGame(
      this.ctx,
      this.player,
      this.platforms,
      this.spikes,
      this.coins,
      this.floatingTexts,
      this.stats.options.particles ? this.particles : [],
      this.ghosts,
      this.camera,
      this.gameTime,
      currentRunSpeed,
      this.grapplePoints,
      this.checkpoints,
      this.finishLine
    );
  }

  private notifyState() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this);
    }
  }
}

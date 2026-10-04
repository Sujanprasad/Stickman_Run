export interface Vector2D {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PlatformType = 'standard' | 'start' | 'milestone' | 'high' | 'moving';

export interface Platform extends Rect {
  id: string;
  type?: PlatformType;
  label?: string;
  color?: string;
  borderColor?: string;
  // Moving platform attributes
  isMoving?: boolean;
  baseX?: number;
  baseY?: number;
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
  prevX?: number;
  prevY?: number;
  currentVy?: number;
}

export interface Spike {
  id: string;
  x: number;       // base left coordinate
  y: number;       // base bottom coordinate (resting on platform top)
  width: number;   // base width
  height: number;  // apex height upward
  platformId?: string;
}

export interface GrapplePoint {
  id: string;
  x: number;
  y: number;
  radius: number;
  active?: boolean;
}

export interface Coin {
  id: string;
  x: number;          // center X in world space
  y: number;          // current animated Y in world space
  baseY: number;      // anchor Y for floating bobbing
  radius: number;     // collision radius (~9-10px)
  collected: boolean;
  animPhase: number;  // individual rotation/bob offset
  value: number;      // score value (+10)
  platformId?: string; // Optional reference for coins riding moving platforms
  offsetY?: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  alpha: number;
}

export interface MotionGhost {
  id: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  animState: PlayerAnimState;
  animTimer: number;
  squishX: number;
  squishY: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export type PlayerAnimState = 'idle' | 'running' | 'jumping' | 'falling' | 'landing' | 'dead';

export interface DashState {
  isDashing: boolean;
  dashTimer: number;
  dashCooldownTimer: number;
  dashDirection: 'left' | 'right';
  trailSpawnTimer: number;
}

export interface GrappleState {
  isGrappling: boolean;
  targetPoint: GrapplePoint | null;
  grappleTimer: number;
  grappleCooldownTimer: number;
  ropeAttachAnim: number;
  initialDistance: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  wasGrounded: boolean;
  facing: 'left' | 'right';
  animState: PlayerAnimState;
  animTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  squishX: number;
  squishY: number;
  stepSoundTimer: number;
  // Death state
  isDead: boolean;
  deathTimer: number;
  deathRotation: number;
  deathCause: 'spike' | 'void' | null;
  // Dash state
  dash: DashState;
  // Grapple state
  grapple: GrappleState;
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  // Screen shake
  shakeIntensity: number;
  shakeDuration: number;
  shakeTimer: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  reached?: boolean;
}

export interface FinishLine {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandcraftedLevel {
  id: string;
  difficulty: GameDifficulty;
  levelNumber: number;
  title: string;
  subtitle: string;
  lengthMeters: number;
  startingSpeed: number;
  maxSpeed?: number;
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  grapplePoints: GrapplePoint[];
  checkpoints?: Checkpoint[];
  finishLine: FinishLine;
}

export type GameStatus =
  | 'MAIN_MENU'
  | 'DIFFICULTY_SELECT'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'OPTIONS'
  | 'GAME_OVER'
  | 'LEVEL_COMPLETE';

export type GameDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameOptions {
  sound: boolean;
  music: boolean;
  screenShake: boolean;
  particles: boolean;
}

export interface GameStats {
  distance: number;
  maxDistance: number;
  bestDistance: number;
  coinsCount: number;
  score: number;
  bestScore: number;
  movesCount: number;
  jumpsCount: number;
  elapsedTime: number;
  // Handcrafted Level System
  currentLevelNumber: number;
  levelTitle: string;
  levelSubtitle: string;
  levelLengthMeters: number;
  isLevelComplete: boolean;
  unlockedLevels: Record<GameDifficulty, number>;
  bestScoreByLevel: Record<string, number>;
  bestTimeByLevel: Record<string, number>;
  activeCheckpoint: Checkpoint | null;
  coinsInLevel: number;
  totalCoinsInLevel: number;
  // Difficulty and options state
  difficulty: GameDifficulty;
  bestDistanceByDifficulty: Record<GameDifficulty, number>;
  bestScoreByDifficulty: Record<GameDifficulty, number>;
  options: GameOptions;
  // Dash ability HUD state
  dashReady: boolean;
  dashCooldownProgress: number; // 0 to 1 (1 = fully ready)
  isDashing: boolean;
  // Grapple ability HUD state
  grappleReady: boolean;
  isGrappling: boolean;
  grappleCooldownProgress: number; // 0 to 1 (1 = fully ready)
  grappleHasTarget: boolean;       // whether a valid anchor is within range
  grappleNoTargetPulse: boolean;   // brief pulse trigger when grapple pressed with no target
}

export interface KeyState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressedThisFrame: boolean;
  dash: boolean;
  dashPressedThisFrame: boolean;
  grapple: boolean;
  grapplePressedThisFrame: boolean;
  restart: boolean;
}

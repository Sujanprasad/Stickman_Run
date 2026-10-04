import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine.ts';
import { GameDifficulty, GameOptions, GameStats, GameStatus } from './game/types.ts';
import { DIFFICULTY_CONFIG } from './game/physics.ts';
import { getHandcraftedLevel } from './game/handcraftedLevels.ts';
import {
  Play,
  RotateCcw,
  Trophy,
  ArrowUp,
  Skull,
  Coins,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Pause,
  ArrowLeft,
  Settings,
  Flame,
  Check,
  X,
  Anchor,
  Lock,
  Flag,
  Timer,
  ChevronRight,
  Star,
  Award,
  Smartphone,
} from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const lastGrappleTapTimeRef = useRef<number>(0);

  const [gameStatus, setGameStatus] = useState<GameStatus>('MAIN_MENU');
  const [jumpActive, setJumpActive] = useState<boolean>(false);
  const [dashActive, setDashActive] = useState<boolean>(false);
  const [grappleActive, setGrappleActive] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [dismissPortraitWarning, setDismissPortraitWarning] = useState<boolean>(false);

  const [stats, setStats] = useState<GameStats>({
    distance: 0,
    maxDistance: 0,
    bestDistance: 0,
    coinsCount: 0,
    score: 0,
    bestScore: 0,
    movesCount: 0,
    jumpsCount: 0,
    elapsedTime: 0,
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
  });

  // Sync state from engine to React state
  const updateReactState = useCallback((engine: GameEngine) => {
    setGameStatus(engine.status);
    setStats({ ...engine.stats });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const isP = window.innerHeight > window.innerWidth;
      setIsPortrait(isP);

      if (canvas && engineRef.current) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const w = window.innerWidth;
        const h = window.innerHeight;
        engineRef.current.resize(w, h, dpr);
      }
    };

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.setOnStateChange(updateReactState);

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    engine.startLoop();

    // High frequency stats poll for smooth UI counter updates while running
    const statsInterval = setInterval(() => {
      if (engineRef.current) {
        setStats({ ...engineRef.current.stats });
        setGameStatus((prev) => {
          if (engineRef.current && prev !== engineRef.current.status) {
            return engineRef.current.status;
          }
          return prev;
        });
      }
    }, 50);

    return () => {
      clearInterval(statsInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      engine.cleanup();
      engineRef.current = null;
    };
  }, [updateReactState]);

  // Pointer event handlers: modern, rock-solid, touch/mouse unified with zero accidental duplicate activations
  const handleJumpPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setJumpActive(true);
    engineRef.current?.setVirtualInput('jump', true);
  };

  const handleJumpPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setJumpActive(false);
    engineRef.current?.setVirtualInput('jump', false);
  };

  const handleDashPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDashActive(true);
    engineRef.current?.setVirtualInput('dash', true);
  };

  const handleDashPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setDashActive(false);
    engineRef.current?.setVirtualInput('dash', false);
  };

  const handleGrapplePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const now = performance.now();
    // Guard against rapid duplicate synthetic event triggers (160ms debounce)
    if (now - lastGrappleTapTimeRef.current < 160) return;
    lastGrappleTapTimeRef.current = now;

    setGrappleActive(true);
    // Directly triggers the exact same unified action as desktop keyboard G
    engineRef.current?.triggerGrappleAction();
  };

  const handleGrapplePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setGrappleActive(false);
  };

  // Actions
  const handlePlayClicked = () => {
    engineRef.current?.goToDifficultySelect();
  };

  const handleDifficultySelected = (diff: GameDifficulty) => {
    engineRef.current?.selectDifficulty(diff);
  };

  const handleLevelSelected = (levelNum: number) => {
    engineRef.current?.startLevel(stats.difficulty, levelNum);
  };

  const handleRetry = (fromCheckpoint = false) => {
    engineRef.current?.restartGame(fromCheckpoint);
  };

  const handleNextLevel = () => {
    engineRef.current?.nextLevel();
  };

  const handlePause = () => {
    engineRef.current?.pauseGame();
  };

  const handleResume = () => {
    engineRef.current?.resumeGame();
  };

  const handleMainMenu = () => {
    engineRef.current?.goToMainMenu();
  };

  const handleDifficultySelectBack = () => {
    engineRef.current?.goToMainMenu();
  };

  const handleLevelSelectBack = () => {
    engineRef.current?.goToDifficultySelect();
  };

  const handleOpenOptions = (from: 'MAIN_MENU' | 'PAUSED') => {
    engineRef.current?.openOptions(from);
  };

  const handleCloseOptions = () => {
    engineRef.current?.closeOptions();
  };

  const handleOptionToggle = <K extends keyof GameOptions>(key: K) => {
    if (engineRef.current) {
      engineRef.current.setOption(key, !stats.options[key]);
    }
  };

  const deathCause = engineRef.current?.player.deathCause;
  const currentDiffCfg = DIFFICULTY_CONFIG[stats.difficulty] || DIFFICULTY_CONFIG.EASY;
  const highestUnlocked = stats.unlockedLevels[stats.difficulty] || 1;

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-[#080a0f] text-slate-100 select-none touch-none overscroll-none">
      {/* 2D HTML5 Canvas Background & Game World */}
      <canvas
        ref={canvasRef}
        className="block absolute inset-0 w-full h-full focus:outline-none"
        tabIndex={0}
      />

      {/* ------------------------------------------------------------------- */}
      {/* IN-GAME HUD (Visible only during PLAYING) */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'PLAYING' && (
        <header
          className="absolute top-0 inset-x-0 mx-auto px-3 sm:px-5 pointer-events-none flex justify-between items-center max-w-5xl z-10"
          style={{
            paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0.6rem))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
          }}
        >
          {/* Level Info & Difficulty Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2 shadow-lg">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: currentDiffCfg.color }}
              />
              <div className="text-left">
                <div className="text-[10px] sm:text-xs font-black tracking-wider text-slate-200 uppercase leading-none">
                  {stats.difficulty} • LVL {stats.currentLevelNumber}
                </div>
                <div className="text-[10px] text-sky-400 font-semibold tracking-wide hidden xs:block mt-0.5">
                  {stats.levelTitle}
                </div>
              </div>
            </div>

            {stats.activeCheckpoint && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-medium shadow-md">
                <Flag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Checkpoint Saved</span>
              </div>
            )}
          </div>

          {/* Dynamic Counters & Pause Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Coins in Level */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-md">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs sm:text-sm font-bold font-mono tracking-tight text-yellow-300">
                {stats.coinsCount}
                {stats.totalCoinsInLevel > 0 && (
                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{stats.totalCoinsInLevel}</span>
                )}
              </span>
            </div>

            {/* Score */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-baseline gap-1 sm:gap-1.5 shadow-md">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium hidden sm:inline">Score</span>
              <span className="text-xs sm:text-sm font-bold font-mono tracking-tight text-amber-300">
                {stats.score}
              </span>
            </div>

            {/* Distance / Level Goal */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl px-2.5 sm:px-3.5 py-1 sm:py-1.5 flex items-baseline gap-1 sm:gap-1.5 shadow-lg">
              <span className="text-sm sm:text-lg font-black font-mono tracking-tight text-white">
                {stats.distance}
                <span className="text-[11px] font-normal text-slate-400 ml-0.5">/{stats.levelLengthMeters}m</span>
              </span>
            </div>

            {/* PAUSE BUTTON (Ⅱ) */}
            <button
              onClick={handlePause}
              className="pointer-events-auto bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer shadow-lg transition-transform"
              title="Pause Game (ESC)"
              aria-label="Pause"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>
          </div>
        </header>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 1. MAIN MENU SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'MAIN_MENU' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Title & Branding */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-1">
                <Zap className="w-7 h-7 fill-current" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-white uppercase leading-none">
                STICKMAN
                <div className="text-xl sm:text-2xl font-black text-sky-400 tracking-wider mt-1.5">
                  ONE MORE MOVE
                </div>
              </h1>
              <p className="text-xs uppercase tracking-widest font-bold text-slate-400 pt-1">
                HANDCRAFTED RUNNER • 15 TRIALS
              </p>
            </div>

            {/* Progression Overview Preview */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 text-xs grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">EASY</div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                  {stats.unlockedLevels.EASY}/5 Unlocked
                </div>
              </div>
              <div className="text-center p-1.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-amber-400 font-bold uppercase">MEDIUM</div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                  {stats.unlockedLevels.MEDIUM}/5 Unlocked
                </div>
              </div>
              <div className="text-center p-1.5 bg-slate-900/60 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-rose-400 font-bold uppercase">HARD</div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                  {stats.unlockedLevels.HARD}/5 Unlocked
                </div>
              </div>
            </div>

            {/* Menu Buttons */}
            <div className="space-y-3 pt-1">
              <button
                onClick={handlePlayClicked}
                className="w-full py-4 px-6 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 font-black text-lg tracking-wider transition-all shadow-xl shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY</span>
              </button>

              <button
                onClick={() => handleOpenOptions('MAIN_MENU')}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-200 font-bold text-sm tracking-wide transition-all border border-slate-700/80 cursor-pointer flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>OPTIONS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. DIFFICULTY SELECTION SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'DIFFICULTY_SELECT' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <button
                onClick={handleDifficultySelectBack}
                className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Back to Main Menu"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center pr-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase">
                  SELECT DIFFICULTY
                </h2>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Choose a difficulty campaign
                </p>
              </div>
              <div className="w-4" />
            </div>

            {/* Difficulty Cards */}
            <div className="space-y-2.5 text-left pt-1">
              {/* EASY CARD */}
              <button
                onClick={() => handleDifficultySelected('EASY')}
                className="w-full p-4 rounded-2xl bg-slate-950/70 hover:bg-emerald-950/30 active:scale-[0.98] border border-slate-800 hover:border-emerald-500/60 transition-all cursor-pointer flex items-center justify-between group shadow-md"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                    <span className="font-black text-white text-base tracking-wide group-hover:text-emerald-300">
                      EASY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Relaxed speed and generous obstacles</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Progress</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {stats.unlockedLevels.EASY}/5
                  </span>
                </div>
              </button>

              {/* MEDIUM CARD */}
              <button
                onClick={() => handleDifficultySelected('MEDIUM')}
                className="w-full p-4 rounded-2xl bg-slate-950/70 hover:bg-amber-950/30 active:scale-[0.98] border border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer flex items-center justify-between group shadow-md"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                    <span className="font-black text-white text-base tracking-wide group-hover:text-amber-300">
                      MEDIUM
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Balanced challenge & moving platforms</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Progress</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {stats.unlockedLevels.MEDIUM}/5
                  </span>
                </div>
              </button>

              {/* HARD CARD */}
              <button
                onClick={() => handleDifficultySelected('HARD')}
                className="w-full p-4 rounded-2xl bg-slate-950/70 hover:bg-rose-950/30 active:scale-[0.98] border border-slate-800 hover:border-rose-500/60 transition-all cursor-pointer flex items-center justify-between group shadow-md"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                    <span className="font-black text-white text-base tracking-wide group-hover:text-rose-400">
                      HARD
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Fast reactions. No mistakes.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Progress</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {stats.unlockedLevels.HARD}/5
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. LEVEL SELECT SCREEN ([ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]) */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'LEVEL_SELECT' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-20 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleLevelSelectBack}
                className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Back to Difficulty Select"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentDiffCfg.color }}
                  />
                  <h2 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase">
                    {stats.difficulty} LEVELS
                  </h2>
                </div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
                  Select a trial to begin
                </p>
              </div>
              <div className="w-8" />
            </div>

            {/* 5 Handcrafted Level Cards */}
            <div className="space-y-2 text-left pt-1">
              {[1, 2, 3, 4, 5].map((lvlNum) => {
                const lvlData = getHandcraftedLevel(stats.difficulty, lvlNum);
                const isUnlocked = lvlNum <= highestUnlocked;
                const levelKey = `${stats.difficulty.toLowerCase()}_${lvlNum}`;
                const bestScore = stats.bestScoreByLevel[levelKey];
                const bestTime = stats.bestTimeByLevel[levelKey];

                return (
                  <button
                    key={lvlNum}
                    onClick={() => isUnlocked && handleLevelSelected(lvlNum)}
                    disabled={!isUnlocked}
                    className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between ${
                      isUnlocked
                        ? 'bg-slate-950/70 hover:bg-slate-800/80 active:scale-[0.99] border-slate-800 hover:border-sky-500/60 shadow-md cursor-pointer group'
                        : 'bg-slate-950/40 border-slate-900 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Level Number Badge */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-lg ${
                          isUnlocked
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors'
                            : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                      >
                        {lvlNum}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm sm:text-base ${
                              isUnlocked ? 'text-white group-hover:text-sky-300' : 'text-slate-500'
                            }`}
                          >
                            {lvlData.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                            {lvlData.lengthMeters}m
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{lvlData.subtitle}</p>
                      </div>
                    </div>

                    {/* Stats or Lock Status */}
                    <div className="text-right">
                      {isUnlocked ? (
                        <div>
                          {bestScore ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1 justify-end">
                                <Trophy className="w-3 h-3 text-amber-400" />
                                <span>{bestScore}</span>
                              </div>
                              {bestTime && (
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 justify-end">
                                  <Timer className="w-3 h-3 text-slate-500" />
                                  <span>{bestTime}s</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                              START <ChevronRight className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold">
                          <Lock className="w-4 h-4" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. LEVEL COMPLETE VICTORY SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'LEVEL_COMPLETE' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="max-w-md w-full bg-slate-900/95 border border-sky-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Icon & Title */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 mb-1 shadow-lg shadow-amber-500/10 animate-bounce">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase">
                {stats.currentLevelNumber === 5 ? 'DIFFICULTY COMPLETE!' : 'LEVEL COMPLETE!'}
              </h2>
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                {stats.difficulty} • LEVEL {stats.currentLevelNumber}: {stats.levelTitle}
              </div>
            </div>

            {/* Score & Rewards Panel */}
            <div className="bg-slate-950/85 border border-slate-800/90 rounded-2xl p-4 divide-y divide-slate-800/70 text-sm">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium">Distance:</span>
                <span className="font-mono font-bold text-white">
                  {stats.distance}m
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  Coins:
                </span>
                <span className="font-mono font-bold text-yellow-300">
                  {stats.coinsCount} / {stats.totalCoinsInLevel}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-sky-400" />
                  Clear Time:
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {Math.round(stats.elapsedTime * 10) / 10}s
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Final Score (+500 Bonus):
                </span>
                <span className="font-mono font-black text-lg text-amber-300">
                  {stats.score}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {stats.currentLevelNumber < 5 && (
                <button
                  onClick={handleNextLevel}
                  className="w-full py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 font-black text-base tracking-wider transition-all shadow-lg shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>NEXT LEVEL</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => handleRetry(false)}
                className="w-full py-3 px-6 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-200 font-bold text-sm tracking-wide transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>RETRY LEVEL</span>
              </button>

              <button
                onClick={handleLevelSelectBack}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-300 font-bold text-xs tracking-wide transition-all border border-slate-800 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>LEVEL SELECT</span>
              </button>

              <button
                onClick={handleMainMenu}
                className="w-full py-2.5 px-6 rounded-xl bg-transparent hover:bg-slate-900 active:scale-[0.98] text-slate-500 hover:text-slate-300 font-semibold text-xs tracking-wide transition-all cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 5. PAUSE MENU SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'PAUSED' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="max-w-sm w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase">
                PAUSED
              </h2>
              <p className="text-xs uppercase tracking-wider font-semibold text-sky-400">
                {stats.difficulty} • LEVEL {stats.currentLevelNumber}: {stats.levelTitle}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleResume}
                className="w-full py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 font-black text-base tracking-wider transition-all shadow-lg shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME</span>
              </button>

              <button
                onClick={() => handleRetry(false)}
                className="w-full py-3 px-6 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-200 font-bold text-sm tracking-wide transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>RETRY LEVEL</span>
              </button>

              <button
                onClick={() => handleOpenOptions('PAUSED')}
                className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-300 font-bold text-sm tracking-wide transition-all border border-slate-800 cursor-pointer flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>OPTIONS</span>
              </button>

              <button
                onClick={handleLevelSelectBack}
                className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-400 hover:text-white font-bold text-sm tracking-wide transition-all border border-slate-800 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>LEVEL SELECT</span>
              </button>

              <button
                onClick={handleMainMenu}
                className="w-full py-2.5 px-6 rounded-xl bg-transparent hover:bg-slate-900 active:scale-[0.98] text-slate-500 hover:text-slate-300 font-semibold text-xs tracking-wide transition-all cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 6. OPTIONS SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'OPTIONS' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase">
                SETTINGS
              </h2>
              <button
                onClick={handleCloseOptions}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  {stats.options.sound ? (
                    <Volume2 className="w-5 h-5 text-sky-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-500" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-white">Sound Effects</div>
                    <div className="text-xs text-slate-400">Jumps, dashes, coins & chimes</div>
                  </div>
                </div>
                <button
                  onClick={() => handleOptionToggle('sound')}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    stats.options.sound ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      stats.options.sound ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Screen Shake Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-sm font-bold text-white">Screen Shake</div>
                    <div className="text-xs text-slate-400">Camera impact feel</div>
                  </div>
                </div>
                <button
                  onClick={() => handleOptionToggle('screenShake')}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    stats.options.screenShake ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      stats.options.screenShake ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Particles Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-sm font-bold text-white">Visual Particles</div>
                    <div className="text-xs text-slate-400">Dust & spark trail juice</div>
                  </div>
                </div>
                <button
                  onClick={() => handleOptionToggle('particles')}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    stats.options.particles ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      stats.options.particles ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleCloseOptions}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wide transition-all border border-slate-700 cursor-pointer mt-2"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 7. GAME OVER SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="max-w-sm w-full bg-slate-900/95 border border-rose-900/50 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-1">
                <Skull className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase">
                DEFEATED
              </h2>
              <div className="text-xs text-slate-400">
                {deathCause === 'spike' ? 'Impaled by spikes' : 'Fell into the abyss'}
              </div>
            </div>

            {/* Score & Distance Panel */}
            <div className="bg-slate-950/85 border border-slate-800/90 rounded-2xl p-3.5 divide-y divide-slate-800/70 text-sm">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium">Distance:</span>
                <span className="font-mono font-bold text-white">
                  {stats.distance} / {stats.levelLengthMeters}m
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  Coins:
                </span>
                <span className="font-mono font-bold text-yellow-300">
                  {stats.coinsCount}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Score:
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {stats.score}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              {stats.activeCheckpoint ? (
                <>
                  <button
                    onClick={() => handleRetry(true)}
                    className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm tracking-wider transition-all shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Flag className="w-4 h-4 stroke-[2.5]" />
                    <span>FROM CHECKPOINT</span>
                  </button>
                  <button
                    onClick={() => handleRetry(false)}
                    className="w-full py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-bold text-xs tracking-wide transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>RESTART LEVEL</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRetry(false)}
                  className="w-full py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 font-black text-base tracking-wider transition-all shadow-lg shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>TRY AGAIN</span>
                </button>
              )}

              <button
                onClick={handleLevelSelectBack}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-300 font-bold text-xs tracking-wide transition-all border border-slate-800 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>LEVEL SELECT</span>
              </button>

              <button
                onClick={handleMainMenu}
                className="w-full py-2 px-6 rounded-xl bg-transparent hover:bg-slate-900 active:scale-[0.98] text-slate-500 hover:text-slate-300 font-semibold text-xs tracking-wide transition-all cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MOBILE-FIRST TOUCH CONTROLS (Only visible and active during PLAYING) */}
      {/* ------------------------------------------------------------------- */}
      {/* ------------------------------------------------------------------- */}
      {/* MOBILE-FIRST TOUCH CONTROLS (Only visible and active during PLAYING) */}
      {/* ------------------------------------------------------------------- */}
      {gameStatus === 'PLAYING' && (
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none z-15 flex justify-between items-end"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
          }}
        >
          {/* BOTTOM-LEFT: [ JUMP ] BUTTON */}
          <div className="pointer-events-auto">
            <button
              type="button"
              onPointerDown={handleJumpPointerDown}
              onPointerUp={handleJumpPointerUp}
              onPointerCancel={handleJumpPointerUp}
              onPointerLeave={handleJumpPointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-[clamp(60px,11.8vw,74px)] h-[clamp(60px,11.8vw,74px)] min-w-[58px] min-h-[58px] rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center select-none touch-none shadow-xl backdrop-blur-md border-2 transition-all cursor-pointer ${
                jumpActive
                  ? 'bg-sky-500/40 border-sky-300 text-white scale-90 ring-4 ring-sky-400/35 shadow-sky-500/35'
                  : 'bg-slate-900/80 border-sky-400/40 hover:border-sky-300 text-sky-200 hover:bg-slate-900/95 active:scale-95 shadow-lg shadow-sky-500/10'
              }`}
              aria-label="Jump"
            >
              <ArrowUp className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.8]" />
              <span className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase mt-0.5">
                JUMP
              </span>
            </button>
          </div>

          {/* BOTTOM-RIGHT: SPECIAL ACTIONS [ DASH ] & [ GRAPPLE ] */}
          <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-3.5">
            {/* [ DASH ] BUTTON (Orange/Red accent) */}
            <div className="relative">
              <button
                type="button"
                disabled={!stats.dashReady}
                onPointerDown={handleDashPointerDown}
                onPointerUp={handleDashPointerUp}
                onPointerCancel={handleDashPointerUp}
                onPointerLeave={handleDashPointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-[clamp(58px,11.2vw,72px)] h-[clamp(58px,11.2vw,72px)] min-w-[56px] min-h-[56px] rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center select-none touch-none shadow-xl backdrop-blur-md border-2 overflow-hidden relative transition-all cursor-pointer ${
                  dashActive
                    ? 'bg-amber-500/40 border-amber-300 text-amber-100 scale-90 ring-4 ring-amber-400/35 shadow-amber-500/30'
                    : stats.dashReady
                    ? 'bg-amber-950/65 border-amber-400/60 hover:border-amber-300 text-amber-300 hover:bg-amber-950/80 active:scale-95 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/50 border-slate-700/60 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
                aria-label="Dash"
              >
                {/* Cooldown progress fill indicator */}
                {!stats.dashReady && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-amber-500/25 transition-all duration-75 pointer-events-none"
                    style={{ height: `${Math.round(stats.dashCooldownProgress * 100)}%` }}
                  />
                )}

                <Zap
                  className={`w-5 h-5 sm:w-6 sm:h-6 z-10 ${
                    stats.dashReady ? 'fill-current text-amber-400 animate-pulse' : 'text-slate-500'
                  }`}
                />
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase mt-0.5 z-10">
                  DASH
                </span>
              </button>
            </div>

            {/* [ GRAPPLE ] BUTTON (Purple/Cyan accent) */}
            <div className="relative">
              <button
                type="button"
                disabled={!stats.grappleReady && !stats.isGrappling}
                onPointerDown={handleGrapplePointerDown}
                onPointerUp={handleGrapplePointerUp}
                onPointerCancel={handleGrapplePointerUp}
                onPointerLeave={handleGrapplePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-[clamp(58px,11.2vw,72px)] h-[clamp(58px,11.2vw,72px)] min-w-[56px] min-h-[56px] rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center select-none touch-none shadow-xl backdrop-blur-md border-2 overflow-hidden relative transition-all cursor-pointer ${
                  stats.grappleNoTargetPulse
                    ? 'bg-rose-950/70 border-rose-400 text-rose-300 ring-4 ring-rose-500/40 animate-pulse'
                    : stats.isGrappling
                    ? 'bg-cyan-500/40 border-cyan-300 text-cyan-100 scale-95 ring-4 ring-cyan-400/40 shadow-cyan-500/30 animate-pulse'
                    : grappleActive
                    ? 'bg-cyan-500/30 border-cyan-300 text-cyan-200 scale-90 ring-4 ring-cyan-400/25'
                    : stats.grappleReady
                    ? stats.grappleHasTarget
                      ? 'bg-cyan-950/80 border-cyan-300 text-cyan-200 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/30'
                      : 'bg-cyan-950/60 border-cyan-400/50 hover:border-cyan-300 text-cyan-300 hover:bg-cyan-950/80 active:scale-95 shadow-cyan-500/20'
                    : 'bg-slate-900/50 border-slate-700/60 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
                aria-label="Grapple Hook"
              >
                {/* Cooldown progress fill indicator */}
                {!stats.grappleReady && !stats.isGrappling && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-cyan-500/25 transition-all duration-75 pointer-events-none"
                    style={{ height: `${Math.round(stats.grappleCooldownProgress * 100)}%` }}
                  />
                )}

                {/* Target Locked Indicator Badge */}
                {stats.grappleHasTarget && !stats.isGrappling && stats.grappleReady && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-300 shadow-sm shadow-cyan-300 animate-ping" />
                )}

                <Anchor
                  className={`w-5 h-5 sm:w-6 sm:h-6 z-10 ${
                    stats.isGrappling
                      ? 'text-cyan-200 animate-spin'
                      : stats.grappleReady
                      ? stats.grappleHasTarget
                        ? 'text-cyan-100'
                        : 'text-cyan-300'
                      : 'text-slate-500'
                  }`}
                />
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase mt-0.5 z-10">
                  {stats.isGrappling ? 'RELEASE' : 'GRAPPLE'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* PORTRAIT MODE WARNING OVERLAY */}
      {/* ------------------------------------------------------------------- */}
      {isPortrait && !dismissPortraitWarning && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in duration-200">
          <div className="max-w-xs w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 mx-auto flex items-center justify-center">
              <RotateCcw className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black tracking-wider text-white uppercase">
                ROTATE YOUR PHONE
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Landscape mode is recommended for the best experience.
              </p>
            </div>
            <button
              onClick={() => setDismissPortraitWarning(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 text-xs font-bold tracking-wider transition-all border border-slate-700 cursor-pointer"
            >
              CONTINUE ANYWAY
            </button>
          </div>
        </div>
      )}

      {/* Desktop Keyboard Helper Bar (visible on large screens when PLAYING) */}
      {gameStatus === 'PLAYING' && (
        <footer className="hidden md:flex absolute bottom-2 inset-x-0 mx-auto px-4 pointer-events-none justify-center z-10">
          <div className="bg-slate-900/50 backdrop-blur-xs border border-slate-800/50 rounded-full px-3.5 py-1 text-[11px] text-slate-400 flex items-center gap-2.5">
            <span><strong className="text-white font-mono">SPACE</strong> Jump</span>
            <span className="text-slate-600">•</span>
            <span><strong className="text-cyan-300 font-mono">G</strong> Grapple</span>
            <span className="text-slate-600">•</span>
            <span><strong className="text-sky-300 font-mono">SHIFT</strong> Dash</span>
            <span className="text-slate-600">•</span>
            <span><strong className="text-slate-300 font-mono">ESC</strong> Pause</span>
            <span className="text-slate-600">•</span>
            <span><strong className="text-slate-300 font-mono">R</strong> Restart</span>
          </div>
        </footer>
      )}
    </div>
  );
}

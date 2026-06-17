import { useEffect, useRef, useState, useTransition } from "react";
import { GameState, ControlAction, Obstacle, Particle, ScoreRecord } from "../types";
import { soundEngine } from "../utils/audio";
import { Volume2, VolumeX, Play, RotateCcw, Pause, HelpCircle } from "lucide-react";

interface GameCanvasProps {
  activeState: ControlAction;
  jumpPulse: number;
  onRestart: () => void;
}

// 8-bit Procedural Pixel Sprites (1 = Accent color, 2 = Base, 0 = Empty)
const DINO_COLOR_MAP = {
  1: "#000000", // Will be dynamic (adapted on day/night cycles)
  2: "#222222",
  3: "#ffffff",
  4: "#e11d48", // eye color
};

// 16x16 / 24x24 pixel matrices
const SPRITES = {
  // Dino running frames (normal)
  dinoRun1: [
    ".......XXXXXX.........",
    "......XXXXXXXX........",
    "......XX4XXXXX........",
    "......XXXXXXXX........",
    "......XXXX............",
    "X.....XXXXXX..........",
    "XX...XXXXXXXX.........",
    "XXXXXXXXXXXXX.........",
    ".XXXXXXXXXXX..........",
    "..XXXXXXXXXX..........",
    "...XXXXXXXX...........",
    "....XXXXXX............",
    "....XX..XX............",
    "....X....X............",
    "....XX................",
    "......................"
  ],
  dinoRun2: [
    ".......XXXXXX.........",
    "......XXXXXXXX........",
    "......XX4XXXXX........",
    "......XXXXXXXX........",
    "......XXXX............",
    "X.....XXXXXX..........",
    "XX...XXXXXXXX.........",
    "XXXXXXXXXXXXX.........",
    ".XXXXXXXXXXX..........",
    "..XXXXXXXXXX..........",
    "...XXXXXXXX...........",
    "....XXXXXX............",
    "....XX..XX............",
    "....X....XX...........",
    ".........XX...........",
    "......................"
  ],
  // Dino crouching frames
  dinoCrouch1: [
    "........................",
    "........................",
    "........XXXXXXXXXXXXX...",
    ".......XXXXXXXXXX4XXX...",
    ".......XXXXXXXXXXXXXX...",
    "X.....XXXXXXXXXXXXXXXX..",
    "XX...XXXXXXXXXXXXXXXXX..",
    "XXXXXXXXXXXXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXXXXXXXX...",
    "..XXXXXXXXXXXXXXXXXX....",
    "...XXXXXX...XXXXXX......",
    "...XX.........XX........",
    "...X..........X.........",
    "........................"
  ],
  dinoCrouch2: [
    "........................",
    "........................",
    "........XXXXXXXXXXXXX...",
    ".......XXXXXXXXXX4XXX...",
    ".......XXXXXXXXXXXXXX...",
    "X.....XXXXXXXXXXXXXXXX..",
    "XX...XXXXXXXXXXXXXXXXX..",
    "XXXXXXXXXXXXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXXXXXXXX...",
    "..XXXXXXXXXXXXXXXXXX....",
    "...XXXXXX...XXXXXX......",
    ".....XX.......XX........",
    ".....XX.......XX........",
    "........................"
  ],
  // Cactus templates
  cactusSmall: [
    "....XX....",
    "....XX....",
    ".X..XX..X.",
    "XX..XX..XX",
    "XX..XX..XX",
    "XX..XX..XX",
    "XXXXXX..XX",
    ".XXXXX.XX.",
    "....XX....",
    "....XX....",
    "....XX....",
    "....XX....",
    "....XX...."
  ],
  cactusLarge: [
    "......XX......",
    "......XX......",
    "......XX......",
    "...X..XX..X...",
    "..XX..XX..XX..",
    "..XX..XX..XX..",
    "..XX..XX..XX..",
    "..XXXXXX.XXX..",
    "...XXXXX.XX...",
    "......XX......",
    "......XX......",
    "......XX......",
    "......XX......",
    "......XX......",
    "......XX......",
    "......XX......"
  ],
  // Flying pterodactyl frames
  bird1: [
    "......XXXXXX.......",
    "....XXXXXXXXX......",
    "....XX4XXXXXX......",
    "....XXXXXXXX.......",
    "....XX.............",
    ".XXXXXX............",
    "XXXXXXXXX..........",
    "XXXXXXXXXXX........",
    "XX.XXXXXXX.........",
    "...XXXXXX..........",
    "...XXXXX...........",
    "...XX.XX...........",
    "....X..X..........."
  ],
  bird2: [
    "......XXXXXX.......",
    "....XXXXXXXXX......",
    "....XX4XXXXXX......",
    "....XXXXXXXX.......",
    "....XX.............",
    ".XXXXXX.XXX........",
    "XXXXXXXXXXXX.......",
    "XXXXXXXXXXXX.......",
    "XX.XXXXXXXX........",
    "...XXXXXX..........",
    "....XXXX...........",
    ".....XX............",
    "..................."
  ]
};

export default function GameCanvas({ activeState, jumpPulse, onRestart }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core States
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const gameStateRef = useRef<GameState>(GameState.IDLE);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [activeSource, setActiveSource] = useState<"keyboard" | "webcam">("keyboard");
  const [visionSync, setVisionSync] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isNight, setIsNight] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [, startTransition] = useTransition();

  // Internal Game Engine Ref
  const gameEngineRef = useRef({
    player: {
      y: 0,
      vy: 0,
      isJumping: false,
      isCrouching: false,
      width: 44,
      height: 48,
      animFrame: 0,
      animTick: 0
    },
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    clouds: [] as { x: number; y: number; speed: number; size: number }[],
    stars: [] as { x: number; y: number; size: number; alpha: number }[],
    score: 0,
    hiScore: 0,
    speed: 6.0,
    gameLoopId: null as number | null,
    lastTime: 0,
    nextObstacleTimer: 0,
    groundY: 260,
    virtualWidth: 800,
    virtualHeight: 310,
    dayNightAlpha: 0, // 0 = Day, 1 = Night transition
    targetDayNightAlpha: 0,
    scoreSincePointSound: 0,
    speedFactor: 1.0
  });

  // Load High Score on mount
  useEffect(() => {
    const saved = localStorage.getItem("machine_runner_hi_score");
    if (saved) {
      const parsed = parseInt(saved, 10);
      setHighScore(parsed);
      gameEngineRef.current.hiScore = parsed;
    }

    // Generate static decorations
    const engine = gameEngineRef.current;
    engine.clouds = Array.from({ length: 4 }, () => ({
      x: Math.random() * engine.virtualWidth,
      y: 40 + Math.random() * 80,
      speed: 0.35 + Math.random() * 0.4,
      size: 25 + Math.random() * 25
    }));

    engine.stars = Array.from({ length: 20 }, () => ({
      x: Math.random() * engine.virtualWidth,
      y: Math.random() * 150,
      size: 1 + Math.random() * 2,
      alpha: Math.random()
    }));
  }, []);

  // Sync volume state to soundEngine
  useEffect(() => {
    soundEngine.toggleSound(!isMuted);
  }, [isMuted]);

  // Read Inputs from Teachable Machine Prop (Continuous States)
  useEffect(() => {
    if (gameState !== GameState.RUNNING) return;

    if (activeState === ControlAction.CROUCH) {
      triggerCrouch(true);
      setActiveSource("webcam");
    } else if (activeState === ControlAction.RUN) {
      triggerCrouch(false);
      setActiveSource("webcam");
    } else if (activeState === ControlAction.STOP) {
      triggerCrouch(false);
      setActiveSource("webcam");
    }
  }, [activeState, gameState]);

  // Read Inputs from Teachable Machine Prop (Discrete States like Jump)
  const prevJumpPulse = useRef(jumpPulse);
  useEffect(() => {
    if (jumpPulse > prevJumpPulse.current) {
      prevJumpPulse.current = jumpPulse;
      setActiveSource("webcam");
      if (gameState === GameState.IDLE) {
        startGame();
      } else if (gameState === GameState.GAMEOVER) {
        restartGame();
      } else if (gameState === GameState.RUNNING) {
        triggerJump();
      }
    }
  }, [jumpPulse, gameState]);

  // Handle Keyboard fallbacks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code;
      if (key === "Space" || key === "ArrowUp") {
        e.preventDefault();
        setActiveSource("keyboard");
        if (gameState === GameState.IDLE) {
          startGame();
        } else if (gameState === GameState.GAMEOVER) {
          restartGame();
        } else if (gameState === GameState.RUNNING) {
          triggerJump();
        }
      } else if (key === "ArrowDown" || key === "KeyS") {
        e.preventDefault();
        setActiveSource("keyboard");
        if (gameState === GameState.RUNNING) {
          triggerCrouch(true);
        }
      } else if (key === "KeyP") {
        e.preventDefault();
        if (gameState === GameState.RUNNING) {
          pauseGame();
        } else if (gameState === GameState.PAUSED) {
          resumeGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.code;
      if (key === "ArrowDown" || key === "KeyS") {
        if (gameState === GameState.RUNNING) {
          triggerCrouch(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // Trigger Jump Mechanics
  const triggerJump = () => {
    const p = gameEngineRef.current.player;
    if (!p.isJumping) {
      if (p.isCrouching) {
        // Automatically release crouch to allow immediate leap
        p.isCrouching = false;
        p.height = 48;
      }
      p.vy = 13.0; // Positive = upward in our coordinate system (groundY - p.y)
      p.isJumping = true;
      soundEngine.playJump();

      // Spark particles on lift off
      const engine = gameEngineRef.current;
      spawnJumpParticles(engine.player.width / 2 + 80, engine.groundY);
    }
  };

  // Trigger Crouch Mechanics
  const triggerCrouch = (crouch: boolean) => {
    const p = gameEngineRef.current.player;
    if (crouch) {
      if (p.isJumping) {
        // Pro mechanical addition: FAST-FALL!
        p.vy -= 3.8; // Accelerate downward rapid descent!
      } else if (!p.isCrouching) {
        p.isCrouching = true;
        p.height = 28;
        soundEngine.playCrouch();
      }
    } else {
      if (p.isCrouching) {
        p.isCrouching = false;
        p.height = 48;
      }
    }
  };

  // Particle Generators
  const spawnJumpParticles = (x: number, y: number) => {
    const engine = gameEngineRef.current;
    for (let i = 0; i < 8; i++) {
      engine.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y - 2,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3,
        size: 2 + Math.random() * 4,
        color: isNight ? "#818cf8" : "#888888",
        alpha: 0.8
      });
    }
  };

  const spawnExplosionParticles = (x: number, y: number) => {
    const engine = gameEngineRef.current;
    for (let i = 0; i < 24; i++) {
      engine.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        size: 3 + Math.random() * 5,
        color: "#e11d48", // red damage bricks
        alpha: 1.0
      });
    }
  };

  const spawnRunDust = (x: number, y: number) => {
    const engine = gameEngineRef.current;
    engine.particles.push({
      x: x,
      y: y,
      vx: -(Math.random() * 2 + 1),
      vy: -Math.random() * 0.5,
      size: 1.5 + Math.random() * 3,
      color: isNight ? "#4b5563" : "#dddddd",
      alpha: 0.6
    });
  };

  // Core Game Loop Functions
  const startGame = () => {
    const engine = gameEngineRef.current;
    engine.score = 0;
    engine.speed = 6.0;
    engine.obstacles = [];
    engine.particles = [];
    engine.player.y = 0;
    engine.player.vy = 0;
    engine.player.isJumping = false;
    engine.player.isCrouching = false;
    engine.targetDayNightAlpha = 0;
    engine.dayNightAlpha = 0;
    engine.scoreSincePointSound = 0;
    
    setGameState(GameState.RUNNING);
    gameStateRef.current = GameState.RUNNING;
    setIsNight(false);
    setSpeedMultiplier(1);
    setCurrentScore(0);
    
    engine.lastTime = performance.now();
    engine.nextObstacleTimer = 60; // Spawn standard space before first obstacle
    
    if (engine.gameLoopId) cancelAnimationFrame(engine.gameLoopId);
    engine.gameLoopId = requestAnimationFrame(updateGame);
  };

  const pauseGame = () => {
    setGameState(GameState.PAUSED);
    gameStateRef.current = GameState.PAUSED;
    const engine = gameEngineRef.current;
    if (engine.gameLoopId) {
      cancelAnimationFrame(engine.gameLoopId);
      engine.gameLoopId = null;
    }
  };

  const resumeGame = () => {
    setGameState(GameState.RUNNING);
    gameStateRef.current = GameState.RUNNING;
    const engine = gameEngineRef.current;
    engine.lastTime = performance.now();
    if (engine.gameLoopId) cancelAnimationFrame(engine.gameLoopId);
    engine.gameLoopId = requestAnimationFrame(updateGame);
  };

  const restartGame = () => {
    onRestart();
    startGame();
  };

  const gameOver = () => {
    setGameState(GameState.GAMEOVER);
    gameStateRef.current = GameState.GAMEOVER;
    const engine = gameEngineRef.current;
    if (engine.gameLoopId) {
      cancelAnimationFrame(engine.gameLoopId);
      engine.gameLoopId = null;
    }
    
    soundEngine.playGameOver();
    
    // Save locally
    if (Math.floor(engine.score) > engine.hiScore) {
      engine.hiScore = Math.floor(engine.score);
      setHighScore(engine.hiScore);
      localStorage.setItem("machine_runner_hi_score", engine.hiScore.toString());
    }

    // Explosion particles
    spawnExplosionParticles(80 + engine.player.width / 2, engine.groundY - engine.player.y - engine.player.height / 2);
    drawFrame();
  };

  // Canvas Frame Scaling & Resizing Layout
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = Math.min(width * (175 / 800), 220); // enforce classic squashed panorama 800:310 approx

      canvas.width = width;
      canvas.height = height;

      // Force render frame once on resize
      drawFrame();
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [gameState, isNight]);

  // Main tick engine
  const updateGame = (timestamp: number) => {
    const engine = gameEngineRef.current;
    const dt = Math.min((timestamp - engine.lastTime) / 16.666, 3.0); // capped standard speed
    engine.lastTime = timestamp;

    // Smoothly interpolate modern vision speed factor to make transitions look creamy-smooth
    let targetSpeedFactor = 1.0;
    if (activeSource === "webcam" && visionSync) {
      if (activeState === ControlAction.STOP) {
        targetSpeedFactor = 0.0;
      }
    }

    // Initialize or interpolate
    const currentFactor = engine.speedFactor !== undefined ? engine.speedFactor : 1.0;
    const newFactor = currentFactor + (targetSpeedFactor - currentFactor) * 0.15 * dt;
    engine.speedFactor = newFactor;

    // 1. Advance distance score ONLY when active speed factor is positive
    engine.score += 0.15 * dt * newFactor;
    startTransition(() => {
      setCurrentScore(Math.floor(engine.score));
    });

    // Beep sound on score milestones (100, 200, 300 etc)
    engine.scoreSincePointSound += 0.15 * dt * newFactor;
    if (engine.scoreSincePointSound >= 100) {
      soundEngine.playPoint();
      engine.scoreSincePointSound = 0;
    }

    // 2. Linear difficulty scaling: speeds up game as scores goes high, scaled by current speedFactor
    const baseDifficultySpeed = 6.0 + Math.min(Math.floor(engine.score / 200) * 0.7, 8.0);
    engine.speed = baseDifficultySpeed * newFactor;
    startTransition(() => {
      setSpeedMultiplier(newFactor * (1 + Math.min(Math.floor(engine.score / 200) * 0.1, 1.5)));
    });

    // Day/Night shifts every 700 units of score
    const targetNight = Math.floor(engine.score / 700) % 2 === 1;
    if (isNight !== targetNight) {
      setIsNight(targetNight);
    }

    engine.targetDayNightAlpha = targetNight ? 1.0 : 0.0;
    engine.dayNightAlpha += (engine.targetDayNightAlpha - engine.dayNightAlpha) * 0.05 * dt;

    // 3. Player Physics Handling
    const p = engine.player;
    if (p.isJumping) {
      p.y += p.vy * dt;
      p.vy -= 0.62 * dt; // Gravity pulls down (reduces positive velocity)

      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.isJumping = false;
        // Spark landing dirt particle puff
        spawnJumpParticles(80 + p.width / 2, engine.groundY);
      }
    } else {
      if (engine.speed > 0.5) {
        p.animTick += dt * newFactor;
        if (p.animTick >= 4.5) { // running speed cycle
          p.animFrame = p.animFrame === 0 ? 1 : 0;
          p.animTick = 0;
          
          // Spawn active trail dust
          if (!p.isCrouching) {
            spawnRunDust(80, engine.groundY - 4);
          }
        }
      } else {
        // Return to elegant rest pose frame when speed is stopped
        p.animFrame = 0;
      }
    }

    // 4. Background decoration elements
    engine.clouds.forEach(cl => {
      cl.x -= cl.speed * dt;
      if (cl.x < -100) cl.x = engine.virtualWidth + 100;
    });

    if (isNight || engine.dayNightAlpha > 0.1) {
      engine.stars.forEach(st => {
        st.x -= 0.08 * dt;
        if (st.x < -10) st.x = engine.virtualWidth + 10;
        st.alpha = 0.3 + Math.abs(Math.sin((timestamp / 1000) + st.x)) * 0.7; // twinkle
      });
    }

    // 5. Generator: Obstacles (cacti clusters & pterodactyl birds)
    engine.nextObstacleTimer -= dt;
    if (engine.nextObstacleTimer <= 0) {
      spawnObstacle();
    }

    // Update Obstacles physics & trigger collisions
    for (let i = engine.obstacles.length - 1; i >= 0; i--) {
      const ob = engine.obstacles[i];
      ob.x -= engine.speed * dt;

      // Handle bird wing flaps
      if (ob.type === "bird") {
        ob.frame = ob.frame === undefined ? 0 : ob.frame;
        const tickRate = Math.floor(timestamp / 120) % 2;
        ob.frame = tickRate;
      }

      // Check off-screen
      if (ob.x < -ob.width) {
        engine.obstacles.splice(i, 1);
        continue;
      }

      // 6. Precise Bounding-Box Bounding Collision Checks (using offsets for safety and fairness)
      const playerXLeft = 80 + 4;
      const playerXRight = 80 + p.width - 4;
      const playerYBottom = engine.groundY - p.y - 2;
      const playerYTop = engine.groundY - p.y - p.height + 4;

      const obXLeft = ob.x + 3;
      const obXRight = ob.x + ob.width - 3;
      const obYBottom = ob.y;
      const obYTop = ob.y - ob.height + 4;

      // Overlap formula
      if (
        playerXRight > obXLeft &&
        playerXLeft < obXRight &&
        playerYBottom > obYTop &&
        playerYTop < obYBottom
      ) {
        gameOver();
        return;
      }

      // 7. Check if obstacle is successfully dodged
      if (!ob.passed && obXRight < playerXLeft) {
        ob.passed = true;
        soundEngine.playPoint(); // Play reward chime!
      }
    }

    // Particles dynamics
    for (let i = engine.particles.length - 1; i >= 0; i--) {
      const pt = engine.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= 0.02 * dt;
      if (pt.alpha <= 0) {
        engine.particles.splice(i, 1);
      }
    }

    // Draw active frames to canvas
    drawFrame();

    // Loop
    engine.gameLoopId = requestAnimationFrame(updateGame);
  };

  // Formulate a clean procedural pixel-map obstacle generator
  const spawnObstacle = () => {
    const engine = gameEngineRef.current;
    
    // Choose dynamic random obstacle
    // Birds only spawn if score > 150 to keep the early phase accessible
    const canSpawnBird = engine.score > 200;
    const choices: ("cactus_small" | "cactus_large" | "cactus_triple" | "bird")[] = [
      "cactus_small",
      "cactus_large",
      "cactus_small"
    ];
    if (canSpawnBird) choices.push("bird");

    const choice = choices[Math.floor(Math.random() * choices.length)];
    let width = 18;
    let height = 30;
    let y = engine.groundY; // Cactus placed on floor code

    if (choice === "cactus_small") {
      width = 16;
      height = 24;
    } else if (choice === "cactus_large") {
      width = 20;
      height = 36;
    } else if (choice === "cactus_triple") {
      width = 42;
      height = 26;
    } else if (choice === "bird") {
      width = 28;
      height = 18;
      // Birds fly at: 0: high (crouch safe, standing hits), 1: low (jump safe, stand hits)
      const altitudes = [
        engine.groundY - 50, // high altitude
        engine.groundY - 26, // low altitude
      ];
      y = altitudes[Math.floor(Math.random() * altitudes.length)];
    }

    engine.obstacles.push({
      id: Date.now() + Math.random(),
      type: choice,
      x: engine.virtualWidth + 20,
      y: y,
      width: width,
      height: height,
      speed: engine.speed,
      passed: false
    });

    // Randomize gap till next obstacles, dependent on active score speeds
    engine.nextObstacleTimer = 65 + Math.random() * 70 - Math.min((engine.speed * 2), 35);
  };

  // Renders a procedural matrix array pixel by pixel
  const drawPixelGrid = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    grid: string[],
    pixelSize: number,
    colorAccent: string,
    isMirrored: boolean = false
  ) => {
    const h = grid.length;
    const w = grid[0].length;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const char = grid[r][c];
        if (char === ".") continue; // Empty

        let color = colorAccent; // "X" or "2"
        if (char === "4") color = DINO_COLOR_MAP[4]; // Eye glow red
        if (char === "3") color = isNight ? "#1e1b4b" : "#ffffff";

        ctx.fillStyle = color;
        const drawC = isMirrored ? w - 1 - c : c;
        ctx.fillRect(
          Math.floor(x + drawC * pixelSize),
          Math.floor(y + r * pixelSize),
          Math.ceil(pixelSize),
          Math.ceil(pixelSize)
        );
      }
    }
  };

  // Main drawing engine for high-framerate rendering
  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = gameEngineRef.current;

    // Rescale logic: fixed virtual frame size of 800 x 310 mapped onto actual canvas dims
    const scaleX = canvas.width / engine.virtualWidth;
    const scaleY = canvas.height / engine.virtualHeight;

    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.imageSmoothingEnabled = false; // Ensures sharp retro pixels!

    // 1. Theme Color Interpolation for Day / Night cycles (Vibrant Palette Theme)
    const dayBg = "#171717"; // neutralize
    const nightBg = "#0a0a0a";
    ctx.fillStyle = dayBg;
    ctx.fillRect(0, 0, engine.virtualWidth, engine.virtualHeight);

    // Apply fading night sky
    if (engine.dayNightAlpha > 0) {
      ctx.fillStyle = nightBg;
      ctx.globalAlpha = engine.dayNightAlpha;
      ctx.fillRect(0, 0, engine.virtualWidth, engine.virtualHeight);
      ctx.globalAlpha = 1.0;
    }

    // Dynamic stroke styles based on active light/dark state
    const currentThemeAccent = isNight ? "#22d3ee" : "#22d3ee"; // cyan-400 always for player
    const bgDecorationColor = isNight ? "#262626" : "#404040";

    // 2. Draw Stars (night decoration)
    if (engine.dayNightAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = engine.dayNightAlpha;
      engine.stars.forEach(st => {
        ctx.fillStyle = `rgba(167, 139, 250, ${st.alpha})`; // violet-400 stars
        ctx.fillRect(st.x, st.y, st.size, st.size);
      });
      ctx.restore();
    }

    // 3. Draw Clouds
    engine.clouds.forEach(cl => {
      ctx.fillStyle = bgDecorationColor;
      ctx.fillRect(cl.x, cl.y, cl.size, cl.size * 0.4);
      ctx.fillRect(cl.x + cl.size * 0.15, cl.y - cl.size * 0.15, cl.size * 0.7, cl.size * 0.5);
    });

    // 4. Draw Ground grid & horizon line
    ctx.strokeStyle = "#404040";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, engine.groundY);
    ctx.lineTo(engine.virtualWidth, engine.groundY);
    ctx.stroke();

    // Draw retro dashes on ground
    ctx.fillStyle = isNight ? "#8b5cf6" : "#0ea5e9"; // violet / sky
    for (let d = 0; d < engine.virtualWidth; d += 40) {
      const groundOffset = Math.floor((engine.score * engine.speed) % 40);
      ctx.fillRect(d - groundOffset, engine.groundY + 4, 15, 2);
      ctx.fillRect((d + 15) - groundOffset, engine.groundY + 12, 5, 2);
    }

    // 5. Draw Obstacles (procedural pixel shapes) - vibrant orange or green
    engine.obstacles.forEach(ob => {
      ctx.save();
      const obsColor = isNight ? "#a78bfa" : "#fbbf24"; // amber/violet
      if (ob.type === "cactus_small") {
        drawPixelGrid(ctx, ob.x, ob.y - ob.height, SPRITES.cactusSmall, ob.width / 10, obsColor);
      } else if (ob.type === "cactus_large") {
        drawPixelGrid(ctx, ob.x, ob.y - ob.height, SPRITES.cactusLarge, ob.width / 14, obsColor);
      } else if (ob.type === "cactus_triple") {
        const doubleScale = ob.height / 13;
        // procedural clusters of 3 mini cacti
        drawPixelGrid(ctx, ob.x, ob.y - ob.height + 4, SPRITES.cactusSmall, doubleScale, obsColor);
        drawPixelGrid(ctx, ob.x + 12, ob.y - ob.height, SPRITES.cactusSmall, doubleScale * 1.15, obsColor);
        drawPixelGrid(ctx, ob.x + 28, ob.y - ob.height + 3, SPRITES.cactusSmall, doubleScale, obsColor);
      } else if (ob.type === "bird") {
        const frameSprite = ob.frame === 1 ? SPRITES.bird1 : SPRITES.bird2;
        drawPixelGrid(ctx, ob.x, ob.y - ob.height, frameSprite, ob.width / 19, "#f43f5e"); // vibrant rose bird
      }
      ctx.restore();
    });

    // 6. Draw Particles
    engine.particles.forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    });
    ctx.globalAlpha = 1.0;

    // 7. Draw Player (Dino Retro Runner)
    const p = engine.player;
    ctx.save();
    const dinoX = 80;
    const dinoY = engine.groundY - p.y - p.height;

    // Select sprite based on state
    let playerGrid = SPRITES.dinoRun1;
    if (gameStateRef.current === GameState.GAMEOVER) {
      playerGrid = SPRITES.dinoRun1; // or separate dead sprite
    } else if (p.isJumping) {
      playerGrid = SPRITES.dinoRun1; // airborne leg bend
    } else if (p.isCrouching) {
      playerGrid = p.animFrame === 1 ? SPRITES.dinoCrouch1 : SPRITES.dinoCrouch2;
    } else {
      playerGrid = p.animFrame === 1 ? SPRITES.dinoRun1 : SPRITES.dinoRun2;
    }

    const dPixelSize = p.isCrouching ? p.width / 24 : p.width / 22;
    drawPixelGrid(ctx, dinoX, dinoY, playerGrid, dPixelSize, currentThemeAccent);
    ctx.restore();

    // 8. Visual CRT Overlay Scanlines (Gives beautiful 8-bit visual polish)
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let sl = 0; sl < engine.virtualHeight; sl += 4) {
      ctx.fillRect(0, sl, engine.virtualWidth, 1.5);
    }

    // 9. Informative screens overlay
    if (gameStateRef.current === GameState.IDLE) {
      ctx.fillStyle = "rgba(10, 10, 10, 0.85)";
      ctx.fillRect(0, 0, engine.virtualWidth, engine.virtualHeight);

      // Accent border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, engine.virtualWidth - 40, engine.virtualHeight - 40);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "8px"; // Note: letterSpacing works in newer canvas APIs
      ctx.fillText("NEURAL RUNNER", engine.virtualWidth / 2, engine.virtualHeight / 2 - 25);
      
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#22d3ee"; // cyan-400
      ctx.letterSpacing = "2px";
      ctx.fillText("TAP SPACE OR INJECT JUMP POSE TO INITIATE", engine.virtualWidth / 2, engine.virtualHeight / 2 + 15);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#737373"; // neutral-500
      ctx.fillText("MANUAL OVERRIDES: SPACE/UP = ASCEND | S/DOWN = DESCEND", engine.virtualWidth / 2, engine.virtualHeight / 2 + 45);
    }

    if (gameStateRef.current === GameState.PAUSED) {
      ctx.fillStyle = "rgba(10, 10, 10, 0.75)";
      ctx.fillRect(0, 0, engine.virtualWidth, engine.virtualHeight);

      ctx.fillStyle = "#34d399"; // emerald-400
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "6px";
      ctx.fillText("SYSTEM PAUSED", engine.virtualWidth / 2, engine.virtualHeight / 2 - 5);
      ctx.font = "12px monospace";
      ctx.fillStyle = "#a3a3a3"; // neutral-400
      ctx.letterSpacing = "1px";
      ctx.fillText("Press 'P' to Resume Gameplay Stream", engine.virtualWidth / 2, engine.virtualHeight / 2 + 25);
    }

    if (gameStateRef.current === GameState.GAMEOVER) {
      ctx.fillStyle = "rgba(10, 10, 10, 0.9)";
      ctx.fillRect(0, 0, engine.virtualWidth, engine.virtualHeight);

      ctx.fillStyle = "#f43f5e"; // rose-500
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "8px";
      ctx.fillText("TERMINATED", engine.virtualWidth / 2, engine.virtualHeight / 2 - 30);

      ctx.fillStyle = "#e5e5e5"; // neutral-200
      ctx.font = "bold 14px monospace";
      ctx.letterSpacing = "2px";
      ctx.fillText(`SESSION SCORE: ${Math.floor(engine.score)}`, engine.virtualWidth / 2, engine.virtualHeight / 2 + 10);

      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#fbbf24"; // amber-400
      ctx.letterSpacing = "1px";
      ctx.fillText("PRESS RESET ICON OR SPACE TO REBOOT", engine.virtualWidth / 2, engine.virtualHeight / 2 + 45);
    }

    ctx.restore();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top HUD Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shadow-2xl font-sans relative z-10 overflow-hidden">
        
        {/* Score blocks */}
        <div className="flex items-center gap-8 select-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-[0.2em] leading-none text-shadow-sm">SCORE</span>
            <span className="text-xl font-bold text-white tracking-widest font-mono">{currentScore.toString().padStart(5, "0")}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-amber-400/80 uppercase font-bold tracking-[0.2em] leading-none text-shadow-sm">HI SCORE</span>
            <span className="text-xl font-bold text-amber-400 tracking-widest font-mono">{highScore.toString().padStart(5, "0")}</span>
          </div>

          <div className="flex flex-col gap-1 hidden sm:flex">
            <span className="text-[10px] text-cyan-400/80 uppercase font-bold tracking-[0.2em] leading-none text-shadow-sm">SPEED</span>
            <span className="text-xl font-bold text-cyan-400 tracking-widest font-mono">x{speedMultiplier.toFixed(1)}</span>
          </div>
        </div>

        {/* Input Trigger diagnostics badge */}
        <div id="control-diagnostics-badge" className="flex items-center gap-4">
          {activeSource === "webcam" && (
            <button
              id="vision-velocity-sync-toggle"
              onClick={() => setVisionSync(!visionSync)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all border shadow-sm ${
                visionSync 
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                  : "bg-neutral-800 border-white/5 text-neutral-400"
              }`}
              title={visionSync ? "Velocity sync is ON. Character runs ONLY when model predicts RUN/JUMP/CROUCH." : "Velocity sync is OFF. Classic auto-runner."}
            >
              <span className={`w-2 h-2 rounded-full ${visionSync ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" : "bg-neutral-600"}`} />
              <span>LIVE MOTION SYNC: {visionSync ? "ACTIVE" : "FREE"}</span>
            </button>
          )}

          <div className="flex flex-col items-end text-right text-[10px] text-neutral-400 gap-1 border-l border-white/10 pl-4">
            <span className="uppercase font-bold tracking-[0.1em] text-[9px] text-neutral-500">INPUT SOURCE</span>
            <span className={`font-bold tracking-wider uppercase ${activeSource === "webcam" ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" : "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"}`}>
              {activeSource === "webcam" ? "VISION MATRIX" : "KEYBOARD DEV"}
            </span>
          </div>
          
          {/* Quick Audio & pause buttons */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <button
              id="game-audio-mute-toggle"
              onClick={() => setIsMuted(!isMuted)}
              className="text-neutral-400 hover:text-white p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-transparent transition-all hover:scale-105 active:scale-95"
              title={isMuted ? "Unmute sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            
            {gameState === GameState.RUNNING && (
              <button
                id="btn-pause-game"
                onClick={pauseGame}
                className="text-neutral-400 hover:text-white p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-transparent transition-all hover:scale-105 active:scale-95"
                title="Pause (P)"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            
            {gameState === GameState.PAUSED && (
              <button
                id="btn-resume-game"
                onClick={resumeGame}
                className="text-white p-2.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
                title="Resume"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Container Element */}
      <div
        id="game-rendering-viewport"
        ref={containerRef}
        className="w-full relative rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl overflow-hidden aspect-[800/310]"
      >
        <canvas
          id="retro-runner-canvas"
          ref={canvasRef}
          onClick={() => {
            if (gameState === GameState.IDLE) startGame();
            else if (gameState === GameState.GAMEOVER) restartGame();
            else triggerJump();
          }}
          className="block w-full h-full cursor-none"
        />

        {/* Floating Help Banner for interactive discovery */}
        {gameState === GameState.RUNNING && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 text-[9px] font-mono text-neutral-400">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>CLICK TO JUMP &bull; P TO PAUSE</span>
          </div>
        )}
      </div>

      {/* Quick Action Overlay and Instruction banner for mobile/desktop UI controls */}
      <div className="flex gap-2">
        {gameState === GameState.IDLE && (
          <button
            id="start-running-btn"
            onClick={startGame}
            className="flex-1 bg-[#38b764] hover:bg-[#4ddc7c] text-white font-mono uppercase text-xs font-black py-2.5 px-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] border-b-4 border-r-4 border-[#257144] active:translate-y-[1px] flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> LAUNCH RETRO FRAME PLATFORMER
          </button>
        )}

        {gameState === GameState.GAMEOVER && (
          <button
            id="restart-running-btn"
            onClick={restartGame}
            className="flex-1 bg-[#ef7d57] hover:bg-[#fca5a5] text-white font-mono uppercase text-xs font-black py-2.5 px-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] border-b-4 border-r-4 border-[#b91c1c] active:translate-y-[1px] flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> INITIALIZE RESET CYCLE
          </button>
        )}
      </div>
    </div>
  );
}

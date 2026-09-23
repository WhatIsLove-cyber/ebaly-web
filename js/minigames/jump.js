// =========================================================
//  DOODLE JUMP (стрибун)
// =========================================================

const JUMP_GRAVITY = 0.5;
const JUMP_VELOCITY = -12;
const JUMP_MOVE_SPEED = 5;
const JUMP_PLATFORM_W = 65;
const JUMP_PLATFORM_H = 12;
const JUMP_PLATFORM_GAP_MIN = 60;
const JUMP_PLATFORM_GAP_MAX = 95;
const JUMP_THRESHOLD = 1500;

let gJump = {
  canvas: null,
  ctx: null,
  W: 0,
  H: 0,
  taskId: null,
  threshold: JUMP_THRESHOLD,
  running: false,
  raf: null,

  player: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    w: 36,
    h: 36,
  },

  platforms: [],
  cameraY: 0,       // зсув камери (може бути від'ємним)
  maxHeight: 0,
  moves: 0,
  startTime: 0,
  over: false,
  finished: false,

  touchLeft: false,
  touchRight: false,
  touchActive: false,
  touchStartX: 0,
  keyLeft: false,
  keyRight: false,
};

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initJump() {
  const wrap = document.querySelector('.game-jump-canvas-wrap');
  const canvas = document.getElementById('jump-canvas');
  if (!canvas || !wrap) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = wrap.clientWidth;
  const cssH = Math.floor(cssW * 1.5);

  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  gJump.canvas = canvas;
  gJump.ctx = ctx;
  gJump.W = cssW;
  gJump.H = cssH;

  // Гравець
  gJump.player.x = cssW / 2 - gJump.player.w / 2;
  gJump.player.y = cssH - 120;
  gJump.player.vx = 0;
  gJump.player.vy = JUMP_VELOCITY;

  // Камера — стартова така, щоб гравець знизу був внизу екрана
  // screenY гравця = p.y - cameraY. Хочемо, щоб він був ~60% від верху (тобто внизу)
  gJump.cameraY = gJump.player.y - cssH * 0.6;
  // = (cssH - 120) - 0.6*cssH = 0.4*cssH - 120

  gJump.platforms = [];
  gJump.maxHeight = 0;
  gJump.moves = 0;
  gJump.over = false;
  gJump.finished = false;
  gJump.running = true;
  gJump.startTime = Math.floor(Date.now() / 1000);

  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = gJump.startTime;
  currentGame.finished = false;

  // Стартова платформа
  gJump.platforms.push({
    x: gJump.player.x + gJump.player.w / 2 - JUMP_PLATFORM_W / 2,
    y: gJump.player.y + gJump.player.h,
    w: JUMP_PLATFORM_W,
    h: JUMP_PLATFORM_H,
  });

  // Початкові платформи
  let lastY = gJump.player.y + gJump.player.h;
  for (let i = 0; i < 12; i++) {
    lastY -= JUMP_PLATFORM_GAP_MIN + Math.random() * (JUMP_PLATFORM_GAP_MAX - JUMP_PLATFORM_GAP_MIN);
    gJump.platforms.push({
      x: Math.random() * (cssW - JUMP_PLATFORM_W),
      y: lastY,
      w: JUMP_PLATFORM_W,
      h: JUMP_PLATFORM_H,
    });
  }

  updateJumpUI();

  if (gJump.raf) cancelAnimationFrame(gJump.raf);
  gJump.raf = requestAnimationFrame(jumpLoop);
}

// =========================================================
//  ЦИКЛ
// =========================================================
function jumpLoop() {
  if (!gJump.running) return;
  updateJumpPhysics();
  renderJump();
  gJump.raf = requestAnimationFrame(jumpLoop);
}

function updateJumpPhysics() {
  if (gJump.over) return;

  const p = gJump.player;

  // Горизонтальний рух
  p.vx = 0;
  if (gJump.touchLeft || gJump.keyLeft)  p.vx = -JUMP_MOVE_SPEED;
  if (gJump.touchRight || gJump.keyRight) p.vx = JUMP_MOVE_SPEED;
  p.x += p.vx;

  // Завертання через краї
  if (p.x + p.w < 0) p.x = gJump.W;
  if (p.x > gJump.W) p.x = -p.w;

  // Гравітація
  p.vy += JUMP_GRAVITY;
  p.y += p.vy;

  // Платформи — зіткнення
  if (p.vy > 0) {
    for (const plat of gJump.platforms) {
      if (
        p.x + p.w > plat.x &&
        p.x < plat.x + plat.w &&
        p.y + p.h >= plat.y &&
        p.y + p.h <= plat.y + plat.h + Math.abs(p.vy) + 2
      ) {
        p.vy = JUMP_VELOCITY;
        p.y = plat.y - p.h;
        gJump.moves++;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        break;
      }
    }
  }

  // ====== КАМЕРА ======
  // screenY гравця = p.y - cameraY
  // Хочемо, щоб screenY >= H * 0.4 (гравець не вище 40% екрана)
  const screenY = p.y - gJump.cameraY;
  if (screenY < gJump.H * 0.4) {
    gJump.cameraY = p.y - gJump.H * 0.4;
  }

  // ====== ВИСОТА ======
  // Висота = наскільки камера вище стартової позиції
  // Стартовий cameraY = playerStartY - H*0.6
  // Висота = стартовий cameraY - поточний cameraY (тобто якщо камера зменшилась — гравець вгору)
  const startCameraY = (gJump.H - 120) - gJump.H * 0.6;
  const currentHeight = Math.floor(startCameraY - gJump.cameraY);
  if (currentHeight > gJump.maxHeight) {
    gJump.maxHeight = currentHeight;
    currentGame.score = gJump.maxHeight;
    updateJumpUI();

    if (gJump.maxHeight >= gJump.threshold && !gJump.finished) {
      setMinigameStatus(`🎉 ${gJump.maxHeight} / ${gJump.threshold}! Можеш грати далі або забрати нагороду`, 'win');
      setClaimButtonState(true);
    }
  }

  // Генеруємо нові платформи вгорі
  generateJumpPlatforms();

  // Видаляємо платформи, які вже нижче екрана з запасом
  gJump.platforms = gJump.platforms.filter(plat => {
    const sY = plat.y - gJump.cameraY;
    return sY < gJump.H + 200;
  });

  // Падіння нижче екрана — кінець
  if (p.y - gJump.cameraY > gJump.H + 50) {
    return jumpGameOver();
  }

  currentGame.moves = gJump.moves;
  updateMinigameInfo(currentGame.score, gJump.moves);
}

function generateJumpPlatforms() {
  // Найвища платформа у світі (мінімальний y)
  let highest = Infinity;
  for (const plat of gJump.platforms) {
    if (plat.y < highest) highest = plat.y;
  }
  if (highest === Infinity) highest = gJump.player.y;

  // Верхня межа у світових координатах — щоб у screenY це було -H*0.5
  const topLimitWorld = gJump.cameraY - gJump.H * 0.5;

  while (highest > topLimitWorld) {
    highest -= JUMP_PLATFORM_GAP_MIN + Math.random() * (JUMP_PLATFORM_GAP_MAX - JUMP_PLATFORM_GAP_MIN);
    gJump.platforms.push({
      x: Math.random() * (gJump.W - JUMP_PLATFORM_W),
      y: highest,
      w: JUMP_PLATFORM_W,
      h: JUMP_PLATFORM_H,
    });
  }
}

// =========================================================
//  РЕНДЕР
// =========================================================
function renderJump() {
  const ctx = gJump.ctx;
  const W = gJump.W;
  const H = gJump.H;

  // Фон
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1d21');
  grad.addColorStop(0.5, '#232730');
  grad.addColorStop(1, '#2a2e33');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Зірки — повільно рухаються вгору разом з камерою (паралакс 0.3)
  ctx.fillStyle = 'rgba(245,166,35,0.15)';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 73) % W;
    let sy = (i * 137 + gJump.cameraY * 0.3) % H;
    if (sy < 0) sy += H;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Платформи
  for (const plat of gJump.platforms) {
    const screenY = plat.y - gJump.cameraY;
    if (screenY < -JUMP_PLATFORM_H || screenY > H) continue;

    // Тінь
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(plat.x + 2, screenY + 2, plat.w, plat.h, 6);
    ctx.fill();

    // Платформа
    const g = ctx.createLinearGradient(plat.x, screenY, plat.x, screenY + plat.h);
    g.addColorStop(0, '#f7b84a');
    g.addColorStop(1, '#c47f0f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(plat.x, screenY, plat.w, plat.h, 6);
    ctx.fill();

    // Блиск
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(plat.x + 3, screenY + 1, plat.w - 6, 3, 2);
    ctx.fill();
  }

  // Гравець
  const px = gJump.player.x;
  const py = gJump.player.y - gJump.cameraY;

  // Тінь
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + gJump.player.w / 2, py + gJump.player.h + 4, gJump.player.w / 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Емодзі
  ctx.font = '34px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦘', px + gJump.player.w / 2, py + gJump.player.h / 2);
}

// =========================================================
//  КЕРУВАННЯ
// =========================================================
function setupJumpControls() {
  const canvas = gJump.canvas;
  if (!canvas) return;

  const handleStart = (clientX) => {
    gJump.touchActive = true;
    gJump.touchStartX = clientX;
    updateJumpTouchDirection(clientX);
  };

  const handleMove = (clientX) => {
    if (!gJump.touchActive) return;
    updateJumpTouchDirection(clientX);
  };

  const handleEnd = () => {
    gJump.touchActive = false;
    gJump.touchLeft = false;
    gJump.touchRight = false;
  };

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleStart(e.touches[0].clientX);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleEnd();
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleStart(e.clientX);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!gJump.touchActive) return;
    handleMove(e.clientX);
  });

  canvas.addEventListener('mouseup', (e) => {
    e.preventDefault();
    handleEnd();
  });

  canvas.addEventListener('mouseleave', () => {
    handleEnd();
  });

  document.addEventListener('keydown', handleJumpKey);
  document.addEventListener('keyup', handleJumpKeyUp);
}

function updateJumpTouchDirection(clientX) {
  const rect = gJump.canvas.getBoundingClientRect();
  const relX = clientX - rect.left;
  const half = rect.width / 2;
  gJump.touchLeft = relX < half;
  gJump.touchRight = relX >= half;
}

function handleJumpKey(e) {
  const overlay = document.getElementById('minigame-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;
  if (currentGame.gameId !== 'jump') return;

  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    gJump.keyLeft = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    gJump.keyRight = true;
  }
}

function handleJumpKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') gJump.keyLeft = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') gJump.keyRight = false;
}

// =========================================================
//  UI
// =========================================================
function updateJumpUI() {
  currentGame.score = gJump.maxHeight;
  currentGame.moves = gJump.moves;
  updateMinigameInfo(gJump.maxHeight, gJump.moves);
  updateJumpStatus();
}

function updateJumpStatus() {
  if (currentGame.finished) {
    setMinigameStatus('✅ Нагороду забрано!', 'win');
    setClaimButtonState(false);
    return;
  }

  if (gJump.over) {
    setMinigameStatus(`💀 Впав! Висота: ${gJump.maxHeight} / ${gJump.threshold}`, 'fail');
    setClaimButtonState(false);
    return;
  }

  if (gJump.maxHeight >= gJump.threshold) {
    setClaimButtonState(true);
  } else {
    setMinigameStatus(`🦘 ${gJump.maxHeight} / ${gJump.threshold} px`);
    setClaimButtonState(false);
  }
}

function jumpGameOver() {
  gJump.over = true;
  gJump.running = false;
  if (gJump.raf) cancelAnimationFrame(gJump.raf);
  gJump.raf = null;
  if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  updateJumpStatus();
}

// =========================================================
//  ВІДКРИТТЯ / ЗАКРИТТЯ / ПЕРЕЗАПУСК
// =========================================================
function openJump(taskId, threshold) {
  gJump.taskId = taskId;
  gJump.threshold = threshold || JUMP_THRESHOLD;

  updateMinigameHeader('🦘 Стрибун', gJump.threshold);

  const body = document.getElementById('minigame-body');
  body.innerHTML = `
    <div class="game-jump-container">
      <div class="game-jump-canvas-wrap">
        <canvas class="game-jump-canvas" id="jump-canvas"></canvas>
        <div class="game-jump-hint">👆 Тап ліва / права половина</div>
      </div>
      <div class="game-jump-stats">
        <div class="game-jump-stat">📏 <span class="val" id="jump-height">0</span> / ${gJump.threshold}</div>
        <div class="game-jump-stat">🦘 <span class="val" id="jump-moves">0</span></div>
      </div>
    </div>
  `;

  document.getElementById('minigame-overlay').classList.remove('hidden');

  setTimeout(() => {
    initJump();
    setupJumpControls();
  }, 50);
}

function closeJump() {
  gJump.running = false;
  if (gJump.raf) cancelAnimationFrame(gJump.raf);
  gJump.raf = null;
  gJump.touchActive = false;
  gJump.touchLeft = false;
  gJump.touchRight = false;
  gJump.keyLeft = false;
  gJump.keyRight = false;
  document.getElementById('minigame-overlay').classList.add('hidden');
}

function restartJump() {
  gJump.running = false;
  if (gJump.raf) cancelAnimationFrame(gJump.raf);
  gJump.raf = null;
  initJump();
}

function cleanupJump() {
  gJump.running = false;
  if (gJump.raf) cancelAnimationFrame(gJump.raf);
  gJump.raf = null;
  gJump.touchActive = false;
  gJump.touchLeft = false;
  gJump.touchRight = false;
  gJump.keyLeft = false;
  gJump.keyRight = false;
  document.removeEventListener('keydown', handleJumpKey);
  document.removeEventListener('keyup', handleJumpKeyUp);
}
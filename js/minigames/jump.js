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
const JUMP_THRESHOLD = 1500;   // висота в px

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

  platforms: [],     // [{x, y, w, h}]
  cameraY: 0,        // зсув камери (завжди >= 0)
  maxHeight: 0,      // максимальна висота (для score)
  moves: 0,          // кількість стрибків
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
  const cssH = Math.floor(cssW * 1.5); // 2:3 пропорція

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

  gJump.platforms = [];
  gJump.cameraY = 0;
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

  // Стартова платформа під гравцем
  gJump.platforms.push({
    x: gJump.player.x + gJump.player.w / 2 - JUMP_PLATFORM_W / 2,
    y: gJump.player.y + gJump.player.h,
    w: JUMP_PLATFORM_W,
    h: JUMP_PLATFORM_H,
  });

  // Генеруємо початкові платформи вгору
  let lastY = gJump.player.y;
  for (let i = 0; i < 10; i++) {
    lastY -= JUMP_PLATFORM_GAP_MIN + Math.random() * (JUMP_PLATFORM_GAP_MAX - JUMP_PLATFORM_GAP_MIN);
    gJump.platforms.push({
      x: Math.random() * (cssW - JUMP_PLATFORM_W),
      y: lastY,
      w: JUMP_PLATFORM_W,
      h: JUMP_PLATFORM_H,
    });
  }

  updateJumpUI();

  // Запуск циклу
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

  // Платформи
  if (p.vy > 0) {
    // Падає — перевіряємо зіткнення зверху
    for (const plat of gJump.platforms) {
      // Чи гравець над платформою і перетнув її зверху?
      if (
        p.x + p.w > plat.x &&
        p.x < plat.x + plat.w &&
        p.y + p.h >= plat.y &&
        p.y + p.h <= plat.y + plat.h + Math.abs(p.vy) + 2
      ) {
        // Стрибок
        p.vy = JUMP_VELOCITY;
        p.y = plat.y - p.h;
        gJump.moves++;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        break;
      }
    }
  }

  // Камера — якщо гравець вище середини екрана, рухаємо камеру
  const targetCameraY = Math.max(0, (gJump.H - 0.6 * gJump.H) - p.y);
  if (targetCameraY > gJump.cameraY) {
    gJump.cameraY = targetCameraY;
  }

  // Висота (для score) = камера + початкова позиція
  const currentHeight = Math.floor(gJump.cameraY);
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

  // Видаляємо платформи нижче екрана
  gJump.platforms = gJump.platforms.filter(plat => plat.y > p.y - gJump.H * 2);

  // Падіння нижче екрана — кінець
  if (p.y - gJump.cameraY > gJump.H + 50) {
    return jumpGameOver();
  }

  currentGame.moves = gJump.moves;
  updateMinigameInfo(currentGame.score, gJump.moves);
}

function generateJumpPlatforms() {
  // Знаходимо найвищу платформу
  let highest = gJump.platforms.reduce((min, p) => p.y < min ? p.y : min, Infinity);
  if (highest === Infinity) highest = gJump.player.y;

  // Генеруємо платформи поки найвища не вище за екран + запас
  while (highest > gJump.player.y - gJump.H * 1.5) {
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
//  РЕНДЕР (Canvas)
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

  // Зірки на фоні (стабільні)
  ctx.fillStyle = 'rgba(245,166,35,0.15)';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 73) % W;
    const sy = ((i * 137) - gJump.cameraY * 0.3) % H;
    ctx.fillRect(sx, sy < 0 ? sy + H : sy, 2, 2);
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

    // Сама платформа
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

  // Тінь під гравцем
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + gJump.player.w / 2, py + gJump.player.h + 4, gJump.player.w / 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Тіло — емодзі персонаж
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

  // Клавіатура (для ПК)
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

  // Створити DOM-структуру
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

  // Дати DOM осісти
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
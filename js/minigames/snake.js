// =========================================================
//  ЗМІЙКА — кабель збирає батарейки
// =========================================================

const SNAKE_SIZE = 12;
const SNAKE_SPEED = 300;      // повільна
const SNAKE_START_LEN = 3;

let gSnake = {
  snake: [],
  direction: 'right',
  nextDirection: 'right',
  food: null,
  score: 0,
  moves: 0,
  taskId: null,
  threshold: 10,
  startTime: 0,
  interval: null,
  countdownTimer: null,
  over: false,
  finished: false,
  started: false,
  touchStartX: 0,
  touchStartY: 0,
};

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initSnake() {
  gSnake.snake = [];
  for (let i = 0; i < SNAKE_START_LEN; i++) {
    gSnake.snake.push({ x: 5 - i, y: 6 });
  }
  gSnake.direction = 'right';
  gSnake.nextDirection = 'right';
  gSnake.score = 0;
  gSnake.moves = 0;
  gSnake.over = false;
  gSnake.finished = false;
  gSnake.started = false;
  gSnake.startTime = Math.floor(Date.now() / 1000);

  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = gSnake.startTime;
  currentGame.finished = false;

  spawnSnakeFood();

  renderSnakeBoard();
  updateSnakeUI();

  // Очистити попередні таймери
  if (gSnake.interval) clearInterval(gSnake.interval);
  if (gSnake.countdownTimer) clearInterval(gSnake.countdownTimer);

  startSnakeCountdown();
}

function startSnakeCountdown() {
  let count = 3;
  setMinigameStatus(`⏱ ${count}...`);
  setClaimButtonState(false);

  gSnake.countdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      setMinigameStatus(`⏱ ${count}...`);
    } else {
      clearInterval(gSnake.countdownTimer);
      gSnake.countdownTimer = null;
      setMinigameStatus('🚀 Поїхали!');

      setTimeout(() => {
        if (gSnake.over) return;
        gSnake.started = true;
        gSnake.startTime = Math.floor(Date.now() / 1000);
        currentGame.startTime = gSnake.startTime;
        updateSnakeStatus();
        gSnake.interval = setInterval(tickSnake, SNAKE_SPEED);
      }, 400);
    }
  }, 700);
}

function spawnSnakeFood() {
  const empty = [];
  for (let x = 0; x < SNAKE_SIZE; x++) {
    for (let y = 0; y < SNAKE_SIZE; y++) {
      if (!gSnake.snake.some(s => s.x === x && s.y === y)) {
        empty.push({ x, y });
      }
    }
  }
  if (empty.length === 0) return;
  gSnake.food = empty[Math.floor(Math.random() * empty.length)];
}

// =========================================================
//  РЕНДЕР
// =========================================================
function renderSnakeBoard() {
  const body = document.getElementById('minigame-body');
  if (!body) return;

  const container = document.createElement('div');
  container.className = 'game-snake-container';

  const field = document.createElement('div');
  field.className = 'game-snake-field';
  field.id = 'snake-field';
  field.style.gridTemplateColumns = `repeat(${SNAKE_SIZE}, 1fr)`;
  field.style.gridTemplateRows = `repeat(${SNAKE_SIZE}, 1fr)`;
  field.style.gap = '2px';

  for (let y = 0; y < SNAKE_SIZE; y++) {
    for (let x = 0; x < SNAKE_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'game-snake-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      field.appendChild(cell);
    }
  }

  container.appendChild(field);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'game-snake-stats';
  stats.innerHTML = `
    <div class="game-snake-stat">🔋 <span class="val" id="snake-score">0</span> / ${gSnake.threshold}</div>
    <div class="game-snake-stat">👣 <span class="val" id="snake-moves">0</span></div>
  `;
  container.appendChild(stats);

  // D-pad
  const dpad = document.createElement('div');
  dpad.className = 'game-snake-dpad';
  dpad.innerHTML = `
    <button class="game-snake-dpad-btn up" data-dir="up">▲</button>
    <button class="game-snake-dpad-btn left" data-dir="left">◀</button>
    <button class="game-snake-dpad-btn down" data-dir="down">▼</button>
    <button class="game-snake-dpad-btn right" data-dir="right">▶</button>
  `;
  container.appendChild(dpad);

  body.innerHTML = '';
  body.appendChild(container);

  // D-pad обробники
  dpad.querySelectorAll('.game-snake-dpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setSnakeDirection(btn.dataset.dir);
    });
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setSnakeDirection(btn.dataset.dir);
    }, { passive: false });
  });

  // Свайпи по полю
  field.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    gSnake.touchStartX = t.clientX;
    gSnake.touchStartY = t.clientY;
  }, { passive: true });

  field.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - gSnake.touchStartX;
    const dy = t.clientY - gSnake.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 25) return;

    if (absDx > absDy) {
      setSnakeDirection(dx > 0 ? 'right' : 'left');
    } else {
      setSnakeDirection(dy > 0 ? 'down' : 'up');
    }
  }, { passive: true });

  updateSnakeBoard();
}

function updateSnakeBoard() {
  const field = document.getElementById('snake-field');
  if (!field) return;

  const cells = field.querySelectorAll('.game-snake-cell');
  cells.forEach(cell => {
    cell.classList.remove('head', 'body', 'food');
  });

  gSnake.snake.forEach((seg, i) => {
    const idx = seg.y * SNAKE_SIZE + seg.x;
    const cell = cells[idx];
    if (cell) cell.classList.add(i === 0 ? 'head' : 'body');
  });

  if (gSnake.food) {
    const idx = gSnake.food.y * SNAKE_SIZE + gSnake.food.x;
    const cell = cells[idx];
    if (cell) cell.classList.add('food');
  }
}

function updateSnakeUI() {
  const scoreEl = document.getElementById('snake-score');
  const movesEl = document.getElementById('snake-moves');
  if (scoreEl) scoreEl.textContent = gSnake.score;
  if (movesEl) movesEl.textContent = gSnake.moves;

  currentGame.score = gSnake.score;
  currentGame.moves = gSnake.moves;
  updateMinigameInfo(gSnake.score, gSnake.moves);

  if (gSnake.started) updateSnakeStatus();
}

function updateSnakeStatus() {
  if (currentGame.finished) {
    setMinigameStatus('✅ Нагороду забрано!', 'win');
    setClaimButtonState(false);
    return;
  }

  if (gSnake.over) {
    setMinigameStatus(`💀 Гру закінчено! Батарейок: ${gSnake.score} / ${gSnake.threshold}`, 'fail');
    setClaimButtonState(false);
    return;
  }

  if (gSnake.score >= gSnake.threshold) {
    setMinigameStatus(`🎉 ${gSnake.score} батарейок! Можеш грати далі або забрати нагороду`, 'win');
    setClaimButtonState(true);
  } else {
    setMinigameStatus(`🔋 Батарейок: ${gSnake.score} / ${gSnake.threshold}`);
    setClaimButtonState(false);
  }
}

// =========================================================
//  РУХ
// =========================================================
function setSnakeDirection(dir) {
  const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
  if (opposites[dir] === gSnake.direction) return;
  gSnake.nextDirection = dir;
}

function tickSnake() {
  if (gSnake.over || !gSnake.started) return;

  gSnake.direction = gSnake.nextDirection;

  const head = { ...gSnake.snake[0] };

  if (gSnake.direction === 'up')    head.y--;
  if (gSnake.direction === 'down')  head.y++;
  if (gSnake.direction === 'left')  head.x--;
  if (gSnake.direction === 'right') head.x++;

  if (head.x < 0 || head.x >= SNAKE_SIZE || head.y < 0 || head.y >= SNAKE_SIZE) {
    return gameOverSnake();
  }

  if (gSnake.snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOverSnake();
  }

  gSnake.snake.unshift(head);
  gSnake.moves++;

  if (gSnake.food && head.x === gSnake.food.x && head.y === gSnake.food.y) {
    gSnake.score++;
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    spawnSnakeFood();
  } else {
    gSnake.snake.pop();
  }

  updateSnakeBoard();
  updateSnakeUI();
}

function gameOverSnake() {
  gSnake.over = true;
  if (gSnake.interval) clearInterval(gSnake.interval);
  gSnake.interval = null;

  if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');

  updateSnakeStatus();
}

// =========================================================
//  ВІДКРИТТЯ / ЗАКРИТТЯ / ПЕРЕЗАПУСК
// =========================================================
function openSnake(taskId, threshold) {
  gSnake.taskId = taskId;
  gSnake.threshold = threshold || 10;

  updateMinigameHeader('🐍 Змійка', gSnake.threshold);

  document.getElementById('minigame-overlay').classList.remove('hidden');

  initSnake();
}

function closeSnake() {
  if (gSnake.interval) clearInterval(gSnake.interval);
  if (gSnake.countdownTimer) clearInterval(gSnake.countdownTimer);
  gSnake.interval = null;
  gSnake.countdownTimer = null;
  document.getElementById('minigame-overlay').classList.add('hidden');
}

function restartSnake() {
  if (gSnake.interval) clearInterval(gSnake.interval);
  if (gSnake.countdownTimer) clearInterval(gSnake.countdownTimer);
  gSnake.interval = null;
  gSnake.countdownTimer = null;
  initSnake();
}

function cleanupSnake() {
  if (gSnake.interval) clearInterval(gSnake.interval);
  if (gSnake.countdownTimer) clearInterval(gSnake.countdownTimer);
  gSnake.interval = null;
  gSnake.countdownTimer = null;
}
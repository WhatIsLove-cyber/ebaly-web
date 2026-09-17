// =========================================================
//  2048 — гра
// =========================================================

const G2048_SIZE = 4;

let g2048 = {
  board: [],
  score: 0,
  moves: 0,
  startTime: 0,
  over: false,
  taskId: null,
  threshold: 256,
  touchStartX: 0,
  touchStartY: 0,
};

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function init2048() {
  g2048.board = Array(G2048_SIZE).fill(null).map(() => Array(G2048_SIZE).fill(0));
  g2048.score = 0;
  g2048.moves = 0;
  g2048.startTime = Math.floor(Date.now() / 1000);
  g2048.over = false;

  // Синхронізуємо з універсальним станом
  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = g2048.startTime;
  currentGame.finished = false;

  addRandomTile();
  addRandomTile();
  render2048();
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < G2048_SIZE; r++) {
    for (let c = 0; c < G2048_SIZE; c++) {
      if (g2048.board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g2048.board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

// =========================================================
//  РЕНДЕР
// =========================================================
function render2048() {
  const body = document.getElementById('minigame-body');
  if (!body) return;

  let grid = body.querySelector('.game2048-grid');
  if (!grid) {
    body.innerHTML = '';
    grid = document.createElement('div');
    grid.className = 'game2048-grid';
    grid.id = 'game2048-grid';
    for (let i = 0; i < G2048_SIZE * G2048_SIZE; i++) {
      const tile = document.createElement('div');
      tile.className = 'game2048-tile';
      tile.dataset.index = i;
      grid.appendChild(tile);
    }
    body.appendChild(grid);

    const hint = document.createElement('div');
    hint.className = 'game2048-hint';
    hint.textContent = 'Свайп або стрілки для руху';
    body.appendChild(hint);

    attach2048Controls(grid);
  }

  const tiles = grid.querySelectorAll('.game2048-tile');
  let idx = 0;
  for (let r = 0; r < G2048_SIZE; r++) {
    for (let c = 0; c < G2048_SIZE; c++) {
      const tile = tiles[idx];
      const val = g2048.board[r][c];
      if (val === 0) {
        tile.textContent = '';
        tile.removeAttribute('data-value');
      } else {
        tile.textContent = val;
        tile.dataset.value = val;
      }
      idx++;
    }
  }

  // Info (через універсальні хелпери)
  currentGame.score = g2048.score;
  currentGame.moves = g2048.moves;
  updateMinigameInfo(g2048.score, g2048.moves);

  update2048Status();
}

function update2048Status() {
  if (currentGame.finished) {
    setMinigameStatus('✅ Нагороду забрано! Можеш грати далі.', 'win');
    setClaimButtonState(false);
    return;
  }

  if (g2048.over) {
    setMinigameStatus(`💀 Гру закінчено! Очки: ${g2048.score}. Треба ${g2048.threshold}.`, 'fail');
    setClaimButtonState(false);
    return;
  }

  if (g2048.score >= g2048.threshold) {
    setMinigameStatus(`🎉 Поріг досягнуто! ${g2048.score} / ${g2048.threshold}`, 'win');
    setClaimButtonState(true);
  } else {
    setMinigameStatus(`Потрібно ${g2048.threshold} очок. У тебе: ${g2048.score}`);
    setClaimButtonState(false);
  }
}

// =========================================================
//  ЛОГІКА ГРИ
// =========================================================
function move2048(direction) {
  if (g2048.over) return;

  const before = JSON.stringify(g2048.board);
  let gained = 0;

  const rotate = (board) => {
    const n = G2048_SIZE;
    const result = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        result[c][n - 1 - r] = board[r][c];
      }
    }
    return result;
  };

  const slideLeft = (row) => {
    const filtered = row.filter(v => v !== 0);
    const result = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const merged = filtered[i] * 2;
        result.push(merged);
        gained += merged;
        i += 2;
      } else {
        result.push(filtered[i]);
        i++;
      }
    }
    while (result.length < G2048_SIZE) result.push(0);
    return result;
  };

  let rotations = 0;
  if (direction === 'up')    rotations = 1;
  if (direction === 'right') rotations = 2;
  if (direction === 'down')  rotations = 3;

  let board = g2048.board;
  for (let i = 0; i < rotations; i++) board = rotate(board);
  board = board.map(row => slideLeft(row));
  for (let i = 0; i < (4 - rotations) % 4; i++) board = rotate(board);

  g2048.board = board;

  if (JSON.stringify(g2048.board) !== before) {
    g2048.moves++;
    g2048.score += gained;
    addRandomTile();
    render2048();
    check2048GameOver();

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  }
}

function check2048GameOver() {
  for (let r = 0; r < G2048_SIZE; r++) {
    for (let c = 0; c < G2048_SIZE; c++) {
      if (g2048.board[r][c] === 0) return false;
    }
  }

  for (let r = 0; r < G2048_SIZE; r++) {
    for (let c = 0; c < G2048_SIZE; c++) {
      const v = g2048.board[r][c];
      if (c + 1 < G2048_SIZE && g2048.board[r][c + 1] === v) return false;
      if (r + 1 < G2048_SIZE && g2048.board[r + 1][c] === v) return false;
    }
  }

  g2048.over = true;
  update2048Status();
  return true;
}

// =========================================================
//  КОНТРОЛІ
// =========================================================
function attach2048Controls(grid) {
  document.addEventListener('keydown', handle2048Key);

  grid.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    g2048.touchStartX = t.clientX;
    g2048.touchStartY = t.clientY;
  }, { passive: true });

  grid.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - g2048.touchStartX;
    const dy = t.clientY - g2048.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 30) return;

    if (absDx > absDy) {
      move2048(dx > 0 ? 'right' : 'left');
    } else {
      move2048(dy > 0 ? 'down' : 'up');
    }
  }, { passive: true });
}

function handle2048Key(e) {
  const overlay = document.getElementById('minigame-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;

  const map = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };
  const dir = map[e.key];
  if (dir) {
    e.preventDefault();
    move2048(dir);
  }
}

// =========================================================
//  ВІДКРИТТЯ / ЗАКРИТТЯ / ПЕРЕЗАПУСК
// =========================================================
function open2048(taskId, threshold) {
  g2048.taskId = taskId;
  g2048.threshold = threshold || 256;
  g2048.finished = false;

  updateMinigameHeader('🧩 2048', g2048.threshold);

  document.getElementById('minigame-overlay').classList.remove('hidden');

  init2048();
}

function close2048() {
  document.getElementById('minigame-overlay').classList.add('hidden');
  document.removeEventListener('keydown', handle2048Key);
}

function restart2048() {
  init2048();
}

function cleanup2048() {
  document.removeEventListener('keydown', handle2048Key);
}
// =========================================================
//  СУДОКУ 4×4
// =========================================================

const SUDOKU_SIZE = 4;
const SUDOKU_REVEAL = 8;   // скільки клітинок показано

let gSudoku = {
  solution: [],       // розв'язок 4×4
  board: [],          // поточний стан (0 = порожньо)
  fixed: [],          // true = показано спочатку
  selected: null,     // {row, col}
  moves: 0,           // скільки цифр вписано
  taskId: null,
  threshold: 1,
  startTime: 0,
  solved: false,
  finished: false,
};

// =========================================================
//  ГЕНЕРАЦІЯ СУДОКУ
// =========================================================
function generateSudokuSolution() {
  // Базовий валідний розв'язок 4×4
  // [1, 2, 3, 4]
  // [3, 4, 1, 2]
  // [2, 1, 4, 3]
  // [4, 3, 2, 1]
  const base = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];

  // Рандомізація: перемішуємо цифри (1-4 → випадкова перестановка)
  const map = [0, 1, 2, 3, 4];
  for (let i = map.length - 1; i > 1; i--) {
    const j = Math.floor(Math.random() * (i - 1)) + 1;
    [map[i], map[j]] = [map[j], map[i]];
  }

  // Перемішуємо рядки в межах блоків (0-1, 2-3)
  const rowPerm = [[0, 1], [2, 3]];
  rowPerm.forEach(pair => {
    if (Math.random() < 0.5) [pair[0], pair[1]] = [pair[1], pair[0]];
  });
  const rowOrder = [...rowPerm[0], ...rowPerm[1]];

  // Перемішуємо стовпці в межах блоків
  const colPerm = [[0, 1], [2, 3]];
  colPerm.forEach(pair => {
    if (Math.random() < 0.5) [pair[0], pair[1]] = [pair[1], pair[0]];
  });
  const colOrder = [...colPerm[0], ...colPerm[1]];

  // Застосовуємо перестановки
  const result = [];
  for (let r = 0; r < 4; r++) {
    const row = [];
    for (let c = 0; c < 4; c++) {
      row.push(map[base[rowOrder[r]][colOrder[c]]]);
    }
    result.push(row);
  }

  return result;
}

function generateSudokuPuzzle(solution) {
  // Створюємо список усіх позицій
  const positions = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      positions.push({ r, c });
    }
  }

  // Перемішуємо
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Залишаємо SUDOKU_REVEAL клітинок, решта — порожні
  const puzzle = solution.map(row => [...row]);
  const fixed = Array(4).fill(null).map(() => Array(4).fill(false));

  const keep = positions.slice(0, SUDOKU_REVEAL);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      puzzle[r][c] = 0;
    }
  }
  keep.forEach(({ r, c }) => {
    puzzle[r][c] = solution[r][c];
    fixed[r][c] = true;
  });

  return { puzzle, fixed };
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initSudoku() {
  gSudoku.solution = generateSudokuSolution();
  const { puzzle, fixed } = generateSudokuPuzzle(gSudoku.solution);
  gSudoku.board = puzzle;
  gSudoku.fixed = fixed;
  gSudoku.selected = null;
  gSudoku.moves = 0;
  gSudoku.solved = false;
  gSudoku.finished = false;
  gSudoku.startTime = Math.floor(Date.now() / 1000);

  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = gSudoku.startTime;
  currentGame.finished = false;

  renderSudokuBoard();
  updateSudokuUI();
}

// =========================================================
//  РЕНДЕР
// =========================================================
function renderSudokuBoard() {
  const body = document.getElementById('minigame-body');
  if (!body) return;

  const container = document.createElement('div');
  container.className = 'game-sudoku-container';

  // Сітка
  const grid = document.createElement('div');
  grid.className = 'game-sudoku-grid';
  grid.id = 'sudoku-grid';

  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'game-sudoku-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => selectSudokuCell(r, c));
      grid.appendChild(cell);
    }
  }
  container.appendChild(grid);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'game-sudoku-stats';
  stats.innerHTML = `
    <div class="game-sudoku-stat">✏️ Вписано: <span class="val" id="sudoku-moves">0</span></div>
    <div class="game-sudoku-stat">🎯 Заповнено: <span class="val" id="sudoku-filled">0</span> / 16</div>
  `;
  container.appendChild(stats);

  // Клавіатура цифр
  const keypad = document.createElement('div');
  keypad.className = 'game-sudoku-keypad';
  keypad.innerHTML = `
    <button class="game-sudoku-key" data-num="1">1</button>
    <button class="game-sudoku-key" data-num="2">2</button>
    <button class="game-sudoku-key" data-num="3">3</button>
    <button class="game-sudoku-key erase" data-num="0">⌫</button>
  `;
  container.appendChild(keypad);

  // Кнопка перевірити
  const checkBtn = document.createElement('button');
  checkBtn.className = 'game-sudoku-check';
  checkBtn.id = 'sudoku-check-btn';
  checkBtn.textContent = '✅ Перевірити';
  checkBtn.addEventListener('click', checkSudoku);
  container.appendChild(checkBtn);

  body.innerHTML = '';
  body.appendChild(container);

  // Обробники клавіатури
  keypad.querySelectorAll('.game-sudoku-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.num);
      if (num === 0) {
        eraseSudokuCell();
      } else {
        enterSudokuNumber(num);
      }
    });
  });

  updateSudokuBoard();
}

function updateSudokuBoard() {
  const grid = document.getElementById('sudoku-grid');
  if (!grid) return;

  const cells = grid.querySelectorAll('.game-sudoku-cell');
  let filled = 0;
  let hasConflict = false;

  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const idx = r * SUDOKU_SIZE + c;
      const cell = cells[idx];
      const val = gSudoku.board[r][c];

      cell.textContent = val === 0 ? '' : val;
      cell.classList.remove('selected', 'user-filled', 'conflict', 'correct', 'fixed');

      if (gSudoku.fixed[r][c]) {
        cell.classList.add('fixed');
      } else if (val !== 0) {
        cell.classList.add('user-filled');
        if (hasSudokuConflict(r, c)) {
          cell.classList.add('conflict');
          hasConflict = true;
        }
      }

      if (val !== 0) filled++;

      if (gSudoku.selected && gSudoku.selected.r === r && gSudoku.selected.c === c) {
        cell.classList.add('selected');
      }
    }
  }

  const filledEl = document.getElementById('sudoku-filled');
  if (filledEl) filledEl.textContent = filled;

  const movesEl = document.getElementById('sudoku-moves');
  if (movesEl) movesEl.textContent = gSudoku.moves;

  currentGame.moves = gSudoku.moves;

  // Автоматична перевірка, якщо все заповнено і немає конфліктів
  if (filled === 16 && !hasConflict && !gSudoku.solved) {
    checkSudoku();
  }
}

function hasSudokuConflict(r, c) {
  const val = gSudoku.board[r][c];
  if (val === 0) return false;

  // Перевірка рядка
  for (let i = 0; i < SUDOKU_SIZE; i++) {
    if (i !== c && gSudoku.board[r][i] === val) return true;
  }
  // Стовпця
  for (let i = 0; i < SUDOKU_SIZE; i++) {
    if (i !== r && gSudoku.board[i][c] === val) return true;
  }
  // Квадрата 2×2
  const boxR = Math.floor(r / 2) * 2;
  const boxC = Math.floor(c / 2) * 2;
  for (let i = boxR; i < boxR + 2; i++) {
    for (let j = boxC; j < boxC + 2; j++) {
      if ((i !== r || j !== c) && gSudoku.board[i][j] === val) return true;
    }
  }
  return false;
}

// =========================================================
//  ВВЕДЕННЯ
// =========================================================
function selectSudokuCell(r, c) {
  if (gSudoku.fixed[r][c]) return;
  if (gSudoku.solved) return;

  gSudoku.selected = { r, c };
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  updateSudokuBoard();
}

function enterSudokuNumber(num) {
  if (!gSudoku.selected) {
    showToast('Спочатку вибери клітинку');
    return;
  }
  if (gSudoku.solved) return;

  const { r, c } = gSudoku.selected;
  if (gSudoku.fixed[r][c]) return;

  if (gSudoku.board[r][c] === 0) gSudoku.moves++;
  gSudoku.board[r][c] = num;

  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  updateSudokuBoard();
}

function eraseSudokuCell() {
  if (!gSudoku.selected) return;
  if (gSudoku.solved) return;

  const { r, c } = gSudoku.selected;
  if (gSudoku.fixed[r][c]) return;

  gSudoku.board[r][c] = 0;
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  updateSudokuBoard();
}

// =========================================================
//  ПЕРЕВІРКА
// =========================================================
function checkSudoku() {
  // Перевіряємо, чи board === solution
  let allCorrect = true;
  let allFilled = true;

  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (gSudoku.board[r][c] === 0) allFilled = false;
      if (gSudoku.board[r][c] !== gSudoku.solution[r][c]) allCorrect = false;
    }
  }

  if (allCorrect && allFilled) {
    // ✅ Розв'язано!
    gSudoku.solved = true;

    // Підсвітити все зеленим
    const grid = document.getElementById('sudoku-grid');
    if (grid) {
      grid.querySelectorAll('.game-sudoku-cell').forEach(cell => {
        if (!cell.classList.contains('fixed')) {
          cell.classList.add('correct');
        }
      });
    }

    currentGame.score = 1;
    updateMinigameInfo(1, gSudoku.moves);

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    setMinigameStatus('🎉 Судоку розв\'язано!', 'win');
    setClaimButtonState(true);
    return;
  }

  if (!allFilled) {
    setMinigameStatus(`⚠️ Заповни всі клітинки. Залишилось: ${16 - countFilledSudoku()}`, 'fail');
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
    return;
  }

  // Не все правильно
  if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');

  // Показати правильні/неправильні клітинки
  const grid = document.getElementById('sudoku-grid');
  if (grid) {
    const cells = grid.querySelectorAll('.game-sudoku-cell');
    for (let r = 0; r < SUDOKU_SIZE; r++) {
      for (let c = 0; c < SUDOKU_SIZE; c++) {
        const idx = r * SUDOKU_SIZE + c;
        const cell = cells[idx];
        if (gSudoku.fixed[r][c]) continue;
        if (gSudoku.board[r][c] === gSudoku.solution[r][c]) {
          cell.classList.add('correct');
        } else {
          cell.classList.add('conflict');
        }
      }
    }
  }

  setMinigameStatus('❌ Є помилки. Виправ і спробуй ще!', 'fail');
}

function countFilledSudoku() {
  let n = 0;
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (gSudoku.board[r][c] !== 0) n++;
    }
  }
  return n;
}

// =========================================================
//  UI
// =========================================================
function updateSudokuUI() {
  currentGame.score = gSudoku.solved ? 1 : 0;
  currentGame.moves = gSudoku.moves;

  updateMinigameInfo(currentGame.score, gSudoku.moves);
  updateSudokuStatus();
}

function updateSudokuStatus() {
  if (currentGame.finished) {
    setMinigameStatus('✅ Нагороду забрано!', 'win');
    setClaimButtonState(false);
    return;
  }

  if (gSudoku.solved) {
    setMinigameStatus('🎉 Судоку розв\'язано!', 'win');
    setClaimButtonState(true);
    return;
  }

  setMinigameStatus('Заповни сітку цифрами 1-4');
  setClaimButtonState(false);
}

// =========================================================
//  ВІДКРИТТЯ / ЗАКРИТТЯ / ПЕРЕЗАПУСК
// =========================================================
function openSudoku(taskId, threshold) {
  gSudoku.taskId = taskId;
  gSudoku.threshold = threshold || 1;

  updateMinigameHeader('🔲 Судоку 4×4', gSudoku.threshold);

  document.getElementById('minigame-overlay').classList.remove('hidden');

  initSudoku();
}

function closeSudoku() {
  document.getElementById('minigame-overlay').classList.add('hidden');
}

function restartSudoku() {
  initSudoku();
}

function cleanupSudoku() {
  // Нічого складного
}
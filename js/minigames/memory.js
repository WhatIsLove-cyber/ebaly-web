// =========================================================
//  MEMORY — знайди пару
// =========================================================

const MEMORY_PAIRS = 8;      // 8 пар = 16 карток
const MEMORY_EMOJIS = ['🎯', '🔫', '🛡', '⚡', '🎖', '🚁', '🚀', '💣'];

let gMemory = {
  deck: [],              // масив карток {emoji, id, matched}
  firstCard: null,       // перша відкрита картка
  lockBoard: false,      // блокування поки не закриються
  matchedPairs: 0,
  moves: 0,              // кожна пара тапів = 1 хід
  taskId: null,
  threshold: 8,
  startTime: 0,
  finished: false,
};

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initMemory() {
  gMemory.deck = [];
  gMemory.firstCard = null;
  gMemory.lockBoard = false;
  gMemory.matchedPairs = 0;
  gMemory.moves = 0;
  gMemory.startTime = Math.floor(Date.now() / 1000);
  gMemory.finished = false;

  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = gMemory.startTime;
  currentGame.finished = false;

  // Створюємо колоду: 8 емодзі × 2 = 16 карток
  const cards = [];
  MEMORY_EMOJIS.forEach((emoji, idx) => {
    cards.push({ emoji, pairId: idx, matched: false });
    cards.push({ emoji, pairId: idx, matched: false });
  });

  // Перемішуємо
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  gMemory.deck = cards;

  renderMemoryBoard();
  updateMemoryUI();
}

// =========================================================
//  РЕНДЕР
// =========================================================
function renderMemoryBoard() {
  const body = document.getElementById('minigame-body');
  if (!body) return;

  const grid = document.createElement('div');
  grid.className = 'game-memory-grid';
  grid.id = 'memory-grid';

  gMemory.deck.forEach((card, idx) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'game-memory-card';
    cardEl.dataset.index = idx;
    cardEl.innerHTML = `
      <div class="game-memory-face game-memory-back">?</div>
      <div class="game-memory-face game-memory-front">${card.emoji}</div>
    `;

    cardEl.addEventListener('click', () => flipMemoryCard(idx, cardEl));

    grid.appendChild(cardEl);
  });

  body.innerHTML = '';
  body.appendChild(grid);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'game-memory-stats';
  stats.innerHTML = `
    <div class="game-memory-stat">🎯 Пари: <span class="val" id="memory-pairs">0</span> / ${MEMORY_PAIRS}</div>
    <div class="game-memory-stat">🔄 Ходи: <span class="val" id="memory-moves">0</span></div>
  `;
  body.appendChild(stats);
}

function updateMemoryUI() {
  const pairsEl = document.getElementById('memory-pairs');
  const movesEl = document.getElementById('memory-moves');
  if (pairsEl) pairsEl.textContent = gMemory.matchedPairs;
  if (movesEl) movesEl.textContent = gMemory.moves;

  currentGame.score = gMemory.matchedPairs;
  currentGame.moves = gMemory.moves;
  updateMinigameInfo(gMemory.matchedPairs, gMemory.moves);

  updateMemoryStatus();
}

function updateMemoryStatus() {
  if (currentGame.finished) {
    setMinigameStatus('✅ Нагороду забрано!', 'win');
    setClaimButtonState(false);
    return;
  }

  if (gMemory.matchedPairs >= MEMORY_PAIRS) {
    setMinigameStatus(`🎉 Всі пари знайдено! Ходів: ${gMemory.moves}`, 'win');
    setClaimButtonState(true);
    return;
  }

  setMinigameStatus(`Знайдено пар: ${gMemory.matchedPairs} / ${MEMORY_PAIRS}`);
  setClaimButtonState(false);
}

// =========================================================
//  ЛОГІКА ГРИ
// =========================================================
function flipMemoryCard(idx, cardEl) {
  if (gMemory.lockBoard) return;
  if (cardEl.classList.contains('flipped')) return;
  if (cardEl.classList.contains('matched')) return;

  // Відкриваємо
  cardEl.classList.add('flipped');

  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

  const cardData = gMemory.deck[idx];

  // Перша картка
  if (!gMemory.firstCard) {
    gMemory.firstCard = { idx, el: cardEl, data: cardData };
    return;
  }

  // Друга картка — перевіряємо пару
  const first = gMemory.firstCard;
  const second = { idx, el: cardEl, data: cardData };

  gMemory.moves++;

  if (first.data.pairId === second.data.pairId) {
    // ✅ Пара знайдена
    setTimeout(() => {
      first.el.classList.add('matched');
      second.el.classList.add('matched');
      gMemory.matchedPairs++;

      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

      updateMemoryUI();

      if (gMemory.matchedPairs >= MEMORY_PAIRS) {
        // Всі пари знайдені — перемога
        setTimeout(() => finishMemory(), 300);
      }
    }, 300);
  } else {
    // ❌ Не пара — закриваємо через 800 мс
    gMemory.lockBoard = true;
    setTimeout(() => {
      first.el.classList.remove('flipped');
      second.el.classList.remove('flipped');
      gMemory.lockBoard = false;

      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');

      updateMemoryUI();
    }, 800);
  }

  gMemory.firstCard = null;

  // Оновити UI (moves, pairs)
  setTimeout(() => updateMemoryUI(), 50);
}

function finishMemory() {
  updateMemoryStatus();
}

// =========================================================
//  ВІДКРИТТЯ / ЗАКРИТТЯ / ПЕРЕЗАПУСК
// =========================================================
function openMemory(taskId, threshold) {
  gMemory.taskId = taskId;
  gMemory.threshold = threshold || 8;

  updateMinigameHeader('🧠 Memory', gMemory.threshold);

  document.getElementById('minigame-overlay').classList.remove('hidden');

  initMemory();
}

function closeMemory() {
  document.getElementById('minigame-overlay').classList.add('hidden');
}

function restartMemory() {
  initMemory();
}

function cleanupMemory() {
  // Нічого складного, все очищується при init
}
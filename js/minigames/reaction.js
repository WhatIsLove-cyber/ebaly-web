// =========================================================
//  РЕАКЦІЯ — гра
// =========================================================

const REACTION_TOTAL = 10;      // всього цілей
const REACTION_TIMEOUT = 1500;  // мс на одну ціль

let gReaction = {
  hits: 0,
  misses: 0,
  attempts: 0,       // 0..10
  taskId: null,
  threshold: 7,
  startTime: 0,
  currentTimeout: null,
  tickInterval: null,
  targetEl: null,
  fieldEl: null,
  targetX: 0,
  targetY: 0,
  roundStartTime: 0,
  finished: false,
};

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initReaction() {
  gReaction.hits = 0;
  gReaction.misses = 0;
  gReaction.attempts = 0;
  gReaction.startTime = Math.floor(Date.now() / 1000);
  gReaction.finished = false;

  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = gReaction.startTime;
  currentGame.finished = false;

  renderReactionField();
  renderReactionDots();
  updateMinigameInfo(gReaction.hits, gReaction.attempts);

  // Старт першої цілі
  setTimeout(() => spawnReactionTarget(), 500);
}

function renderReactionField() {
  const body = document.getElementById('minigame-body');
  if (!body) return;

  body.innerHTML = `
    <div class="game-reaction-field" id="reaction-field">
      <div class="game-reaction-timer" id="reaction-timer"></div>
    </div>
    <div class="game-reaction-stats">
      <div class="game-reaction-stat">✅ <span class="hits" id="reaction-hits">0</span></div>
      <div class="game-reaction-stat">❌ <span class="misses" id="reaction-misses">0</span></div>
      <div class="game-reaction-stat">📊 <span id="reaction-progress">0 / ${REACTION_TOTAL}</span></div>
    </div>
    <div class="game-reaction-dots" id="reaction-dots"></div>
  `;

  gReaction.fieldEl = document.getElementById('reaction-field');
}

function renderReactionDots() {
  const dotsEl = document.getElementById('reaction-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  for (let i = 0; i < REACTION_TOTAL; i++) {
    const dot = document.createElement('div');
    dot.className = 'game-reaction-dot';
    dot.dataset.index = i;
    dotsEl.appendChild(dot);
  }
}

function updateReactionDots() {
  const dots = document.querySelectorAll('.game-reaction-dot');
  dots.forEach((dot, i) => {
    dot.className = 'game-reaction-dot';
    if (i < gReaction.attempts) {
      // Визначаємо hit чи miss за результатом
      if (i < gReaction.hits) dot.classList.add('hit');
      else dot.classList.add('miss');
    }
  });
}

// =========================================================
//  ЦІЛЬ
// =========================================================
function spawnReactionTarget() {
  if (gReaction.attempts >= REACTION_TOTAL) {
    finishReaction();
    return;
  }

  const field = gReaction.fieldEl;
  if (!field) return;

  const fieldW = field.clientWidth;
  const fieldH = field.clientHeight;
  const targetSize = fieldW < 320 ? 56 : (fieldW < 380 ? 64 : 72);
  const padding = 8;

  // Рандомна позиція
  const maxX = fieldW - targetSize - padding * 2;
  const maxY = fieldH - targetSize - padding * 2;
  const x = padding + Math.random() * maxX;
  const y = padding + Math.random() * maxY;

  gReaction.targetX = x;
  gReaction.targetY = y;
  gReaction.roundStartTime = Date.now();

  // Створити ціль
  const target = document.createElement('div');
  target.className = 'game-reaction-target';
  target.style.left = x + 'px';
  target.style.top = y + 'px';
  target.textContent = '🎯';

  target.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleReactionHit(target);
  }, { passive: false });

  target.addEventListener('click', (e) => {
    e.preventDefault();
    handleReactionHit(target);
  });

  field.appendChild(target);
  gReaction.targetEl = target;

  // Таймер
  startReactionTimer();

  // Автоматичний miss
  gReaction.currentTimeout = setTimeout(() => {
    handleReactionMiss(target);
  }, REACTION_TIMEOUT);
}

function startReactionTimer() {
  clearInterval(gReaction.tickInterval);
  const timerEl = document.getElementById('reaction-timer');
  if (!timerEl) return;

  gReaction.tickInterval = setInterval(() => {
    const elapsed = Date.now() - gReaction.roundStartTime;
    const remaining = Math.max(0, 1 - elapsed / REACTION_TIMEOUT);
    timerEl.style.transform = `scaleX(${remaining})`;

    if (remaining <= 0) {
      clearInterval(gReaction.tickInterval);
    }
  }, 30);
}

function handleReactionHit(target) {
  if (target.classList.contains('hit') || target.classList.contains('miss')) return;

  clearTimeout(gReaction.currentTimeout);
  clearInterval(gReaction.tickInterval);

  target.classList.add('hit');

  gReaction.hits++;
  gReaction.attempts++;

  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

  updateReactionUI();

  setTimeout(() => {
    target.remove();
    if (gReaction.attempts >= REACTION_TOTAL) {
      finishReaction();
    } else {
      spawnReactionTarget();
    }
  }, 250);
}

function handleReactionMiss(target) {
  if (target.classList.contains('hit') || target.classList.contains('miss')) return;

  clearInterval(gReaction.tickInterval);

  target.classList.add('miss');

  gReaction.misses++;
  gReaction.attempts++;

  if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');

  updateReactionUI();

  setTimeout(() => {
    target.remove();
    if (gReaction.attempts >= REACTION_TOTAL) {
      finishReaction();
    } else {
      spawnReactionTarget();
    }
  }, 300);
}

function updateReactionUI() {
  const hitsEl = document.getElementById('reaction-hits');
  const missesEl = document.getElementById('reaction-misses');
  const progressEl = document.getElementById('reaction-progress');

  if (hitsEl) hitsEl.textContent = gReaction.hits;
  if (missesEl) missesEl.textContent = gReaction.misses;
  if (progressEl) progressEl.textContent = `${gReaction.attempts} / ${REACTION_TOTAL}`;

  // Синхронізуємо з currentGame
  currentGame.score = gReaction.hits;
  currentGame.moves = gReaction.attempts;

  updateMinigameInfo(gReaction.hits, gReaction.attempts);
  updateReactionDots();
  updateReactionStatus();
}

function updateReactionStatus() {
  if (currentGame.finished) {
    setMinigameStatus('✅ Нагороду забрано!', 'win');
    setClaimButtonState(false);
    return;
  }

  if (gReaction.attempts >= REACTION_TOTAL) {
    if (gReaction.hits >= gReaction.threshold) {
      setMinigameStatus(`🎉 Готово! ${gReaction.hits} / ${REACTION_TOTAL} влучань. Поріг пройдено!`, 'win');
      setClaimButtonState(true);
    } else {
      setMinigameStatus(`💀 Готово! ${gReaction.hits} / ${REACTION_TOTAL}. Треба ${gReaction.threshold}. Спробуй ще!`, 'fail');
      setClaimButtonState(false);
    }
    return;
  }

  setMinigameStatus(`Влучань: ${gReaction.hits} / Треба: ${gReaction.threshold}`);
  setClaimButtonState(false);
}

function finishReaction() {
  clearTimeout(gReaction.currentTimeout);
  clearInterval(gReaction.tickInterval);
  updateReactionStatus();
}

// =========================================================
//  ВІДКРИТТЯ / ЗАКРИТТЯ / ПЕРЕЗАПУСК
// =========================================================
function openReaction(taskId, threshold) {
  gReaction.taskId = taskId;
  gReaction.threshold = threshold || 7;

  updateMinigameHeader('⚡ Реакція', gReaction.threshold);

  document.getElementById('minigame-overlay').classList.remove('hidden');

  initReaction();
}

function closeReaction() {
  clearTimeout(gReaction.currentTimeout);
  clearInterval(gReaction.tickInterval);
  document.getElementById('minigame-overlay').classList.add('hidden');
}

function restartReaction() {
  clearTimeout(gReaction.currentTimeout);
  clearInterval(gReaction.tickInterval);
  initReaction();
}

function cleanupReaction() {
  clearTimeout(gReaction.currentTimeout);
  clearInterval(gReaction.tickInterval);
}
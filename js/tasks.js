// =========================================================
//  ЗАВДАННЯ — клік відкриває міні-гру
// =========================================================

function renderTaskGroup(type, containerId, countId) {
  const tasks = TASKS.filter(t => t.type === type);
  const available = tasks.filter(t => getCooldownRemaining(t) === 0).length;

  const countEl = document.getElementById(countId);
  if (countEl) countEl.textContent = `${available}/${tasks.length}`;

  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  tasks.forEach(task => {
    const remaining = getCooldownRemaining(task);
    const onCooldown = remaining > 0;

    const div = document.createElement('div');
    div.className = 'task ' + type + (onCooldown ? ' disabled' : '');

    const progressPct = onCooldown ? Math.floor((1 - remaining / task.cooldown) * 100) : 0;

    div.innerHTML = `
      <div class="task-row">
        <span class="task-name">${task.name}</span>
        <span class="task-reward">+${task.reward} Е</span>
      </div>
      ${onCooldown ? `
        <div class="task-progress"><div class="task-progress-fill" style="width:${progressPct}%"></div></div>
        <div class="task-timer" data-timer="${task.id}">⏱ ${formatTime(remaining)}</div>
      ` : `<div class="task-desc available">🎮 Натисни щоб грати</div>`}
    `;

    // Клік завжди відкриває гру (незалежно від кулдауну)
    div.addEventListener('click', () => openMinigame(task));

    container.appendChild(div);
  });
}

function renderTasks() {
  renderTaskGroup('normal', 'tasks-normal', 'count-normal');
  renderTaskGroup('meme', 'tasks-meme', 'count-meme');
}

// =========================================================
//  ВІДКРИТТЯ МІНІ-ГРИ
// =========================================================
function openMinigame(task) {
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

  const gameId = task.game_id;
  const threshold = task.threshold;

  // Скинути універсальний стан
  currentGame.gameId = gameId;
  currentGame.taskId = task.id;
  currentGame.threshold = threshold;
  currentGame.score = 0;
  currentGame.moves = 0;
  currentGame.startTime = Math.floor(Date.now() / 1000);
  currentGame.finished = false;
  currentGame.active = true;

  // Відкрити відповідну гру
  switch (gameId) {
    case '2048':
      open2048(task.id, threshold);
      break;
    case 'reaction':
      openReaction(task.id, threshold);
      break;
    case 'memory':
      openMemory(task.id, threshold);
      break;
    case 'snake':
      openSnake(task.id, threshold);
      break;
    // case 'puzzle':   openPuzzle(task.id, threshold);   break;
    case 'sudoku':
      openSudoku(task.id, threshold);
      break;
    case 'jump':
      openJump(task.id, threshold);
      break;  
    default:
      showToast('🎮 Ця гра ще в розробці', 'error');
  }
}

// =========================================================
//  НАГОРОДА ЗА ГРУ (універсальна)
// =========================================================
async function claimMinigameReward() {
  if (!currentGame.taskId || !currentGame.gameId) return;

  const claimBtn = document.getElementById('minigame-claim');
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.textContent = '⏳ Перевіряємо...';
  }

  const elapsed = Math.floor(Date.now() / 1000) - currentGame.startTime;

  try {
    const data = await api("/api/minigame/finish", {
      method: "POST",
      body: JSON.stringify({
        game_id: currentGame.gameId,
        score: currentGame.score,
        moves: currentGame.moves,
        time: elapsed,
      }),
    });

    // Нагороду видано
    if (data.success) {
      applyServerPlayer(data.player);
      state.power = data.power || state.power;
      state.defense = data.defense || state.defense;

      currentGame.finished = true;

      if (claimBtn) {
        claimBtn.textContent = '✅ Забрано';
        claimBtn.disabled = true;
      }

      render();
      pulseEl('coin-circle');

      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

      closeMinigame();
      showStickerModal(data.sticker, data.reward, data.is_crit, data.leveled_up, data.player.rank);
      return;
    }

    // Кулдаун
    if (data.reason === 'cooldown') {
      const left = data.cooldown_until - Math.floor(Date.now() / 1000);
      const statusEl = document.getElementById('minigame-status');
      if (statusEl) {
        statusEl.textContent = `⏱ Нагорода буде через ${formatTime(left)}. Можеш грати далі!`;
        statusEl.className = 'minigame-status fail';
      }
      if (claimBtn) {
        claimBtn.textContent = '🎁 Забрати нагороду';
        claimBtn.disabled = true;
      }
      showToast(`⏱ Нагорода через ${formatTime(left)}`, 'error');
      return;
    }

    // Нижче порогу або чит
    if (claimBtn) {
      claimBtn.textContent = '🎁 Забрати нагороду';
      claimBtn.disabled = false;
    }
    showToast('❌ ' + (data.message || 'Не вийшло'), 'error');

  } catch (e) {
    if (claimBtn) {
      claimBtn.textContent = '🎁 Забрати нагороду';
      claimBtn.disabled = false;
    }
    showToast("❌ " + e.message, 'error');
  }
}

// =========================================================
//  УНІВЕРСАЛЬНЕ ЗАКРИТТЯ МІНІ-ГРИ
// =========================================================
function closeMinigame() {
  currentGame.active = false;
  document.getElementById('minigame-overlay').classList.add('hidden');

  // Cleanup для конкретної гри
  if (currentGame.gameId === '2048' && typeof cleanup2048 === 'function') {
    cleanup2048();
  }
  if (currentGame.gameId === 'reaction' && typeof cleanupReaction === 'function') {
    cleanupReaction();
  }
  if (currentGame.gameId === 'memory' && typeof cleanupMemory === 'function') {
    cleanupMemory();
  }
    if (currentGame.gameId === 'snake' && typeof cleanupSnake === 'function') {
    cleanupSnake();
  }
    if (currentGame.gameId === 'sudoku' && typeof cleanupSudoku === 'function') {
    cleanupSudoku();
  }
    if (currentGame.gameId === 'jump' && typeof cleanupJump === 'function') {
    cleanupJump();
  }
}

// =========================================================
//  ХЕЛПЕРИ ДЛЯ ГРИ
// =========================================================
function updateMinigameHeader(title, threshold) {
  const titleEl = document.getElementById('minigame-title');
  const thresholdEl = document.getElementById('minigame-threshold');
  const scoreEl = document.getElementById('minigame-score');
  const movesEl = document.getElementById('minigame-moves');

  if (titleEl) titleEl.textContent = title;
  if (thresholdEl) thresholdEl.textContent = threshold;
  if (scoreEl) scoreEl.textContent = '0';
  if (movesEl) movesEl.textContent = '0';
}

function updateMinigameInfo(score, moves) {
  const scoreEl = document.getElementById('minigame-score');
  const movesEl = document.getElementById('minigame-moves');
  if (scoreEl) scoreEl.textContent = score;
  if (movesEl) movesEl.textContent = moves;
}

function setMinigameStatus(text, modifier = '') {
  const statusEl = document.getElementById('minigame-status');
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = 'minigame-status' + (modifier ? ' ' + modifier : '');
}

function setClaimButtonState(enabled, text) {
  const claimBtn = document.getElementById('minigame-claim');
  if (!claimBtn) return;
  claimBtn.disabled = !enabled;
  claimBtn.textContent = text || '🎁 Забрати нагороду';
}

// =========================================================
//  СТІКЕР (після перемоги)
// =========================================================
function showStickerModal(sticker, reward, isCrit, leveledUp, newRank) {
  if (!sticker) {
    if (leveledUp) showToast(`🎉 Нове звання: ${newRank}!`);
    else if (isCrit) showToast(`🍀 Оце вдача! +${reward} Е (×3)`, 'crit');
    else showToast(`+${reward} Е`);
    return;
  }

  const overlay = document.getElementById('sticker-overlay');
  const img = document.getElementById('sticker-img');
  const rewardEl = document.getElementById('sticker-reward');
  const subtitle = document.getElementById('sticker-subtitle');

  img.src = 'assets/stickers/' + sticker;

  if (isCrit) {
    rewardEl.textContent = `🍀 Оце вдача! +${reward} Е`;
    rewardEl.className = 'sticker-reward crit';
    subtitle.textContent = '×3 нагорода! Пощастило!';
  } else if (leveledUp) {
    rewardEl.textContent = `+${reward} Е`;
    rewardEl.className = 'sticker-reward';
    subtitle.textContent = `🎖 Нове звання: ${newRank}`;
  } else {
    rewardEl.textContent = `+${reward} Е`;
    rewardEl.className = 'sticker-reward';
    subtitle.textContent = 'Завдання виконано';
  }

  overlay.classList.remove('hidden');
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initTasks() {
  // Стікер — закрити
  const closeBtn = document.getElementById('sticker-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('sticker-overlay').classList.add('hidden');
    });
  }

  // Гра — закрити
  const mgClose = document.getElementById('minigame-close');
  if (mgClose) {
    mgClose.addEventListener('click', closeMinigame);
  }

  // Гра — заново
  const mgRestart = document.getElementById('minigame-restart');
  if (mgRestart) {
    mgRestart.addEventListener('click', () => {
      if (currentGame.gameId === '2048') {
        currentGame.finished = false;
        currentGame.score = 0;
        currentGame.moves = 0;
        currentGame.startTime = Math.floor(Date.now() / 1000);
        setClaimButtonState(false);
        restart2048();
      }
      if (currentGame.gameId === 'reaction') {
        currentGame.finished = false;
        currentGame.score = 0;
        currentGame.moves = 0;
        currentGame.startTime = Math.floor(Date.now() / 1000);
        setClaimButtonState(false);
        restartReaction();
      }
      if (currentGame.gameId === 'memory') {
        currentGame.finished = false;
        currentGame.score = 0;
        currentGame.moves = 0;
        currentGame.startTime = Math.floor(Date.now() / 1000);
        setClaimButtonState(false);
        restartMemory();
      }
      if (currentGame.gameId === 'snake') {
        currentGame.finished = false;
        currentGame.score = 0;
        currentGame.moves = 0;
        currentGame.startTime = Math.floor(Date.now() / 1000);
        setClaimButtonState(false);
        restartSnake();
      }
      if (currentGame.gameId === 'sudoku') {
        currentGame.finished = false;
        currentGame.score = 0;
        currentGame.moves = 0;
        currentGame.startTime = Math.floor(Date.now() / 1000);
        setClaimButtonState(false);
        restartSudoku();
      }
      if (currentGame.gameId === 'jump') {
        currentGame.finished = false;
        currentGame.score = 0;
        currentGame.moves = 0;
        currentGame.startTime = Math.floor(Date.now() / 1000);
        setClaimButtonState(false);
        restartJump();
      }
    });
  }

  // Гра — забрати нагороду
  const mgClaim = document.getElementById('minigame-claim');
  if (mgClaim) {
    mgClaim.addEventListener('click', claimMinigameReward);
  }
}

// =========================================================
//  ТОП ГРАВЦІВ МІНІ-ГРИ
// =========================================================
async function openMinigameTop() {
  const gameId = currentGame.gameId;
  if (!gameId) return;

  const overlay = document.getElementById('mg-top-overlay');
  const body = document.getElementById('mg-top-body');
  const title = document.getElementById('mg-top-title');

  if (!overlay || !body) return;

  // Заголовок
  const gameNames = {
    '2048':     '🧩 2048',
    'memory':   '🧠 Memory',
    'reaction': '⚡ Реакція',
    'snake':    '🐍 Змійка',
    'sudoku':   '🔲 Судоку',
    'jump':     '🦘 Стрибун',
  };
  if (title) title.textContent = '🏆 ' + (gameNames[gameId] || gameId);

  // Loading
  body.innerHTML = '<div class="mg-top-loading">Завантаження...</div>';
  overlay.classList.remove('hidden');

  try {
    const data = await api("/api/minigame/top?game_id=" + encodeURIComponent(gameId));
    const top = data.top || [];

    if (top.length === 0) {
      body.innerHTML = '<div class="mg-top-empty">🏆 Топ ще порожній<br>Стань першим!</div>';
      return;
    }

    // Отримуємо свій user_id
    const myId = tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

    body.innerHTML = '';
    top.forEach(row => {
      const div = document.createElement('div');
      div.className = 'mg-top-row';
      if (row.place <= 3) div.classList.add('place-' + row.place);
      if (myId && row.user_id === myId) div.classList.add('me');

      const medal = row.place === 1 ? '🥇' : row.place === 2 ? '🥈' : row.place === 3 ? '🥉' : row.place;

      div.innerHTML = `
        <div class="mg-top-place">${medal}</div>
        <div class="mg-top-info">
          <div class="mg-top-callsign">${escapeHtml(row.callsign)}</div>
          <div class="mg-top-rank">${escapeHtml(row.rank)}</div>
          <div class="mg-top-played">🎮 ${row.total_plays} ігор</div>
        </div>
        <div class="mg-top-score">
          ${row.best_score}
          <div class="mg-top-score-label">очок</div>
        </div>
      `;

      // Клік — публічний профіль
      div.addEventListener('click', () => {
        closeMinigameTop();
        openPublicProfile(row.user_id);
      });

      body.appendChild(div);
    });
  } catch (e) {
    body.innerHTML = `<div class="mg-top-empty">❌ ${escapeHtml(e.message)}</div>`;
  }
}

function closeMinigameTop() {
  const overlay = document.getElementById('mg-top-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function initMinigameTop() {
  const btn = document.getElementById('minigame-top-btn');
  if (btn) {
    btn.addEventListener('click', openMinigameTop);
  }

  const closeBtn = document.getElementById('mg-top-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMinigameTop);
  }

  const overlay = document.getElementById('mg-top-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'mg-top-overlay') closeMinigameTop();
    });
  }
}
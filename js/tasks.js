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

  if (gameId === '2048') {
    open2048(task.id, threshold);
    return;
  }

  // Інші ігри ще не готові
  showToast('🎮 Ця гра ще в розробці', 'error');
}

// =========================================================
//  НАГОРОДА ЗА ГРУ
// =========================================================
async function claimMinigameReward() {
  if (!g2048.taskId) return;

  const claimBtn = document.getElementById('minigame-claim');
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.textContent = '⏳ Перевіряємо...';
  }

  const elapsed = Math.floor(Date.now() / 1000) - g2048.startTime;

  try {
    const data = await api("/api/minigame/finish", {
      method: "POST",
      body: JSON.stringify({
        game_id: g2048.gameId,
        score: g2048.score,
        moves: g2048.moves,
        time: elapsed,
      }),
    });

    // =================================================
    //  Варіант 1: Нагороду видано
    // =================================================
    if (data.success) {
      applyServerPlayer(data.player);
      state.power = data.power || state.power;
      state.defense = data.defense || state.defense;

      g2048.finished = true;

      if (claimBtn) {
        claimBtn.textContent = '✅ Забрано';
        claimBtn.disabled = true;
      }

      render();
      pulseEl('coin-circle');

      if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

      // Закрити гру і показати стикер
      close2048();
      showStickerModal(data.sticker, data.reward, data.is_crit, data.leveled_up, data.player.rank);
      return;
    }

    // =================================================
    //  Варіант 2: Кулдаун
    // =================================================
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

    // =================================================
    //  Варіант 3: Нижче порогу або чит
    // =================================================
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
  // Кнопка закриття стікера
  const closeBtn = document.getElementById('sticker-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('sticker-overlay').classList.add('hidden');
    });
  }

  // Кнопки міні-гри
  const mgClose = document.getElementById('minigame-close');
  if (mgClose) {
    mgClose.addEventListener('click', () => {
      close2048();
    });
  }

  const mgRestart = document.getElementById('minigame-restart');
  if (mgRestart) {
    mgRestart.addEventListener('click', () => {
      if (g2048.taskId) {
        g2048.finished = false;
        const claimBtn = document.getElementById('minigame-claim');
        if (claimBtn) {
          claimBtn.disabled = true;
          claimBtn.textContent = '🎁 Забрати нагороду';
        }
        init2048();
      }
    });
  }

  const mgClaim = document.getElementById('minigame-claim');
  if (mgClaim) {
    mgClaim.addEventListener('click', claimMinigameReward);
  }
}
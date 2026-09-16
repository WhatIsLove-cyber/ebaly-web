// =========================================================
//  ЗАВДАННЯ
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
      ` : `<div class="task-desc available">✓ Доступно</div>`}
    `;

    if (!onCooldown) {
      div.addEventListener('click', () => completeTask(task, div));
    } else {
      div.addEventListener('click', () => showStickerPreview(task, remaining));
    }

    container.appendChild(div);
  });
}

function renderTasks() {
  renderTaskGroup('normal', 'tasks-normal', 'count-normal');
  renderTaskGroup('meme', 'tasks-meme', 'count-meme');
}

// =========================================================
//  ВИКОНАННЯ ЗАВДАННЯ
// =========================================================
async function completeTask(task, el) {
  if (getCooldownRemaining(task) > 0) return;
  el.classList.add('loading');

  try {
    const data = await api("/api/complete", {
      method: "POST",
      body: JSON.stringify({ task_id: task.id }),
    });

    if (!data) {
      el.classList.remove('loading');
      showToast("❌ Порожня відповідь", 'error');
      return;
    }

    applyServerPlayer(data.player);
    state.power = data.power || state.power;
    state.defense = data.defense || state.defense;

    render();

    pulseEl('coin-circle');
    if (task.stat === 'strength')   pulseEl('stat-power');
    if (task.stat === 'discipline') pulseEl('stat-defense');

    showStickerModal(data.sticker, data.reward, data.is_crit, data.leveled_up, data.player.rank);

    if (tg.HapticFeedback) {
      if (data.is_crit) tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.impactOccurred('light');
    }
  } catch (e) {
    el.classList.remove('loading');
    showToast("❌ " + e.message, 'error');
  }
}

// =========================================================
//  МОДАЛКА СТІКЕРА (після завдання)
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

function showStickerPreview(task, secondsLeft) {
  const sticker = task.stickers ? task.stickers[0] : null;
  if (!sticker) return;

  const overlay = document.getElementById('sticker-overlay');
  const img = document.getElementById('sticker-img');
  const rewardEl = document.getElementById('sticker-reward');
  const subtitle = document.getElementById('sticker-subtitle');

  img.src = 'assets/stickers/' + sticker;
  rewardEl.textContent = '⏱ ' + formatTime(secondsLeft);
  rewardEl.className = 'sticker-reward';
  subtitle.textContent = 'Завдання ще на кулдауні';

  overlay.classList.remove('hidden');
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initTasks() {
  const closeBtn = document.getElementById('sticker-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('sticker-overlay').classList.add('hidden');
    });
  }
}
// =========================================================
//  MAIN — ініціалізація, навігація, startGame
// =========================================================

// =========================================================
//  RENDER (головна функція оновлення UI)
// =========================================================
function render() {
  document.getElementById('value-level').textContent = state.level;
  document.getElementById('value-e').textContent = state.e;
  document.getElementById('value-power').textContent = state.power;
  document.getElementById('value-defense').textContent = state.defense;
  document.getElementById('rank-line').textContent = getRank(state.level);

  const callsign = state.callsign || 'Боєць';
  document.getElementById('callsign-title').textContent = callsign;

  // Завдання
  renderTasks();

  // Інвентар (якщо відкритий)
  if (currentTab === 'inventory') renderInventory();

  // Сундуки (якщо відкриті)
  if (currentTab === 'chests') renderChestsTab();
}

// =========================================================
//  НАВІГАЦІЯ (перемикання вкладок)
// =========================================================
function switchTab(tab) {
  currentTab = tab;

  ['home', 'tasks', 'inventory', 'chests', 'craft'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Шторка тільки на головній
  const curtain = document.getElementById('stats-curtain');
  if (tab === 'home') {
    curtain.classList.remove('hidden');
  } else {
    curtain.classList.add('hidden');
  }

  const content = document.getElementById('content');
  if (tab === 'home') {
    content.classList.add('no-scroll');
  } else {
    content.classList.remove('no-scroll');
    content.scrollTop = 0;
  }

  // Підвантаження даних для вкладок
  if (tab === 'inventory') {
    loadInventory().then(render);
  }
  if (tab === 'chests') {
    renderChestsTab();
  }
  if (tab === 'craft') {
    loadCraft();
  }
}

// =========================================================
//  PRELOAD
// =========================================================
function preloadStickers() {
  const allStickers = [];
  TASKS.forEach(task => {
    if (task.stickers) allStickers.push(...task.stickers);
  });
  allStickers.forEach(name => {
    const img = new Image();
    img.src = 'assets/stickers/' + name;
  });
}

function preloadChests() {
  Object.values(CHESTS_DATA).forEach(c => {
    const img = new Image();
    img.src = c.img;
  });
}

// =========================================================
//  START GAME (головна точка входу)
// =========================================================
async function startGame() {
  try {
    const data = await api("/api/sync", { method: "POST" });
    applyServerPlayer(data.player);
    state.power = data.power || 0;
    state.defense = data.defense || 0;
    equipped = data.equipped || {};

    // Якщо персонаж ще не створений — показати створення
    if (!data.player.is_created) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('creation-overlay').classList.remove('hidden');
      return;
    }

    // Показати гру
    document.getElementById('app').classList.remove('hidden');

    // Показати кнопку стрічки
    const fab = document.getElementById('chat-fab');
    if (fab) fab.classList.remove('hidden');

    render();

    if (state.is_admin) {
      document.getElementById('admin-block').classList.remove('hidden');
    }

    document.getElementById('loading').classList.add('hidden');

    // Перевірити щоденну нагороду
    checkDailyReward();
  } catch (e) {
    document.getElementById('loading').innerHTML = '❌ ' + e.message;
  }
}

// =========================================================
//  ТАЙМЕР КУЛДАУНІВ (кожну секунду оновлює таймери завдань)
// =========================================================
function startCooldownTimer() {
  setInterval(() => {
    if (currentTab !== 'tasks') return;

    let needRerender = false;

    TASKS.forEach(task => {
      const el = document.querySelector(`[data-timer="${task.id}"]`);
      const remaining = getCooldownRemaining(task);

      if (el && remaining > 0) {
        el.textContent = `⏱ ${formatTime(remaining)}`;
        const fill = el.parentElement.querySelector('.task-progress-fill');
        if (fill) {
          const pct = Math.floor((1 - remaining / task.cooldown) * 100);
          fill.style.width = pct + '%';
        }
      } else if (el && remaining === 0) {
        needRerender = true;
      }
    });

    if (needRerender) render();
  }, 1000);
}

// =========================================================
//  BOOTSTRAP — точка входу
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  // Навігація (bottom-nav)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Ініціалізація всіх модулів
  initCreation();
  initTasks();
  initInventory();
  initChests();
  initDaily();
  initProfile();
  initAdmin();
  initFeed();
  initPublicProfile();

  // Прелоади
  preloadStickers();
  preloadChests();

  // Таймер кулдаунів
  startCooldownTimer();

  // Старт
  startGame();
});
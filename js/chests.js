// =========================================================
//  СУНДУКИ — вкладка
// =========================================================
function renderChestsTab() {
  const balanceEl = document.getElementById('chest-balance');
  if (balanceEl) balanceEl.textContent = state.e + ' Е';

  const el = document.getElementById('chests-container');
  if (!el) return;
  el.innerHTML = '';

  const order = ['common', 'improved', 'elite', 'royal'];
  order.forEach(chestId => {
    const c = CHESTS_DATA[chestId];
    const div = document.createElement('div');
    div.className = 'chest-card ' + c.rarity_class;
    div.innerHTML = `
      <img class="chest-card-img" src="${c.img}" alt="${c.name}">
      <div class="chest-card-name">${c.name}</div>
      <div class="chest-card-price">${c.price} Е</div>
    `;
    div.addEventListener('click', () => openChestModal(c));
    el.appendChild(div);
  });
}

// =========================================================
//  МОДАЛКА ВИБОРУ СУНДУКА
// =========================================================
function openChestModal(chest) {
  currentChest = chest;
  const canAfford = state.e >= chest.price;

  const modalEl = document.getElementById('chest-modal');
  modalEl.className = 'chest-modal ' + chest.rarity_class;

  document.getElementById('chest-modal-img').src = chest.img;
  document.getElementById('chest-modal-title').textContent = chest.name;
  document.getElementById('chest-modal-balance').textContent = `💰 У тебе: ${state.e} Е`;

  const chancesEl = document.getElementById('chest-modal-chances');
  chancesEl.innerHTML = '';

  const rarityEmoji = { common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟠' };
  ['common', 'uncommon', 'rare', 'epic', 'legendary'].forEach(rarity => {
    const chance = chest.chances[rarity];
    if (chance > 0) {
      const span = document.createElement('span');
      span.className = 'chance-item';
      span.textContent = `${rarityEmoji[rarity]} ${(chance * 100).toFixed(1)}%`;
      chancesEl.appendChild(span);
    }
  });

  const openBtn = document.getElementById('chest-open-btn');
  openBtn.textContent = canAfford ? `Відкрити за ${chest.price} Е` : `Недостатньо Е`;
  openBtn.disabled = !canAfford;

  document.getElementById('chest-modal-overlay').classList.remove('hidden');
}

// =========================================================
//  РУЛЕТКА
// =========================================================
function runRoulette(chest, wonItem) {
  return new Promise((resolve) => {
    if (rouletteRunning) return resolve();
    rouletteRunning = true;

    const overlay = document.getElementById('roulette-overlay');
    const strip = document.getElementById('roulette-strip');
    const title = document.getElementById('roulette-title');
    const hint = document.getElementById('roulette-hint');

    title.textContent = chest.name;
    hint.textContent = 'Крутимо...';

    const WIN_INDEX = 42;
    const totalItems = 50;

    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0px)';
    strip.innerHTML = '';

    for (let i = 0; i < totalItems; i++) {
      const itemEl = document.createElement('div');
      itemEl.className = 'roulette-item';
      if (i === WIN_INDEX) {
        itemEl.textContent = wonItem.emoji || '📦';
      } else {
        itemEl.textContent = ALL_ITEM_EMOJIS[Math.floor(Math.random() * ALL_ITEM_EMOJIS.length)];
      }
      strip.appendChild(itemEl);
    }

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    const windowWidth = document.querySelector('.roulette-window').offsetWidth;
    const itemWidth = 100;
    const centerOffset = windowWidth / 2 - itemWidth / 2;
    const finalOffset = -(WIN_INDEX * itemWidth - centerOffset);

    setTimeout(() => {
      strip.style.transition = 'transform 3s cubic-bezier(0.15, 0.85, 0.35, 1)';
      strip.style.transform = `translateX(${finalOffset}px)`;
    }, 50);

    overlay.classList.remove('hidden');

    setTimeout(() => {
      const flash = document.getElementById('roulette-flash');
      flash.classList.remove('show');
      void flash.offsetWidth;
      flash.classList.add('show');

      if (tg.HapticFeedback) {
        if (wonItem.rarity === 'legendary' || wonItem.rarity === 'epic') {
          tg.HapticFeedback.notificationOccurred('success');
        } else {
          tg.HapticFeedback.impactOccurred('medium');
        }
      }

      hint.textContent = 'Готово!';

      setTimeout(() => {
        overlay.classList.add('hidden');
        rouletteRunning = false;
        resolve();
      }, 800);
    }, 3100);
  });
}

// =========================================================
//  LOOT OVERLAY (показ предмета)
// =========================================================
function showLootOverlay(item) {
  document.getElementById('loot-emoji').textContent = item.emoji;
  document.getElementById('loot-name').textContent = item.name;

  const rarityEl = document.getElementById('loot-rarity');
  rarityEl.textContent = rarityLabel(item.rarity);
  rarityEl.className = 'chest-loot-rarity rarity-text-' + item.rarity;

  document.getElementById('loot-power').textContent = `+${item.power} до характеристики`;
  document.getElementById('chest-loot').className = 'chest-loot rarity-' + item.rarity;

  document.getElementById('chest-overlay').classList.remove('hidden');
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initChests() {
  // Закрити модалку вибору сундука
  const closeModalBtn = document.getElementById('chest-close-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      currentChest = null;
      document.getElementById('chest-modal-overlay').classList.add('hidden');
    });
  }

  // Відкрити сундук
  const openBtn = document.getElementById('chest-open-btn');
  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      if (!currentChest) return;
      const chest = currentChest;
      currentChest = null;
      document.getElementById('chest-modal-overlay').classList.add('hidden');

      try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

        const data = await api("/api/open_chest", {
          method: "POST",
          body: JSON.stringify({ chest_id: chest.chest_id }),
        });

        applyServerPlayer(data.player);
        state.power = data.power || state.power;
        state.defense = data.defense || state.defense;

        await runRoulette(chest, data.item);
        render();
        pulseEl('coin-circle');
        showLootOverlay(data.item);
      } catch (e) {
        showToast("❌ " + e.message, 'error');
      }
    });
  }

  // Закрити loot overlay
  const lootClose = document.getElementById('loot-close');
  if (lootClose) {
    lootClose.addEventListener('click', () => {
      document.getElementById('chest-overlay').classList.add('hidden');
    });
  }
}
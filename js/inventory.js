// =========================================================
//  ІНВЕНТАР
// =========================================================

function renderInventory() {
  // Stats box
  const powerEl = document.getElementById('inventory-power');
  const defenseEl = document.getElementById('inventory-defense');
  if (powerEl) powerEl.textContent = state.power;
  if (defenseEl) defenseEl.textContent = state.defense;

  // Слоти (вдягнуте)
  const slotsEl = document.getElementById('slots-container');
  if (slotsEl) {
    slotsEl.innerHTML = '';
    SLOTS.forEach(slot => {
      const item = equipped[slot];
      const div = document.createElement('div');
      div.className = 'slot' + (item ? ' rarity-' + item.rarity : ' empty');

      if (item) {
        const isPowerSlot = SLOTS_POWER.includes(slot);
        const statLabel = isPowerSlot ? `⚡ +${item.power}` : `🛡 +${item.power}`;
        const statColor = isPowerSlot ? '#f5a623' : '#6ba8ff';
        div.innerHTML = `
          <div class="slot-label">${SLOT_NAMES[slot]}</div>
          <div class="slot-emoji">${item.emoji}</div>
          <div class="slot-name">${item.name}</div>
          <div class="slot-power" style="color:${statColor}">${statLabel}</div>
        `;
        div.addEventListener('click', () => unequip(slot));
      } else {
        div.innerHTML = `
          <div class="slot-label">${SLOT_NAMES[slot]}</div>
          <div class="slot-emoji">➕</div>
          <div class="slot-name">Порожньо</div>
        `;
      }
      slotsEl.appendChild(div);
    });
  }

  // Інвентар (grid предметів)
  const invEl = document.getElementById('inventory-container');
  if (invEl) {
    invEl.innerHTML = '';
    const countEl = document.getElementById('inv-count');
    if (countEl) countEl.textContent = inventory.length;

    // Сортування
    const sortedInventory = [...inventory].sort((a, b) => {
      if (inventorySort === 'rarity') {
        const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        const diff = (order[a.rarity] ?? 99) - (order[b.rarity] ?? 99);
        if (diff !== 0) return diff;
        return b.inv_id - a.inv_id;
      }
      return b.inv_id - a.inv_id;
    });

    sortedInventory.forEach(item => {
      const div = document.createElement('div');
      div.className = 'inv-item rarity-' + item.rarity + (item.equipped ? ' equipped' : '');
      const isPower = SLOTS_POWER.includes(item.slot);
      const statColor = isPower ? '#f5a623' : '#6ba8ff';

      div.innerHTML = `
        ${item.equipped ? '<div class="inv-badge">✓</div>' : ''}
        <div class="inv-emoji">${item.emoji}</div>
        <div class="inv-name">${item.name}</div>
        <div class="inv-power" style="color:${statColor}">+${item.power}</div>
        <div class="inv-sell">💰 ${item.sell_price}</div>
      `;
      div.addEventListener('click', () => openItemModal(item));
      invEl.appendChild(div);
    });
  }
}

// =========================================================
//  ЗАВАНТАЖЕННЯ ІНВЕНТАРЮ З СЕРВЕРА
// =========================================================
async function loadInventory() {
  try {
    const data = await api("/api/inventory");
    inventory = data.inventory;
    equipped = data.equipped;
    state.power = data.power || 0;
    state.defense = data.defense || 0;
  } catch (e) {
    console.warn("loadInventory error:", e);
  }
}

// =========================================================
//  EQUIP / UNEQUIP
// =========================================================
async function equip(invId) {
  try {
    const data = await api("/api/equip", {
      method: "POST",
      body: JSON.stringify({ inv_id: invId }),
    });
    equipped = data.equipped;
    state.power = data.power;
    state.defense = data.defense;

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    await loadInventory();
    render();
    pulseEl('stat-power');
    pulseEl('stat-defense');
    showToast('✅ Одягнуто');
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  }
}

async function unequip(slot) {
  try {
    const data = await api("/api/unequip", {
      method: "POST",
      body: JSON.stringify({ slot }),
    });
    equipped = data.equipped;
    state.power = data.power;
    state.defense = data.defense;

    await loadInventory();
    render();
    pulseEl('stat-power');
    pulseEl('stat-defense');
    showToast('Знято');
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  }
}

// =========================================================
//  МОДАЛКА ПРЕДМЕТА
// =========================================================
function openItemModal(item) {
  itemTarget = item;

  document.getElementById('item-emoji').textContent = item.emoji;
  document.getElementById('item-name').textContent = item.name;

  const rarityEl = document.getElementById('item-rarity');
  rarityEl.textContent = rarityLabel(item.rarity);
  rarityEl.className = 'item-rarity rarity-text-' + item.rarity;

  const isPower = SLOTS_POWER.includes(item.slot);
  const statEl = document.getElementById('item-stat');
  if (isPower) {
    statEl.textContent = `⚡ +${item.power} до потужності`;
    statEl.className = 'item-stat power';
  } else {
    statEl.textContent = `🛡 +${item.power} до незламності`;
    statEl.className = 'item-stat defense';
  }

  document.getElementById('item-sell-price').textContent = `💰 ${item.sell_price} Е`;

  const equipBtn = document.getElementById('item-equip');
  const sellBtn = document.getElementById('item-sell');
  const modalEl = document.getElementById('item-modal');

  modalEl.className = 'item-modal rarity-' + item.rarity;

  if (item.equipped) {
    equipBtn.textContent = '👕 Зняти';
    equipBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ff5252)';
    sellBtn.disabled = true;
    sellBtn.style.opacity = '0.4';
    sellBtn.style.cursor = 'not-allowed';
  } else {
    equipBtn.textContent = '👕 Одягнути';
    equipBtn.style.background = 'linear-gradient(135deg, #4caf50, #66bb6a)';
    sellBtn.disabled = false;
    sellBtn.style.opacity = '1';
    sellBtn.style.cursor = 'pointer';
  }

  document.getElementById('item-overlay').classList.remove('hidden');
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initInventory() {
  // Закрити модалку предмета
  const closeBtn = document.getElementById('item-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      itemTarget = null;
      document.getElementById('item-overlay').classList.add('hidden');
    });
  }

  // Кнопка Одягнути / Зняти
  const equipBtn = document.getElementById('item-equip');
  if (equipBtn) {
    equipBtn.addEventListener('click', async () => {
      if (!itemTarget) return;
      const item = itemTarget;
      itemTarget = null;
      document.getElementById('item-overlay').classList.add('hidden');

      if (item.equipped) {
        for (const [slot, equippedItem] of Object.entries(equipped)) {
          if (equippedItem && equippedItem.inv_id === item.inv_id) {
            await unequip(slot);
            return;
          }
        }
      } else {
        await equip(item.inv_id);
      }
    });
  }

  // Кнопка Продати
  const sellBtn = document.getElementById('item-sell');
  if (sellBtn) {
    sellBtn.addEventListener('click', async () => {
      if (!itemTarget) return;
      const item = itemTarget;
      itemTarget = null;
      document.getElementById('item-overlay').classList.add('hidden');

      try {
        const data = await api("/api/sell", {
          method: "POST",
          body: JSON.stringify({ inv_id: item.inv_id }),
        });
        applyServerPlayer(data.player);
        state.power = data.power;
        state.defense = data.defense;

        await loadInventory();
        render();
        pulseEl('coin-circle');
        showToast(`💰 Продано: ${item.name} (+${data.sold_price} Е)`, 'success');
      } catch (e) {
        showToast("❌ " + e.message, 'error');
      }
    });
  }

  // Сортування (ВСЕРЕДИНІ initInventory!)
  document.querySelectorAll('.inv-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.inv-sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      inventorySort = btn.dataset.sort;
      renderInventory();
    });
  });
}
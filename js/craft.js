// =========================================================
//  КРАФТ
// =========================================================

async function loadCraft() {
  try {
    const data = await api("/api/craft/info");
    const el = document.getElementById('craft-container');
    if (!el) return;
    el.innerHTML = '';

    data.recipes.forEach(r => {
      const div = document.createElement('div');
      div.className = 'craft-card';

      const targetLabel = rarityLabel(r.target_rarity);
      const fromLabel = rarityLabel(r.from_rarity);
      const locked = r.locked_by_level;

      div.innerHTML = `
        <div class="craft-info">
          <div class="craft-title">${fromLabel} × ${r.from_count} → 1 × ${targetLabel}</div>
          <div class="craft-detail">У тебе: ${r.have} / ${r.from_count}${locked ? ' 🔒 (з рівня ' + data.min_level + ')' : ''}</div>
        </div>
        <button class="craft-btn" ${r.can_craft ? '' : 'disabled'}>Крафт</button>
      `;

      if (r.can_craft) {
        div.querySelector('.craft-btn').addEventListener('click', () => doCraft(r.target_rarity));
      }

      el.appendChild(div);
    });
  } catch (e) {
    console.warn("loadCraft error:", e);
  }
}

async function doCraft(targetRarity) {
  try {
    const data = await api("/api/craft", {
      method: "POST",
      body: JSON.stringify({ target_rarity: targetRarity }),
    });

    state.power = data.power;
    state.defense = data.defense;

    showLootOverlay(data.item);

    await loadInventory();
    await loadCraft();
    render();
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  }
}
// =========================================================
//  АДМІН-ПАНЕЛЬ
// =========================================================

async function adminGrant(payload) {
  try {
    const data = await api("/api/admin/grant", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    applyServerPlayer(data.player);
    state.power = data.power;
    state.defense = data.defense;

    await loadInventory();
    render();
    showToast('✅ Виконано', 'success');
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  }
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initAdmin() {
  const btnE = document.getElementById('admin-e');
  if (btnE) {
    btnE.addEventListener('click', () => adminGrant({ e: 10000 }));
  }

  const btnItems = document.getElementById('admin-items');
  if (btnItems) {
    btnItems.addEventListener('click', () => {
      if (confirm('Видати всі 30 предметів?')) {
        adminGrant({ grant_all_items: true });
      }
    });
  }

  const btnCooldowns = document.getElementById('admin-cooldowns');
  if (btnCooldowns) {
    btnCooldowns.addEventListener('click', () => adminGrant({ reset_cooldowns: true }));
  }

  const btnDaily = document.getElementById('admin-daily');
  if (btnDaily) {
    btnDaily.addEventListener('click', () => adminGrant({ reset_daily: true }));
  }

  // Скинути прогрес
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Скинути весь прогрес? Це також видалить персонажа.')) return;

      try {
        const data = await api("/api/reset", { method: "POST" });
        applyServerPlayer(data.player);
        state.power = 0;
        state.defense = 0;
        equipped = {};
        inventory = [];

        render();
        showToast('Прогрес скинуто');

        setTimeout(() => window.location.reload(), 800);
      } catch (e) {
        showToast("❌ " + e.message, 'error');
      }
    });
  }
}
// =========================================================
//  ЩОДЕННА НАГОРОДА
// =========================================================

async function checkDailyReward() {
  try {
    dailyData = await api("/api/daily/status");
    if (dailyData.can_claim) {
      showDailyModal();
    }
  } catch (e) {
    console.warn("Daily status error:", e);
  }
}

function showDailyModal() {
  if (!dailyData) return;

  const streakEl = document.getElementById('daily-streak');
  if (streakEl) {
    streakEl.innerHTML = '';

    dailyData.rewards.forEach(r => {
      const dayEl = document.createElement('div');
      dayEl.className = 'daily-day';
      if (r.claimed) dayEl.classList.add('claimed');
      if (r.is_today && dailyData.can_claim) dayEl.classList.add('today');
      dayEl.innerHTML = `
        <div class="daily-day-num">День ${r.day}</div>
        <div class="daily-day-reward">${r.label}</div>
      `;
      streakEl.appendChild(dayEl);
    });
  }

  const claimBtn = document.getElementById('daily-claim-btn');
  const closeBtn = document.getElementById('daily-close-btn');

  if (dailyData.can_claim) {
    claimBtn.classList.remove('hidden');
    closeBtn.classList.add('hidden');
  } else {
    claimBtn.classList.add('hidden');
    closeBtn.classList.remove('hidden');
  }

  document.getElementById('daily-overlay').classList.remove('hidden');
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initDaily() {
  // Кнопка Забрати
  const claimBtn = document.getElementById('daily-claim-btn');
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      try {
        const result = await api("/api/daily/claim", { method: "POST" });

        applyServerPlayer(result.player);
        state.power = result.power || state.power;
        state.defense = result.defense || state.defense;

        render();

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        document.getElementById('daily-overlay').classList.add('hidden');

        if (result.type === "chest" && result.item) {
          showLootOverlay(result.item);
        } else {
          showToast(`🎁 День ${result.day}: ${result.label}`, 'success');
        }
      } catch (e) {
        showToast("❌ " + e.message, 'error');
      }
    });
  }

  // Кнопка Закрити
  const closeBtn = document.getElementById('daily-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('daily-overlay').classList.add('hidden');
    });
  }
}
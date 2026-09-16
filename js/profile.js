// =========================================================
//  ВЛАСНИЙ ПРОФІЛЬ (клік на нік)
// =========================================================

async function openProfile() {
  try {
    const data = await api("/api/profile");

    document.getElementById('profile-callsign').textContent = `«${data.callsign || 'Боєць'}»`;
    document.getElementById('profile-rank').textContent = data.rank;
    document.getElementById('profile-level').textContent = data.level;
    document.getElementById('profile-strength').textContent = data.strength;
    document.getElementById('profile-discipline').textContent = data.discipline;
    document.getElementById('profile-power').textContent = data.power;
    document.getElementById('profile-defense').textContent = data.defense;

    const days = data.days_in_service;
    let daysText = `${days} днів`;
    if (days === 1) daysText = '1 день';
    else if (days < 5) daysText = `${days} дні`;
    document.getElementById('profile-days').textContent = daysText;

    document.getElementById('profile-tasks').textContent = data.tasks_completed;
    document.getElementById('profile-chests').textContent = data.chests_opened;
    document.getElementById('profile-items').textContent = data.items_obtained;
    document.getElementById('profile-luck').textContent = data.luck_count;

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    document.getElementById('profile-overlay').classList.remove('hidden');
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  }
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initProfile() {
  // Клік на нік
  const nameBlock = document.getElementById('name-block');
  if (nameBlock) {
    nameBlock.addEventListener('click', () => {
      openProfile();
    });
  }

  // Кнопка Закрити
  const closeBtn = document.getElementById('profile-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('profile-overlay').classList.add('hidden');
    });
  }

  // Клік повз модалку
  const overlay = document.getElementById('profile-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'profile-overlay') {
        overlay.classList.add('hidden');
      }
    });
  }
}
// =========================================================
//  ПУБЛІЧНИЙ ПРОФІЛЬ (клік на автора в стрічці/топі)
// =========================================================

async function openPublicProfile(userId) {
  try {
    const data = await api("/api/player/" + userId);

    document.getElementById('pubprofile-callsign').textContent = `«${data.callsign}»`;
    document.getElementById('pubprofile-rank').textContent = data.rank;
    document.getElementById('pubprofile-level').textContent = data.level;
    document.getElementById('pubprofile-power').textContent = data.power;
    document.getElementById('pubprofile-defense').textContent = data.defense;

    const days = data.days_in_service;
    let dt = `${days} днів`;
    if (days === 1) dt = '1 день';
    else if (days < 5) dt = `${days} дні`;
    document.getElementById('pubprofile-days').textContent = dt;

    document.getElementById('pubprofile-overlay').classList.remove('hidden');

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  }
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initPublicProfile() {
  const closeBtn = document.getElementById('pubprofile-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('pubprofile-overlay').classList.add('hidden');
    });
  }

  const overlay = document.getElementById('pubprofile-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'pubprofile-overlay') {
        overlay.classList.add('hidden');
      }
    });
  }
}
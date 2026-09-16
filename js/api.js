// =========================================================
//  API — обгортка над fetch
// =========================================================

async function api(path, options = {}) {
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Init-Data": INIT_DATA,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Помилка ${res.status}`);
  }
  return res.json();
}

// =========================================================
//  Оновлення глобального state з відповіді сервера
// =========================================================
function applyServerPlayer(player) {
  if (!player) return;
  state.level = player.level;
  state.e = player.e;
  state.strength = player.strength;
  state.discipline = player.discipline;
  state.crit_count = player.crit_count || 0;
  state.cooldowns = player.cooldowns || {};
  state.is_admin = player.is_admin || false;
  state.appearance = player.appearance || {};
  state.callsign = player.callsign || null;
  state.daily_streak = player.daily_streak || 0;
}
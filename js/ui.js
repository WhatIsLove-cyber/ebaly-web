// =========================================================
//  UI — хелпери
// =========================================================

// ============== TOAST ==============
function showToast(text, modifier = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.className = 'toast';
  if (modifier) t.classList.add(modifier);
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ============== PULSE ==============
function pulseEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  setTimeout(() => el.classList.remove('pulse'), 450);
}

// ============== RARITY ==============
function rarityLabel(r) {
  const emoji = { common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟠' }[r] || '⚪';
  const name  = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }[r] || r;
  return emoji + ' ' + name;
}

// ============== RANK ==============
function getRank(level) {
  if (level >= 20) return '🎖 Головний сержант';
  if (level >= 15) return '🎖 Сержант';
  if (level >= 10) return '🎖 Молодший сержант';
  if (level >= 5)  return '🎖 Старший солдат';
  return '🎖 Новобранець';
}

// ============== TIME ==============
function formatTime(sec) {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}г ${m}хв`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${sec}с`;
}

function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return 'щойно';
  if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн тому`;
  const d = new Date(timestamp * 1000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

// ============== ESCAPE HTML ==============
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============== GET COOLDOWN ==============
function getCooldownRemaining(task) {
  const readyAt = state.cooldowns[task.id] || 0;
  const remaining = Math.ceil(readyAt - Date.now() / 1000);
  return remaining > 0 ? remaining : 0;
}
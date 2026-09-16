// =========================================================
//  СТВОРЕННЯ ПЕРСОНАЖА
// =========================================================

function initCreation() {
  // Вибір опцій (стать, шкіра, волосся, очі)
  document.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      const field = opt.dataset.field;
      const value = opt.dataset.value;
      document.querySelectorAll(`.option[data-field="${field}"]`).forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      if (field === 'gender') creation.gender = value;
      if (field === 'skin')   creation.skin = parseInt(value);
      if (field === 'hair')   creation.hair = parseInt(value);
      if (field === 'eyes')   creation.eyes = parseInt(value);

      const genderEl = document.getElementById('preview-gender');
      if (genderEl) {
        genderEl.textContent = creation.gender === 'male' ? 'Чоловік' : 'Жінка';
      }
    });
  });

  // Перевірка позивного
  const callsignInput = document.getElementById('callsign-input');
  const checkBtn = document.getElementById('check-btn');
  const startBtn = document.getElementById('start-btn');

  if (checkBtn) checkBtn.addEventListener('click', checkCallsign);

  if (callsignInput) {
    callsignInput.addEventListener('input', () => {
      creation.callsign_ok = false;
      callsignInput.classList.remove('success', 'error');
      const status = document.getElementById('callsign-status');
      if (status) {
        status.textContent = '';
        status.className = 'callsign-status';
      }
      updateStartButton();
      clearTimeout(callsignCheckTimer);
      callsignCheckTimer = setTimeout(checkCallsign, 700);
    });
  }

  if (startBtn) startBtn.addEventListener('click', submitCreation);
}

async function checkCallsign() {
  const callsignInput = document.getElementById('callsign-input');
  const status = document.getElementById('callsign-status');
  if (!callsignInput || !status) return;

  const value = callsignInput.value.trim();
  status.textContent = '';
  status.className = 'callsign-status';
  callsignInput.classList.remove('success', 'error');
  creation.callsign_ok = false;
  updateStartButton();

  if (!value) {
    status.textContent = 'Введи позивний';
    status.classList.add('error');
    return;
  }

  try {
    const data = await api("/api/check_callsign", {
      method: "POST",
      body: JSON.stringify({ callsign: value }),
    });
    if (data.available) {
      status.textContent = `✅ «${data.callsign}» вільний`;
      status.classList.add('success');
      callsignInput.classList.add('success');
      creation.callsign = data.callsign;
      creation.callsign_ok = true;
    } else {
      status.textContent = `❌ «${data.callsign}» вже зайнятий`;
      status.classList.add('error');
      callsignInput.classList.add('error');
    }
  } catch (e) {
    status.textContent = '❌ ' + e.message;
    status.classList.add('error');
    callsignInput.classList.add('error');
  }
  updateStartButton();
}

function updateStartButton() {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.disabled = !creation.callsign_ok;
}

async function submitCreation() {
  if (!creation.callsign_ok) return;

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = 'Створюємо...';
  }

  try {
    const data = await api("/api/set_appearance", {
      method: "POST",
      body: JSON.stringify({
        callsign: creation.callsign,
        gender: creation.gender,
        skin: creation.skin,
        hair: creation.hair,
        eyes: creation.eyes,
      }),
    });

    applyServerPlayer(data.player);
    state.callsign = data.callsign;

    document.getElementById('creation-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    render();
    if (state.is_admin) document.getElementById('admin-block').classList.remove('hidden');

    showToast('🎖 Ласкаво просимо до служби!', 'success');
  } catch (e) {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = 'Почати службу';
    }
    showToast("❌ " + e.message, 'error');
  }
}
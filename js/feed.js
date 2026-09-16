// =========================================================
//  СТРІЧКА
// =========================================================

function openFeed() {
  document.getElementById('feed-overlay').classList.remove('hidden');
  loadFeed();
}

function closeFeed() {
  document.getElementById('feed-overlay').classList.add('hidden');
}

async function loadFeed() {
  const body = document.getElementById('feed-tab-feed');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">Завантаження...</div>';

  try {
    const data = await api("/api/posts/list");
    feedPosts = data.posts || [];
    renderFeed();
  } catch (e) {
    body.innerHTML = `<div style="text-align:center;color:#ff6b6b;padding:40px;">❌ ${e.message}</div>`;
  }
}

function renderFeed() {
  const body = document.getElementById('feed-tab-feed');
  if (!body) return;
  body.innerHTML = '';

  // Форма створення поста
  const form = document.createElement('div');
  form.className = 'post-create';
  form.innerHTML = `
    <div class="post-create-header">
      <span>📝 Новий допис</span>
      <span class="post-create-counter" id="post-counter">0 / ${POST_MAX_LEN}</span>
    </div>
    <textarea class="post-textarea" id="post-textarea" placeholder="Що сталося на службі?" maxlength="${POST_MAX_LEN}"></textarea>
    <div class="post-create-footer">
      <span class="post-cooldown-hint" id="post-cooldown-hint"></span>
      <button class="post-submit-btn" id="post-submit-btn" disabled>Опублікувати</button>
    </div>
  `;
  body.appendChild(form);

  const textarea = form.querySelector('#post-textarea');
  const counter = form.querySelector('#post-counter');
  const submitBtn = form.querySelector('#post-submit-btn');
  const hint = form.querySelector('#post-cooldown-hint');

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${POST_MAX_LEN}`;
    counter.className = 'post-create-counter' + (len > 250 ? ' danger' : len > 200 ? ' warn' : '');
    submitBtn.disabled = len === 0 || Date.now() < postCooldownUntil;
  });

  submitBtn.addEventListener('click', () => submitPost(textarea.value, submitBtn));
  updatePostCooldownUI(hint, submitBtn);

  // Пости
  if (feedPosts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'top-empty';
    empty.innerHTML = '📭 Тут поки порожньо<br>Стань першим, хто напише!';
    body.appendChild(empty);
  } else {
    feedPosts.forEach(p => body.appendChild(renderPostCard(p)));
  }
}

function renderPostCard(post) {
  const div = document.createElement('div');
  div.className = 'post-card';

  div.innerHTML = `
    <div class="post-head" data-user-id="${post.author.user_id}">
      <div class="post-avatar">🎖</div>
      <div class="post-author">
        <div class="post-callsign">${escapeHtml(post.author.callsign)}</div>
        <div class="post-meta">${escapeHtml(post.author.rank)} • ${timeAgo(post.created_at)}</div>
      </div>
    </div>
    <div class="post-text">${escapeHtml(post.text)}</div>
    <div class="post-actions">
      <button class="react-btn like ${post.liked ? 'active' : ''}" data-action="like">
        ❤️ <span class="react-count">${post.likes_count}</span>
      </button>
      <button class="react-btn zechot ${post.zechoted ? 'active' : ''}" data-action="zechot">
        🔥 <span class="react-count">${post.zechots_count}</span>
      </button>
      <button class="post-menu-btn" data-action="menu">⋯</button>
    </div>
  `;

  div.querySelector('.post-head').addEventListener('click', () => openPublicProfile(post.author.user_id));
  div.querySelector('[data-action="like"]').addEventListener('click', (e) => reactToPost(post, 'like', e.currentTarget));
  div.querySelector('[data-action="zechot"]').addEventListener('click', (e) => reactToPost(post, 'zechot', e.currentTarget));
  div.querySelector('[data-action="menu"]').addEventListener('click', () => openPostMenu(post));

  return div;
}

async function reactToPost(post, kind, btn) {
  if (btn.dataset.busy === '1') return;
  btn.dataset.busy = '1';

  try {
    const path = kind === 'like' ? '/api/posts/like' : '/api/posts/zechot';
    const data = await api(path, {
      method: 'POST',
      body: JSON.stringify({ post_id: post.post_id }),
    });

    if (kind === 'like') {
      post.liked = data.liked;
      post.likes_count = data.likes_count;
    } else {
      post.zechoted = data.zechoted;
      post.zechots_count = data.zechots_count;
    }

    btn.classList.toggle('active', kind === 'like' ? post.liked : post.zechoted);
    btn.querySelector('.react-count').textContent = kind === 'like' ? post.likes_count : post.zechots_count;

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  } catch (e) {
    showToast("❌ " + e.message, 'error');
  } finally {
    btn.dataset.busy = '';
  }
}

async function submitPost(text, btn) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  btn.disabled = true;
  btn.textContent = 'Публікуємо...';

  try {
    const data = await api("/api/posts/create", {
      method: "POST",
      body: JSON.stringify({ text: trimmed }),
    });

    postCooldownUntil = data.cooldown_until * 1000;

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    showToast('✅ Опубліковано', 'success');
    loadFeed();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Опублікувати';
    showToast("❌ " + e.message, 'error');
  }
}

function updatePostCooldownUI(hintEl, btnEl) {
  clearInterval(postCooldownTimer);

  const tick = () => {
    if (!hintEl || !hintEl.isConnected) {
      clearInterval(postCooldownTimer);
      return;
    }

    const left = postCooldownUntil - Date.now();

    if (left <= 0) {
      hintEl.textContent = '';
      hintEl.classList.remove('active');
      if (btnEl) {
        const ta = document.getElementById('post-textarea');
        btnEl.disabled = !ta || ta.value.length === 0;
      }
      clearInterval(postCooldownTimer);
      return;
    }

    const s = Math.ceil(left / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    hintEl.textContent = `⏱ ${m}:${String(sec).padStart(2, '0')}`;
    hintEl.classList.add('active');
    if (btnEl) btnEl.disabled = true;
  };

  tick();
  postCooldownTimer = setInterval(tick, 1000);
}

// =========================================================
//  ТОП ТИЖНЯ
// =========================================================
async function loadTopWeek() {
  const body = document.getElementById('feed-tab-top');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">Завантаження...</div>';

  try {
    const data = await api("/api/posts/top-week");
    const top = data.top || [];
    body.innerHTML = '';

    if (top.length === 0) {
      body.innerHTML = '<div class="top-empty">🏆 Топ тижня порожній<br>Пиши пости й отримуй лайки!</div>';
      return;
    }

    top.forEach(p => {
      const div = document.createElement('div');
      div.className = 'top-card place-' + p.place;

      const medal = p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : p.place;

      div.innerHTML = `
        <div class="top-place">${medal}</div>
        <div class="top-content">
          <div class="top-author">${escapeHtml(p.author.callsign)} • ${escapeHtml(p.author.rank)}</div>
          <div class="top-text">${escapeHtml(p.text)}</div>
          <div class="top-stats">
            <span>❤️ ${p.likes_count}</span>
            <span>🔥 ${p.zechots_count}</span>
          </div>
        </div>
      `;

      div.addEventListener('click', () => openPublicProfile(p.author.user_id));
      body.appendChild(div);
    });
  } catch (e) {
    body.innerHTML = `<div style="text-align:center;color:#ff6b6b;padding:40px;">❌ ${e.message}</div>`;
  }
}

// =========================================================
//  МЕНЮ ПОСТА
// =========================================================
function openPostMenu(post) {
  currentMenuPost = post;

  const delBtn = document.getElementById('post-menu-delete');
  const repBtn = document.getElementById('post-menu-report');

  if (post.is_mine || state.is_admin) delBtn.classList.remove('hidden');
  else delBtn.classList.add('hidden');

  if (post.is_mine) repBtn.classList.add('hidden');
  else repBtn.classList.remove('hidden');

  document.getElementById('post-menu-overlay').classList.remove('hidden');
}

// =========================================================
//  ІНІЦІАЛІЗАЦІЯ
// =========================================================
function initFeed() {
  // Плаваюча кнопка
  const fab = document.getElementById('chat-fab');
  if (fab) {
    fab.addEventListener('click', () => {
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      openFeed();
    });
  }

  // Закрити стрічку
  const closeBtn = document.getElementById('feed-close');
  if (closeBtn) closeBtn.addEventListener('click', closeFeed);

  // Вкладки Стрічка / Топ
  document.querySelectorAll('.feed-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      feedTab = btn.dataset.feedTab;
      document.querySelectorAll('.feed-tab').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('feed-tab-feed').classList.toggle('hidden', feedTab !== 'feed');
      document.getElementById('feed-tab-top').classList.toggle('hidden', feedTab !== 'top');
      if (feedTab === 'top') loadTopWeek();
    });
  });

  // Меню поста — закрити
  const menuCancel = document.getElementById('post-menu-cancel');
  if (menuCancel) {
    menuCancel.addEventListener('click', () => {
      currentMenuPost = null;
      document.getElementById('post-menu-overlay').classList.add('hidden');
    });
  }

  // Меню поста — видалити
  const menuDelete = document.getElementById('post-menu-delete');
  if (menuDelete) {
    menuDelete.addEventListener('click', async () => {
      if (!currentMenuPost) return;
      const p = currentMenuPost;
      currentMenuPost = null;
      document.getElementById('post-menu-overlay').classList.add('hidden');

      if (!confirm('Видалити цей пост?')) return;

      try {
        await api("/api/posts/delete", {
          method: "POST",
          body: JSON.stringify({ post_id: p.post_id }),
        });
        showToast('🗑 Видалено', 'success');
        loadFeed();
      } catch (e) {
        showToast("❌ " + e.message, 'error');
      }
    });
  }

  // Меню поста — поскаржитись
  const menuReport = document.getElementById('post-menu-report');
  if (menuReport) {
    menuReport.addEventListener('click', async () => {
      if (!currentMenuPost) return;
      const p = currentMenuPost;
      currentMenuPost = null;
      document.getElementById('post-menu-overlay').classList.add('hidden');

      const reason = prompt('Причина скарги (необов\'язково):', '') || '';

      try {
        await api("/api/posts/report", {
          method: "POST",
          body: JSON.stringify({ post_id: p.post_id, reason }),
        });
        showToast('🚩 Скаргу надіслано', 'success');
      } catch (e) {
        showToast("❌ " + e.message, 'error');
      }
    });
  }
}
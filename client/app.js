/* forum 简易论坛 前端逻辑 */
const API = '/api';
const CATEGORIES = ['全部', '技术', '问答', '分享', '灌水'];

const state = {
  posts: [],
  category: '全部',
  openPostId: null, // 当前展开详情的帖子 id
  likedIds: new Set(JSON.parse(localStorage.getItem('forum_liked') || '[]'))
};

const $ = (sel) => document.querySelector(sel);
const postListEl = $('#post-list');
const filterBarEl = $('#filter-bar');

/* ---------- 工具 ---------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function excerpt(text, len = 80) {
  const oneLine = String(text).replace(/\s+/g, ' ').trim();
  return oneLine.length > len ? oneLine.slice(0, len) + '…' : oneLine;
}

let toastTimer = null;
function showToast(msg, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `请求失败（${res.status}）`);
  return body;
}

/* ---------- 数据加载 ---------- */

async function loadPosts() {
  const query = state.category === '全部' ? '' : `?category=${encodeURIComponent(state.category)}`;
  try {
    state.posts = await api(`/posts${query}`);
  } catch (err) {
    showToast(err.message, true);
    state.posts = [];
  }
  renderFilter();
  renderPosts();
}

/* ---------- 渲染 ---------- */

function renderFilter() {
  // 分类计数基于全部帖子（切换分类时 posts 就是筛选结果，所以单独拉一次全量做计数）
  const counts = {};
  CATEGORIES.forEach((c) => (counts[c] = 0));
  fetch(API + '/posts')
    .then((r) => r.json())
    .then((all) => {
      all.forEach((p) => {
        counts[p.category] = (counts[p.category] || 0) + 1;
        counts['全部'] += 1;
      });
      filterBarEl.innerHTML = CATEGORIES.map((c) => `
        <button class="filter-btn ${state.category === c ? 'active' : ''}" data-category="${c}">
          ${c}<span class="count">${counts[c] || 0}</span>
        </button>`).join('');
    })
    .catch(() => {
      filterBarEl.innerHTML = CATEGORIES.map((c) => `
        <button class="filter-btn ${state.category === c ? 'active' : ''}" data-category="${c}">
          ${c}
        </button>`).join('');
    });
}

function replyItemHtml(reply) {
  return `
    <div class="reply-item">
      <div class="reply-meta">${escapeHtml(reply.author)} · ${formatTime(reply.createdAt)}</div>
      <div class="reply-content">${escapeHtml(reply.content)}</div>
    </div>`;
}

function postCardHtml(post) {
  const liked = state.likedIds.has(post.id);
  const open = state.openPostId === post.id;
  return `
    <article class="card post-card" data-id="${post.id}">
      <div class="post-head">
        <span class="tag tag-${escapeHtml(post.category)}">${escapeHtml(post.category)}</span>
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
      </div>
      <div class="post-meta">${escapeHtml(post.author)} · ${formatTime(post.createdAt)}</div>
      ${open ? '' : `<p class="post-excerpt">${escapeHtml(excerpt(post.content))}</p>`}
      <div class="post-actions">
        <button class="action-btn like-btn ${liked ? 'liked' : ''}" data-action="like" aria-label="点赞">
          ${liked ? '❤️' : '🤍'} <span class="like-count">${post.likes}</span>
        </button>
        <button class="action-btn" data-action="scroll-to-replies">💬 回帖 ${post.replies.length}</button>
        <button class="action-btn expand" data-action="toggle-detail">
          ${open ? '收起 ▲' : '查看详情 & 回帖 ▼'}
        </button>
      </div>
      ${open ? `
        <div class="post-detail">
          <div class="full-content">${escapeHtml(post.content)}</div>
          <div class="replies">
            <h4>全部回帖（${post.replies.length}）</h4>
            ${post.replies.length
              ? post.replies.map(replyItemHtml).join('')
              : '<p class="empty">还没有回帖，来抢沙发～</p>'}
            <form class="reply-form">
              <input name="reply-author" type="text" placeholder="昵称（可匿名）" maxlength="20">
              <input name="reply-content" type="text" placeholder="写下你的回帖…" maxlength="200" required>
              <button type="submit" class="btn primary small">回帖</button>
            </form>
          </div>
        </div>` : ''}
    </article>`;
}

function renderPosts() {
  if (!state.posts.length) {
    postListEl.innerHTML = '<div class="empty-state">该分类下还没有帖子，发一篇吧～</div>';
    return;
  }
  postListEl.innerHTML = state.posts.map(postCardHtml).join('');
}

/* ---------- 事件 ---------- */

filterBarEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  state.category = btn.dataset.category;
  loadPosts();
});

$('#new-post-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#np-title').value.trim();
  const author = $('#np-author').value.trim();
  const category = $('#np-category').value;
  const content = $('#np-content').value.trim();
  if (!title || !content) return;

  try {
    await api('/posts', {
      method: 'POST',
      body: JSON.stringify({ title, author, category, content })
    });
    e.target.reset();
    showToast('发布成功 🎉');
    state.category = '全部'; // 新帖可能不属于当前筛选，切回全部保证可见
    state.openPostId = null;
    await loadPosts();
  } catch (err) {
    showToast(err.message, true);
  }
});

postListEl.addEventListener('click', async (e) => {
  const card = e.target.closest('.post-card');
  if (!card) return;
  const postId = Number(card.dataset.id);
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  if (action === 'toggle-detail' || action === 'scroll-to-replies') {
    state.openPostId = state.openPostId === postId ? null : postId;
    renderPosts();
    if (state.openPostId === postId && action === 'scroll-to-replies') {
      card.querySelector('.post-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return;
  }

  if (action === 'like') {
    try {
      const result = await api(`/posts/${postId}/like`, { method: 'POST' });
      if (state.likedIds.has(postId)) {
        state.likedIds.delete(postId);
      } else {
        state.likedIds.add(postId);
      }
      localStorage.setItem('forum_liked', JSON.stringify([...state.likedIds]));
      const post = state.posts.find((p) => p.id === postId);
      if (post) post.likes = result.likes;
      const countEl = card.querySelector('.like-count');
      if (countEl) countEl.textContent = result.likes;
      actionEl.classList.toggle('liked', state.likedIds.has(postId));
      actionEl.firstChild.textContent = state.likedIds.has(postId) ? '❤️ ' : '🤍 ';
      showToast(state.likedIds.has(postId) ? '点赞成功 👍' : '已取消点赞');
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

// 回帖表单提交（事件委托，卡片内容会重渲染）
postListEl.addEventListener('submit', async (e) => {
  const form = e.target.closest('.reply-form');
  if (!form) return;
  e.preventDefault();
  const card = form.closest('.post-card');
  const postId = Number(card.dataset.id);
  const author = form.elements['reply-author'].value.trim();
  const content = form.elements['reply-content'].value.trim();
  if (!content) return;

  try {
    await api(`/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ author, content })
    });
    form.reset();
    showToast('回帖成功 💬');
    await loadPosts(); // 重新拉取，保持 openPostId 展开状态
  } catch (err) {
    showToast(err.message, true);
  }
});

/* ---------- 启动 ---------- */

loadPosts();

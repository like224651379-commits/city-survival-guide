/* ===== 城市生存手册 · 交互逻辑 ===== */

// ===== 1. 手风琴展开/折叠 =====
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.closest('.accordion');
      const body = accordion.querySelector('.accordion-body');
      const isOpen = header.classList.contains('open');

      // 可选：关闭其他手风琴（取消注释则同一时间只展开一个）
      // document.querySelectorAll('.accordion-header.open').forEach(h => {
      //   h.classList.remove('open');
      //   h.closest('.accordion').querySelector('.accordion-body').classList.remove('open');
      // });

      header.classList.toggle('open', !isOpen);
      body.classList.toggle('open', !isOpen);

      // 保存展开状态
      saveProgress();
    });
  });
}

// ===== 2. 滚动高亮侧边栏 =====
function initScrollSpy() {
  const tocItems = document.querySelectorAll('.toc-item, .toc-chapter-title');
  if (!tocItems.length) return;

  const anchors = [];
  tocItems.forEach(item => {
    const href = item.getAttribute('href') || item.dataset.href;
    if (href && href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) anchors.push({ el, item });
    }
  });
  if (!anchors.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const found = anchors.find(a => a.el === entry.target);
        if (found) {
          tocItems.forEach(i => i.classList.remove('active'));
          found.item.classList.add('active');
        }
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });

  anchors.forEach(({ el }) => observer.observe(el));
}

// ===== 3. 一键复制号码 =====
function initCopyBtns() {
  document.querySelectorAll('.emergency-item').forEach(item => {
    item.addEventListener('click', () => {
      const num = item.querySelector('.num');
      if (!num) return;
      const text = num.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        showToast(`已复制：${text}`);
      }).catch(() => {
        // 降级方案
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(`已复制：${text}`);
      });
    });
  });

  // 通用复制按钮
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      navigator.clipboard.writeText(text).then(() => showToast(`已复制：${text}`));
    });
  });
}

// ===== 4. Toast 提示 =====
function showToast(msg) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===== 5. 页内搜索 =====
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const query = input.value.trim().toLowerCase();
      doSearch(query);
    }, 300);
  });

  // ESC 清除
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      doSearch('');
    }
  });
}

function doSearch(query) {
  // 清除旧高亮
  document.querySelectorAll('.search-highlight').forEach(el => {
    el.outerHTML = el.textContent;
  });

  if (!query || query.length < 1) return;

  const contentArea = document.querySelector('.content-area');
  if (!contentArea) return;

  // 展开所有手风琴
  document.querySelectorAll('.accordion-header').forEach(h => h.classList.add('open'));
  document.querySelectorAll('.accordion-body').forEach(b => b.classList.add('open'));

  // 高亮匹配文字
  highlightText(contentArea, query);

  // 滚动到第一个高亮
  const first = document.querySelector('.search-highlight');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function highlightText(node, query) {
  if (node.nodeType === Node.TEXT_NODE) {
    const idx = node.textContent.toLowerCase().indexOf(query);
    if (idx >= 0) {
      const span = document.createElement('span');
      span.innerHTML =
        escHtml(node.textContent.slice(0, idx)) +
        `<span class="search-highlight">${escHtml(node.textContent.slice(idx, idx + query.length))}</span>` +
        escHtml(node.textContent.slice(idx + query.length));
      node.parentNode.replaceChild(span, node);
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (['SCRIPT', 'STYLE', 'INPUT', 'BUTTON'].includes(node.tagName)) return;
  Array.from(node.childNodes).forEach(child => highlightText(child, query));
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== 6. 进度保存 & 恢复 =====
function saveProgress() {
  const city = document.body.dataset.city;
  if (!city) return;
  const open = [];
  document.querySelectorAll('.accordion-header.open').forEach(h => {
    const id = h.closest('.accordion').id;
    if (id) open.push(id);
  });
  localStorage.setItem(`progress_${city}`, JSON.stringify(open));
}

function restoreProgress() {
  const city = document.body.dataset.city;
  if (!city) return;
  const saved = localStorage.getItem(`progress_${city}`);
  if (!saved) {
    // 默认展开第一章第一个手风琴
    const first = document.querySelector('.accordion-header');
    if (first) {
      first.classList.add('open');
      first.closest('.accordion').querySelector('.accordion-body').classList.add('open');
    }
    return;
  }
  const open = JSON.parse(saved);
  open.forEach(id => {
    const acc = document.getElementById(id);
    if (!acc) return;
    const header = acc.querySelector('.accordion-header');
    const body = acc.querySelector('.accordion-body');
    if (header && body) {
      header.classList.add('open');
      body.classList.add('open');
    }
  });
  // 更新进度条
  updateProgressBar();
}

function updateProgressBar() {
  const total = document.querySelectorAll('.accordion').length;
  const opened = document.querySelectorAll('.accordion-header.open').length;
  const bar = document.querySelector('.progress-bar-inner');
  const text = document.querySelector('.progress-text');
  if (bar) bar.style.width = total ? `${Math.round(opened / total * 100)}%` : '0%';
  if (text) text.textContent = `已阅读 ${opened}/${total} 个章节`;
}

// ===== 7. 平滑滚动 TOC =====
function initTocClick() {
  document.querySelectorAll('.toc-item[href], .toc-chapter-title[data-href]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const href = item.getAttribute('href') || item.dataset.href;
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ===== 8. 章节导航（顶部） =====
function initChapterNav() {
  document.querySelectorAll('.chapter-nav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const href = a.getAttribute('href');
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  initAccordions();
  initScrollSpy();
  initCopyBtns();
  initSearch();
  restoreProgress();
  initTocClick();
  initChapterNav();

  // 监听展开变化更新进度条
  document.addEventListener('click', e => {
    if (e.target.closest('.accordion-header')) {
      setTimeout(updateProgressBar, 50);
    }
  });
});

// tags.js — タグ色管理・レンダリングユーティリティ

window.COLORS = [
  '#2563eb', // 青
  '#16a34a', // 緑
  '#d97706', // オレンジ
  '#dc2626', // 赤
  '#9333ea', // 紫
  '#0891b2', // シアン
  '#be185d', // ピンク
  '#737373', // グレー
];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function renderTagChip(tag, removable = false) {
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.style.background = window.hexToRgba(tag.color, 0.12);
  chip.style.color = tag.color;
  chip.dataset.tagId = tag.id;

  const label = document.createElement('span');
  label.textContent = tag.name;
  chip.appendChild(label);

  if (removable) {
    const btn = document.createElement('button');
    btn.className = 'tag-remove';
    btn.setAttribute('aria-label', '削除');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    chip.appendChild(btn);
  }

  return chip;
}

function renderColorPicker(container, selectedColor, onChange) {
  container.innerHTML = '';
  window.COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch' + (color === selectedColor ? ' selected' : '');
    swatch.style.background = color;
    swatch.setAttribute('aria-label', color);
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      onChange(color);
    });
    container.appendChild(swatch);
  });
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysUntilPurge(deletedAt) {
  const elapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
  return 30 - elapsed;
}

function formatDate(dateStr) {
  if (!dateStr) return '未訪問';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function timeLabel(value) {
  return { morning:'午前', afternoon:'午後', evening:'夕方', night:'夜' }[value] || '';
}


// Safari/PWAでグローバルconstの初期化順に引っかからないよう、明示的にwindowへ公開する
window.hexToRgba = hexToRgba;
window.renderTagChip = renderTagChip;
window.renderColorPicker = renderColorPicker;
window.daysSince = daysSince;
window.daysUntilPurge = daysUntilPurge;
window.formatDate = formatDate;
window.timeLabel = timeLabel;

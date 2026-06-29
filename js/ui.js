// ui.js — 画面描画・遷移・モーダル管理

window.UI = (() => {
  // ===== 画面遷移 =====
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
  }

  // ===== トースト =====
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ===== リストレンダリング =====
  function renderList(visits, tags, searchQuery, activeTagIds) {
    const container = document.getElementById('visit-list');
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));

    let filtered = visits.slice();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        (v.address || '').toLowerCase().includes(q) ||
        (v.name || '').toLowerCase().includes(q)
      );
    }

    if (activeTagIds && activeTagIds.length > 0) {
      filtered = filtered.filter(v =>
        activeTagIds.every(tid => v.tags && v.tags.includes(tid))
      );
    }

    // 最終訪問日が古い順
    filtered.sort((a, b) => {
      const da = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
      const db = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
      return da - db;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        <p>訪問先がありません</p>
      </div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(v => {
      const days = window.daysSince(v.lastVisit);
      const isOverdue = days === null || days >= 14;
      const row = document.createElement('div');
      row.className = 'swipe-row';
      row.dataset.id = v.id;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'swipe-delete-btn';
      deleteBtn.dataset.id = v.id;
      deleteBtn.type = 'button';
      deleteBtn.textContent = '削除';

      const card = document.createElement('div');
      card.className = 'visit-card' + (isOverdue ? ' overdue' : '');
      card.dataset.id = v.id;

      // バッジ
      let badgeHtml = '';
      if (days === null) {
        badgeHtml = `<span class="badge badge-warn">未訪問</span>`;
      } else if (days >= 14) {
        badgeHtml = `<span class="badge badge-warn">${days}日経過</span>`;
      } else if (days <= 3) {
        badgeHtml = `<span class="badge badge-ok">${days}日前</span>`;
      } else {
        badgeHtml = `<span class="badge badge-neutral">${days}日前</span>`;
      }

      // タグ
      let tagsHtml = '';
      if (v.tags && v.tags.length > 0) {
        tagsHtml = '<div class="card-tags">';
        v.tags.forEach(tid => {
          const tag = tagMap[tid];
          if (!tag) return;
          tagsHtml += `<span class="tag-chip" style="background:${window.hexToRgba(tag.color,0.12)};color:${tag.color}">${escapeHtml(tag.name)}</span>`;
        });
        tagsHtml += '</div>';
      }

      const lastStr = v.lastVisit
        ? `最終訪問 ${window.formatDate(v.lastVisit)}${v.lastTime ? '（' + window.timeLabel(v.lastTime) + '）' : ''}`
        : '未訪問';

      card.innerHTML = `
        <div class="card-top">
          <span class="card-address">${escapeHtml(v.address || '（住所未設定）')}</span>
          ${badgeHtml}
        </div>
        <div class="card-name">${escapeHtml(v.name || '不明')}${v.gender ? '・' + genderLabel(v.gender) : ''}</div>
        ${tagsHtml}
        <div class="card-bottom">
          <span class="card-date${isOverdue ? ' overdue' : ''}">${escapeHtml(lastStr)}</span>
          <button class="card-map-btn" data-address="${encodeURIComponent(v.address || '')}" aria-label="マップで開く">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            マップ
          </button>
        </div>
      `;

      row.appendChild(deleteBtn);
      row.appendChild(card);
      attachSwipeHandlers(row, card);
      container.appendChild(row);
    });
  }

  function attachSwipeHandlers(row, card) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;

    card.addEventListener('touchstart', e => {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = 0;
      dragging = false;
      row.classList.add('dragging');
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!e.touches || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;

      dragging = true;
      currentX = Math.max(-88, Math.min(0, dx));
      if (currentX < 0) {
        closeOpenSwipeRows(row);
        card.style.transform = `translateX(${currentX}px)`;
        e.preventDefault();
      }
    }, { passive: false });

    card.addEventListener('touchend', () => {
      row.classList.remove('dragging');
      card.style.transform = '';
      if (!dragging) return;
      row.classList.toggle('swiped', currentX <= -48);
      dragging = false;
    });
  }

  function closeOpenSwipeRows(exceptRow) {
    document.querySelectorAll('.swipe-row.swiped').forEach(row => {
      if (row !== exceptRow) row.classList.remove('swiped');
    });
  }

  function genderLabel(g) {
    return { male:'男性', female:'女性', other:'その他' }[g] || '';
  }

  // ===== ゴミ箱レンダリング =====
  function renderTrash(trash) {
    const container = document.getElementById('trash-list');
    const active = trash.filter(v => window.daysUntilPurge(v.deletedAt) > 0);

    if (active.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>ゴミ箱は空です</p></div>`;
      return;
    }

    container.innerHTML = '';
    active.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    active.forEach(v => {
      const remaining = window.daysUntilPurge(v.deletedAt);
      const card = document.createElement('div');
      card.className = 'trash-card';
      card.innerHTML = `
        <div class="trash-card-address">${escapeHtml(v.address || '（住所未設定）')}</div>
        <div class="trash-card-bottom">
          <span class="trash-days">あと${remaining}日で完全削除</span>
          <button class="btn-restore" data-id="${v.id}">復元</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ===== フォームへの流し込み =====
  function fillForm(entry) {
    document.getElementById('field-id').value = entry.id || '';
    document.getElementById('field-address').value = entry.address || '';
    document.getElementById('field-name').value = entry.name || '';
    document.getElementById('field-gender').value = entry.gender || '';
    document.getElementById('field-last-visit').value = entry.lastVisit || '';
    document.getElementById('field-memo').value = entry.memo || '';

    // 時間帯チップ
    document.querySelectorAll('#time-options .time-chip').forEach(chip => {
      chip.classList.toggle('selected', chip.dataset.value === entry.lastTime);
    });

    // タグ
    renderSelectedTags(entry.tags || []);

    // 訪問履歴
    renderVisitHistory(entry.visitHistory || []);

    const isEdit = !!entry.id;
    document.getElementById('detail-title').textContent = isEdit ? '詳細・編集' : '新規登録';
    document.getElementById('btn-delete-entry').classList.toggle('hidden', !isEdit);
    document.getElementById('visit-history-section').style.display = isEdit ? '' : 'none';
  }

  function getFormData() {
    const selectedTime = document.querySelector('#time-options .time-chip.selected');
    return {
      address: document.getElementById('field-address').value.trim(),
      name: document.getElementById('field-name').value.trim(),
      gender: document.getElementById('field-gender').value,
      lastVisit: document.getElementById('field-last-visit').value,
      lastTime: selectedTime ? selectedTime.dataset.value : '',
      memo: document.getElementById('field-memo').value.trim(),
      tags: getSelectedTagIds()
    };
  }

  // ===== タグ選択UI =====
  let selectedTagIds = [];

  function renderSelectedTags(tagIds) {
    selectedTagIds = tagIds.slice();
    const container = document.getElementById('selected-tags');
    container.innerHTML = '';
    const tags = window.DB.getTags();
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));
    selectedTagIds.forEach(tid => {
      const tag = tagMap[tid];
      if (!tag) return;
      const chip = window.renderTagChip(tag, true);
      chip.querySelector('.tag-remove').addEventListener('click', e => {
        e.stopPropagation();
        selectedTagIds = selectedTagIds.filter(id => id !== tid);
        renderSelectedTags(selectedTagIds);
      });
      container.appendChild(chip);
    });
  }

  function getSelectedTagIds() { return selectedTagIds.slice(); }

  // ===== タグピッカーモーダル =====
  function openTagPicker() {
    const modal = document.getElementById('modal-tag-picker');
    modal.classList.remove('hidden');
    renderTagPickerList();
  }

  function closeTagPicker() {
    document.getElementById('modal-tag-picker').classList.add('hidden');
  }

  function renderTagPickerList() {
    const list = document.getElementById('tag-picker-list');
    list.innerHTML = '';
    window.DB.getTags().forEach(tag => {
      const item = document.createElement('div');
      item.className = 'tag-picker-item';
      const isSelected = selectedTagIds.includes(tag.id);
      item.innerHTML = `
        <div class="tag-picker-left">
          <div class="tag-color-dot" style="background:${tag.color}"></div>
          <span>${escapeHtml(tag.name)}</span>
        </div>
        <svg class="tag-check${isSelected ? ' visible' : ''}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      `;
      item.addEventListener('click', () => {
        if (selectedTagIds.includes(tag.id)) {
          selectedTagIds = selectedTagIds.filter(id => id !== tag.id);
        } else {
          selectedTagIds.push(tag.id);
        }
        renderSelectedTags(selectedTagIds);
        renderTagPickerList();
      });
      list.appendChild(item);
    });
  }

  // ===== 訪問履歴 =====
  let visitHistory = [];
  let editingHistoryIndex = null;

  function renderVisitHistory(history) {
    visitHistory = history.slice();
    const list = document.getElementById('visit-history-list');
    list.innerHTML = '';
    const sorted = visitHistory
      .map((item, index) => ({ item, index }))
      .sort((a, b) => new Date(b.item.date) - new Date(a.item.date));

    sorted.forEach(({ item, index }) => {
      const el = document.createElement('div');
      el.className = 'history-item' + (item.absent ? ' absent' : '');
      el.innerHTML = `
        <div class="history-item-main">
          <div class="history-item-top">
            <span class="history-date">${item.absent ? '🚪 ' : ''}${window.formatDate(item.date)}</span>
            <span class="history-time">${item.absent ? '不在' : window.timeLabel(item.time)}</span>
          </div>
          ${item.memo ? `<div class="history-memo">${escapeHtml(item.memo)}</div>` : ''}
        </div>
        <div class="history-actions">
          <button type="button" class="history-action history-edit" data-index="${index}">編集</button>
          <button type="button" class="history-action history-delete" data-index="${index}">削除</button>
        </div>
      `;
      list.appendChild(el);
    });
  }

  function getVisitHistory() { return visitHistory.slice(); }

  function openVisitModal(item = null, index = null) {
    editingHistoryIndex = Number.isInteger(index) ? index : null;
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('visit-modal-title').textContent = editingHistoryIndex === null ? '訪問を記録' : '訪問を編集';
    document.getElementById('btn-save-visit').textContent = editingHistoryIndex === null ? '記録' : '更新';
    document.getElementById('visit-date').value = item && item.date ? item.date : today;
    document.querySelectorAll('#visit-time-options .time-chip').forEach(c => {
      c.classList.toggle('selected', !!item && c.dataset.value === item.time);
    });
    document.getElementById('visit-memo').value = item && item.memo ? item.memo : '';
    document.getElementById('modal-visit').classList.remove('hidden');
  }

  function closeVisitModal() {
    document.getElementById('modal-visit').classList.add('hidden');
    editingHistoryIndex = null;
  }

  function getVisitFormData() {
    const selectedTime = document.querySelector('#visit-time-options .time-chip.selected');
    return {
      date: document.getElementById('visit-date').value,
      time: selectedTime ? selectedTime.dataset.value : '',
      memo: document.getElementById('visit-memo').value.trim()
    };
  }

  function openAbsentModal(item = null, index = null) {
    editingHistoryIndex = Number.isInteger(index) ? index : null;
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('absent-modal-title').textContent = editingHistoryIndex === null ? '不在を記録' : '不在を編集';
    document.getElementById('btn-save-absent').textContent = editingHistoryIndex === null ? '記録' : '更新';
    document.getElementById('absent-date').value = item && item.date ? item.date : today;
    document.getElementById('absent-memo').value = item && item.memo ? item.memo : '';
    document.getElementById('modal-absent').classList.remove('hidden');
  }

  function closeAbsentModal() {
    document.getElementById('modal-absent').classList.add('hidden');
    editingHistoryIndex = null;
  }

  function getAbsentFormData() {
    return {
      date: document.getElementById('absent-date').value,
      absent: true,
      memo: document.getElementById('absent-memo').value.trim()
    };
  }

  function saveVisitHistoryItem(item) {
    const normalized = { ...item };
    if (editingHistoryIndex === null) visitHistory.push(normalized);
    else visitHistory[editingHistoryIndex] = normalized;
    renderVisitHistory(visitHistory);
  }

  function deleteVisitHistoryItem(index) {
    if (!Number.isInteger(index) || index < 0 || index >= visitHistory.length) return;
    visitHistory.splice(index, 1);
    renderVisitHistory(visitHistory);
  }

  // ===== 設定画面 =====
  function renderSettings() {
    renderTagsManage();
    const backupDate = window.DB.getBackupDate();
    document.getElementById('backup-last-text').textContent =
      '最終バックアップ：' + (backupDate ? window.formatDate(backupDate) : 'なし');
    document.getElementById('version-text').textContent = 'v' + window.DB.getVersion();
  }

  function renderTagsManage() {
    const list = document.getElementById('tags-list');
    list.innerHTML = '';
    window.DB.getTags().forEach(tag => {
      const item = document.createElement('div');
      item.className = 'tag-manage-item';
      item.dataset.id = tag.id;
      item.innerHTML = `
        <div class="tag-manage-left">
          <div class="tag-color-dot" style="background:${tag.color}"></div>
          <span class="tag-manage-name">${escapeHtml(tag.name)}</span>
        </div>
        <div class="tag-manage-actions">
          <button type="button" class="tag-manage-edit" data-id="${tag.id}" aria-label="編集">編集</button>
          <button class="tag-manage-del" data-id="${tag.id}" aria-label="削除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  // ===== タグ追加・編集モーダル =====
  let newTagColor = window.COLORS[0];
  let editingTagId = null;

  function openAddTagModal(tag = null) {
    editingTagId = tag && tag.id ? tag.id : null;
    newTagColor = tag && tag.color ? tag.color : window.COLORS[0];
    document.getElementById('tag-modal-title').textContent = editingTagId ? 'タグを編集' : 'タグを追加';
    document.getElementById('btn-save-tag').textContent = editingTagId ? '更新' : '追加';
    document.getElementById('new-tag-name').value = tag && tag.name ? tag.name : '';
    window.renderColorPicker(
      document.getElementById('color-picker'),
      newTagColor,
      color => { newTagColor = color; }
    );
    document.getElementById('modal-add-tag').classList.remove('hidden');
  }

  function closeAddTagModal() {
    document.getElementById('modal-add-tag').classList.add('hidden');
    editingTagId = null;
  }

  function getNewTagData() {
    return {
      name: document.getElementById('new-tag-name').value.trim(),
      color: newTagColor
    };
  }

  function getEditingTagId() { return editingTagId; }

  // ===== バックアップ通知 =====
  function updateBackupNotice() {
    const backupDate = window.DB.getBackupDate();
    const notice = document.getElementById('backup-notice');
    const text = document.getElementById('backup-notice-text');
    if (!backupDate) {
      notice.classList.remove('hidden');
      text.textContent = 'まだバックアップがありません。設定からエクスポートしてください。';
      return;
    }
    const days = window.daysSince(backupDate);
    if (days >= 30) {
      notice.classList.remove('hidden');
      text.textContent = `最終バックアップから${days}日が経過しています。`;
    } else {
      notice.classList.add('hidden');
    }
  }

  // ===== フィルターバー =====
  function renderFilterBar(activeTagIds, onToggle) {
    const container = document.getElementById('filter-tags-list');
    container.innerHTML = '';
    window.DB.getTags().forEach(tag => {
      const isActive = activeTagIds.includes(tag.id);
      const chip = document.createElement('button');
      chip.className = 'tag-chip';
      chip.style.background = isActive ? window.hexToRgba(tag.color, 0.85) : window.hexToRgba(tag.color, 0.12);
      chip.style.color = isActive ? '#fff' : tag.color;
      chip.textContent = tag.name;
      chip.addEventListener('click', () => onToggle(tag.id));
      container.appendChild(chip);
    });
  }

  return {
    showScreen, toast,
    renderList, renderTrash, renderSettings, renderTagsManage,
    fillForm, getFormData,
    renderSelectedTags, getSelectedTagIds,
    openTagPicker, closeTagPicker,
    renderVisitHistory, getVisitHistory, openVisitModal, closeVisitModal,
    getVisitFormData, openAbsentModal, closeAbsentModal, getAbsentFormData,
    saveVisitHistoryItem, deleteVisitHistoryItem,
    openAddTagModal, closeAddTagModal, getNewTagData, getEditingTagId,
    updateBackupNotice, renderFilterBar
  };
})();

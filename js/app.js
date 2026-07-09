// app.js — メインロジック・イベントバインド

(() => {
  let activeTagIds = [];
  let searchQuery = '';

  // ===== 起動高速化設定 =====
  const LIST_INITIAL_LIMIT = 50;
  const LIST_MORE_LIMIT = 50;
  const TRASH_PURGE_KEY = 'vm_last_trash_purge';

  // ===== 初期化 =====
  function init() {
    // ボタンが無反応になる事故を避けるため、イベント登録を最優先する
    safeRun('bindEvents', bindEvents);
    safeRun('patchOptimizedListRenderer', patchOptimizedListRenderer);
    safeRun('migrateLegacyDemoData', migrateLegacyDemoData);
    safeRun('insertDemoData', insertDemoData);
    safeRun('renderList', renderList);
    safeRun('registerSW', registerSW);
    schedulePostStartupTasks();
  }

  function safeRun(label, fn) {
    try {
      return fn();
    } catch (err) {
      console.error(label + ' failed', err);
      showStartupError(label, err);
      return null;
    }
  }

  function runLater(fn, delay) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => safeRun(fn.name || 'idleTask', fn), { timeout: delay + 2000 });
      return;
    }
    window.setTimeout(() => safeRun(fn.name || 'delayedTask', fn), delay);
  }

  function schedulePostStartupTasks() {
    // 起動直後の白画面を避けるため、表示に不要な処理は後回しにする。
    runLater(updateBackupNoticeLater, 300);
    runLater(purgeTrashOncePerDay, 900);
    runLater(snapshotToIndexedDBLater, 1600);
  }

  function updateBackupNoticeLater() {
    window.UI.updateBackupNotice();
  }

  function snapshotToIndexedDBLater() {
    window.DB.snapshotToIndexedDB();
  }

  function purgeTrashOncePerDay() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(TRASH_PURGE_KEY) === today) return;
      window.DB.purgeExpiredTrash();
      localStorage.setItem(TRASH_PURGE_KEY, today);
    } catch (err) {
      console.warn('daily trash purge failed', err);
    }
  }

  function showStartupError(label, err) {
    try {
      // 起動直後のエラー表示では window.UI.toast に依存しない。
      // iPhone Safariで UI 初期化前エラーが連鎖するのを防ぐ。
      if (!new URLSearchParams(location.search).has('debug')) return;

      const box = document.createElement('pre');
      box.style.position = 'fixed';
      box.style.left = '8px';
      box.style.right = '8px';
      box.style.bottom = '8px';
      box.style.zIndex = '99999';
      box.style.background = '#fff7ed';
      box.style.color = '#9a3412';
      box.style.padding = '12px';
      box.style.fontSize = '12px';
      box.style.whiteSpace = 'pre-wrap';
      box.style.border = '1px solid #fb923c';
      box.style.borderRadius = '8px';
      const errName = err && err.name ? err.name : 'Error';
      const errMessage = err && err.message ? err.message : String(err);
      const errStack = err && err.stack ? err.stack : '';
      box.textContent =
        'Startup Error\n' +
        'step: ' + label + '\n' +
        'name: ' + errName + '\n' +
        'message: ' + errMessage + '\n' +
        (errStack ? 'stack:\n' + errStack : '');

      document.body.appendChild(box);
    } catch (_) {
      // エラー表示処理そのもので絶対に落とさない
    }
  }

  function renderList() {
    const visits = window.DB.getVisits();
    const tags = window.DB.getTags();
    window.UI.renderList(Array.isArray(visits) ? visits : [], Array.isArray(tags) ? tags : [], searchQuery, activeTagIds);
  }

  // ===== 一覧描画の高速化パッチ =====
  function patchOptimizedListRenderer() {
    if (!window.UI || typeof window.UI.renderList !== 'function') return;

    const state = {
      renderedCount: LIST_INITIAL_LIMIT,
      lastSignature: ''
    };

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function hasLatLng(entry) {
      return Number.isFinite(Number(entry && entry.lat)) && Number.isFinite(Number(entry && entry.lng));
    }

    function entryTitle(entry) {
      return (entry.displayTitle || '').trim() || (entry.address || '').trim() || '場所未設定';
    }

    function genderLabel(g) {
      return { male: '男性', female: '女性', other: 'その他' }[g] || '';
    }

    function closeOpenSwipeRows(exceptRow) {
      document.querySelectorAll('.swipe-row.swiped').forEach(row => {
        if (row !== exceptRow) row.classList.remove('swiped');
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

    function createVisitRow(v, tagMap) {
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

      let tagsHtml = '';
      if (v.tags && v.tags.length > 0) {
        tagsHtml = '<div class="card-tags">';
        v.tags.forEach(tid => {
          const tag = tagMap[tid];
          if (!tag) return;
          tagsHtml += `<span class="tag-chip" style="background:${window.hexToRgba(tag.color, 0.12)};color:${tag.color}">${escapeHtml(tag.name)}</span>`;
        });
        tagsHtml += '</div>';
      }

      const lastStr = v.lastVisit
        ? `最終訪問 ${window.formatDate(v.lastVisit)}${v.lastTime ? '（' + window.timeLabel(v.lastTime) + '）' : ''}`
        : '未訪問';

      const title = entryTitle(v);
      const placeMemoHtml = v.placeMemo ? `<div class="card-place-memo">${escapeHtml(v.placeMemo)}</div>` : '';
      const lat = hasLatLng(v) ? String(v.lat) : '';
      const lng = hasLatLng(v) ? String(v.lng) : '';

      card.innerHTML = `
        <div class="card-top">
          <span class="card-address">${escapeHtml(title)}</span>
          ${badgeHtml}
        </div>
        <div class="card-name">${escapeHtml(v.name || '不明')}${v.gender ? '・' + genderLabel(v.gender) : ''}</div>
        ${placeMemoHtml}
        ${tagsHtml}
        <div class="card-bottom">
          <span class="card-date${isOverdue ? ' overdue' : ''}">${escapeHtml(lastStr)}</span>
          <button class="card-map-btn" data-address="${encodeURIComponent(v.address || title || '')}" data-lat="${escapeHtml(lat)}" data-lng="${escapeHtml(lng)}" aria-label="マップで開く">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            マップ
          </button>
        </div>
      `;

      row.appendChild(deleteBtn);
      row.appendChild(card);
      attachSwipeHandlers(row, card);
      return row;
    }

    function buildFilteredVisits(visits, searchQueryValue, activeTagIdsValue) {
      let filtered = visits.slice();

      if (searchQueryValue) {
        const q = searchQueryValue.toLowerCase();
        filtered = filtered.filter(v =>
          (v.displayTitle || '').toLowerCase().includes(q) ||
          (v.address || '').toLowerCase().includes(q) ||
          (v.name || '').toLowerCase().includes(q) ||
          (v.placeMemo || '').toLowerCase().includes(q) ||
          (v.memo || '').toLowerCase().includes(q)
        );
      }

      if (activeTagIdsValue && activeTagIdsValue.length > 0) {
        filtered = filtered.filter(v =>
          activeTagIdsValue.every(tid => v.tags && v.tags.includes(tid))
        );
      }

      // 最終訪問日が古い順
      filtered.sort((a, b) => {
        const da = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const db = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        return da - db;
      });

      return filtered;
    }

    window.UI.renderList = function optimizedRenderList(visits, tags, searchQueryValue, activeTagIdsValue) {
      const container = document.getElementById('visit-list');
      const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));
      const filtered = buildFilteredVisits(visits, searchQueryValue, activeTagIdsValue);
      const signature = [
        visits.length,
        filtered.length,
        searchQueryValue || '',
        (activeTagIdsValue || []).join(','),
        filtered.map(v => v.id + ':' + (v.updatedAt || '')).slice(0, 20).join('|')
      ].join('::');

      if (signature !== state.lastSignature) {
        state.renderedCount = LIST_INITIAL_LIMIT;
        state.lastSignature = signature;
      }

      if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          <p>訪問先がありません</p>
        </div>`;
        return;
      }

      const count = Math.min(state.renderedCount, filtered.length);
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < count; i += 1) {
        fragment.appendChild(createVisitRow(filtered[i], tagMap));
      }

      container.innerHTML = '';
      container.appendChild(fragment);

      if (count < filtered.length) {
        const moreWrap = document.createElement('div');
        moreWrap.style.padding = '12px 16px 28px';
        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'btn-secondary';
        moreBtn.textContent = `さらに表示（${count}/${filtered.length}件）`;
        moreBtn.addEventListener('click', () => {
          state.renderedCount += LIST_MORE_LIMIT;
          window.UI.renderList(visits, tags, searchQueryValue, activeTagIdsValue);
        });
        moreWrap.appendChild(moreBtn);
        container.appendChild(moreWrap);
      }
    };
  }

  // ===== イベントバインド =====
  function bindEvents() {
    // ナビゲーション
    document.getElementById('btn-trash-nav').addEventListener('click', () => {
      window.UI.renderTrash(window.DB.getTrash());
      window.UI.showScreen('trash');
    });
    document.getElementById('btn-settings-nav').addEventListener('click', () => {
      window.UI.renderSettings();
      window.UI.showScreen('settings');
    });
    document.getElementById('btn-back-detail').addEventListener('click', () => window.UI.showScreen('list'));
    document.getElementById('btn-back-trash').addEventListener('click', () => window.UI.showScreen('list'));
    document.getElementById('btn-back-settings').addEventListener('click', () => window.UI.showScreen('list'));

    // 新規追加
    document.getElementById('btn-add').addEventListener('click', () => {
      window.UI.fillForm({});
      window.UI.showScreen('detail');
    });

    // リストのカードタップ・マップ・スワイプ削除
    document.getElementById('visit-list').addEventListener('click', async e => {
      const deleteBtn = e.target.closest('.swipe-delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        if (!await confirmDialog('ゴミ箱に移しますか？30日後に完全削除されます。')) return;
        window.DB.moveToTrash(deleteBtn.dataset.id);
        window.UI.toast('ゴミ箱に移しました');
        renderList();
        return;
      }

      const row = e.target.closest('.swipe-row');
      if (row && row.classList.contains('swiped')) {
        row.classList.remove('swiped');
        return;
      }

      const card = e.target.closest('.visit-card');
      const mapBtn = e.target.closest('.card-map-btn');
      if (mapBtn) {
        e.stopPropagation();
        const addr = decodeURIComponent(mapBtn.dataset.address || '');
        openMap(addr, mapBtn.dataset.lat, mapBtn.dataset.lng);
        return;
      }
      if (card) {
        const entry = window.DB.getVisitById(card.dataset.id);
        if (entry) {
          window.UI.fillForm(entry);
          window.UI.showScreen('detail');
        }
      }
    });

    // 保存
    document.getElementById('btn-save').addEventListener('click', () => {
      const data = window.UI.getFormData();
      if (!data.address && !data.displayTitle) {
        window.UI.toast('場所・住所または一覧表示名を入力してください');
        return;
      }
      const id = document.getElementById('field-id').value;
      data.visitHistory = window.UI.getVisitHistory();
      if (id) {
        window.DB.updateVisit(id, data);
        window.UI.toast('更新しました');
      } else {
        window.DB.addVisit(data);
        window.UI.toast('登録しました');
      }
      renderList();
      window.UI.showScreen('list');
    });

    // 削除
    document.getElementById('btn-delete-entry').addEventListener('click', async () => {
      if (!await confirmDialog('ゴミ箱に移しますか？30日後に完全削除されます。')) return;
      const id = document.getElementById('field-id').value;
      window.DB.moveToTrash(id);
      window.UI.toast('ゴミ箱に移しました');
      renderList();
      window.UI.showScreen('list');
    });

    // 住所マップ（編集画面）
    document.getElementById('btn-map-preview').addEventListener('click', () => {
      const loc = window.UI.getLocationFields();
      const addr = loc.address || loc.displayTitle;
      if (!addr && (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng))) {
        window.UI.toast('場所・住所を入力してください');
        return;
      }
      openMap(addr, loc.lat, loc.lng);
    });

    // 現在地・地図ピッカー
    document.getElementById('btn-use-current-location').addEventListener('click', window.UI.useCurrentLocation);
    document.getElementById('btn-open-location-picker').addEventListener('click', window.UI.openLocationPicker);
    document.getElementById('btn-close-location-picker').addEventListener('click', window.UI.closeLocationPicker);
    document.querySelector('#modal-location-picker .modal-backdrop').addEventListener('click', window.UI.closeLocationPicker);
    document.getElementById('btn-location-current').addEventListener('click', window.UI.movePickerToCurrentLocation);
    document.getElementById('btn-use-picked-location').addEventListener('click', window.UI.usePickedLocation);

    // 住所を手入力した場合は、既存座標とズレる可能性があるため座標を消す
    document.getElementById('field-address').addEventListener('input', () => {
      window.UI.clearLocationCoordinates();
    });

    // 時間帯チップ（メインフォーム）
    document.querySelectorAll('#time-options .time-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const wasSelected = chip.classList.contains('selected');
        document.querySelectorAll('#time-options .time-chip').forEach(c => c.classList.remove('selected'));
        if (!wasSelected) chip.classList.add('selected');
      });
    });

    // 時間帯チップ（訪問モーダル）
    document.querySelectorAll('#visit-time-options .time-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const wasSelected = chip.classList.contains('selected');
        document.querySelectorAll('#visit-time-options .time-chip').forEach(c => c.classList.remove('selected'));
        if (!wasSelected) chip.classList.add('selected');
      });
    });

    // タグピッカー
    document.getElementById('btn-tag-picker').addEventListener('click', window.UI.openTagPicker);
    document.getElementById('btn-close-tag-picker').addEventListener('click', window.UI.closeTagPicker);
    document.querySelector('#modal-tag-picker .modal-backdrop').addEventListener('click', window.UI.closeTagPicker);

    // 訪問記録（会えた）
    document.getElementById('btn-add-visit').addEventListener('click', () => window.UI.openVisitModal());
    document.getElementById('btn-close-visit').addEventListener('click', window.UI.closeVisitModal);
    document.querySelector('#modal-visit .modal-backdrop').addEventListener('click', window.UI.closeVisitModal);
    document.getElementById('btn-save-visit').addEventListener('click', () => {
      const data = window.UI.getVisitFormData();
      if (!data.date) { window.UI.toast('日付を選択してください'); return; }
      window.UI.saveVisitHistoryItem(data);
      syncLastVisitFromHistory();
      const saved = autoSaveCurrentEntry();
      window.UI.closeVisitModal();
      window.UI.toast(saved ? '訪問を保存しました' : '訪問を記録しました');
    });

    // 不在記録
    document.getElementById('btn-add-absent').addEventListener('click', () => window.UI.openAbsentModal());
    document.getElementById('btn-close-absent').addEventListener('click', window.UI.closeAbsentModal);
    document.querySelector('#modal-absent .modal-backdrop').addEventListener('click', window.UI.closeAbsentModal);
    document.getElementById('btn-save-absent').addEventListener('click', () => {
      const data = window.UI.getAbsentFormData();
      if (!data.date) { window.UI.toast('日付を選択してください'); return; }
      window.UI.saveVisitHistoryItem(data);
      syncLastVisitFromHistory();
      const saved = autoSaveCurrentEntry();
      window.UI.closeAbsentModal();
      window.UI.toast(saved ? '不在を保存しました' : '不在を記録しました');
    });

    // 訪問履歴 編集・削除
    document.getElementById('visit-history-list').addEventListener('click', async e => {
      const editBtn = e.target.closest('.history-edit');
      const deleteBtn = e.target.closest('.history-delete');

      if (editBtn) {
        const index = Number(editBtn.dataset.index);
        const item = window.UI.getVisitHistory()[index];
        if (!item) return;
        if (item.absent) window.UI.openAbsentModal(item, index);
        else window.UI.openVisitModal(item, index);
        return;
      }

      if (deleteBtn) {
        const index = Number(deleteBtn.dataset.index);
        if (!await confirmDialog('この訪問履歴を削除しますか？')) return;
        window.UI.deleteVisitHistoryItem(index);
        syncLastVisitFromHistory();
        autoSaveCurrentEntry();
        window.UI.toast('訪問履歴を削除しました');
      }
    });

    // ゴミ箱 復元
    document.getElementById('trash-list').addEventListener('click', e => {
      const btn = e.target.closest('.btn-restore');
      if (btn) {
        window.DB.restoreFromTrash(btn.dataset.id);
        window.UI.renderTrash(window.DB.getTrash());
        renderList();
        window.UI.toast('復元しました');
      }
    });

    // 設定：タグ追加・編集
    document.getElementById('btn-add-tag').addEventListener('click', () => window.UI.openAddTagModal());
    document.getElementById('btn-close-add-tag').addEventListener('click', window.UI.closeAddTagModal);
    document.querySelector('#modal-add-tag .modal-backdrop').addEventListener('click', window.UI.closeAddTagModal);
    document.getElementById('btn-save-tag').addEventListener('click', () => {
      const data = window.UI.getNewTagData();
      if (!data.name) { window.UI.toast('タグ名を入力してください'); return; }
      const editingTagId = window.UI.getEditingTagId();
      if (editingTagId) {
        window.DB.updateTag(editingTagId, data);
        window.UI.toast('タグを更新しました');
      } else {
        window.DB.addTag(data);
        window.UI.toast('タグを追加しました');
      }
      window.UI.closeAddTagModal();
      window.UI.renderTagsManage();
      window.UI.renderSettings();
      renderList();
    });

    // 設定：タグ編集・削除
    document.getElementById('tags-list').addEventListener('click', async e => {
      const editBtn = e.target.closest('.tag-manage-edit');
      const delBtn = e.target.closest('.tag-manage-del');
      const row = e.target.closest('.tag-manage-item');

      if (editBtn) {
        const tag = window.DB.getTags().find(t => t.id === editBtn.dataset.id);
        if (tag) window.UI.openAddTagModal(tag);
        return;
      }

      if (delBtn) {
        if (!await confirmDialog('このタグを削除しますか？')) return;
        window.DB.deleteTag(delBtn.dataset.id);
        window.UI.renderTagsManage();
        renderList();
        window.UI.toast('タグを削除しました');
        return;
      }

      if (row) {
        const tag = window.DB.getTags().find(t => t.id === row.dataset.id);
        if (tag) window.UI.openAddTagModal(tag);
      }
    });

    // エクスポート
    document.getElementById('btn-export').addEventListener('click', () => {
      const data = window.DB.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `visit-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      window.UI.renderSettings();
      window.UI.updateBackupNotice();
      window.UI.toast('バックアップを保存しました');
    });

    // インポート
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!await confirmDialog('現在のデータをすべて上書きしますか？')) return;
          window.DB.importData(data);
          renderList();
          window.UI.renderSettings();
          window.UI.updateBackupNotice();
          window.UI.toast('バックアップから復元しました');
        } catch {
          window.UI.toast('ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // 手動アップデート
    document.getElementById('btn-update').addEventListener('click', () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) {
            reg.update().then(() => {
              if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              } else {
                window.UI.toast('すでに最新バージョンです');
              }
            });
          } else {
            window.UI.toast('Service Workerが見つかりません');
          }
        });
      }
    });

    // 検索
    document.getElementById('search-input').addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      renderList();
    });

    // フィルターバー
    document.getElementById('btn-filter').addEventListener('click', () => {
      const bar = document.getElementById('filter-bar');
      bar.classList.toggle('hidden');
      if (!bar.classList.contains('hidden')) {
        window.UI.renderFilterBar(activeTagIds, toggleTagFilter);
      }
    });

    document.getElementById('btn-filter-clear').addEventListener('click', () => {
      activeTagIds = [];
      document.getElementById('btn-filter-clear').classList.add('hidden');
      window.UI.renderFilterBar(activeTagIds, toggleTagFilter);
      renderList();
    });
  }

  function toggleTagFilter(tagId) {
    const idx = activeTagIds.indexOf(tagId);
    if (idx === -1) activeTagIds.push(tagId);
    else activeTagIds.splice(idx, 1);
    document.getElementById('btn-filter-clear').classList.toggle('hidden', activeTagIds.length === 0);
    window.UI.renderFilterBar(activeTagIds, toggleTagFilter);
    renderList();
  }

  function autoSaveCurrentEntry() {
    const id = document.getElementById('field-id').value;
    if (!id) return false;
    const data = window.UI.getFormData();
    if (!data.address && !data.displayTitle) return false;
    data.visitHistory = window.UI.getVisitHistory();
    window.DB.updateVisit(id, data);
    renderList();
    return true;
  }

  function syncLastVisitFromHistory() {
    const history = window.UI.getVisitHistory();
    const valid = history.filter(item => item && item.date);
    const lastVisitField = document.getElementById('field-last-visit');
    document.querySelectorAll('#time-options .time-chip').forEach(c => c.classList.remove('selected'));

    if (valid.length === 0) {
      lastVisitField.value = '';
      return;
    }

    const latest = valid.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    lastVisitField.value = latest.date;

    if (!latest.absent && latest.time) {
      const chip = document.querySelector(`#time-options .time-chip[data-value="${latest.time}"]`);
      if (chip) chip.classList.add('selected');
    }
  }

  function openMap(address, lat, lng) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(latNum + ',' + lngNum)}`, '_blank');
      return;
    }

    const addr = String(address || '').trim();
    if (!addr) {
      window.UI.toast('マップで開ける場所がありません');
      return;
    }
    const encoded = encodeURIComponent(addr);
    window.open(`https://maps.google.com/?q=${encoded}`, '_blank');
  }

  // ===== カスタム確認ダイアログ =====
  function confirmDialog(message) {
    return new Promise(resolve => {
      const modal = document.getElementById('modal-confirm');
      document.getElementById('confirm-message').textContent = message;
      modal.classList.remove('hidden');
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        modal.classList.add('hidden');
        document.getElementById('btn-confirm-ok').removeEventListener('click', onOk);
        document.getElementById('btn-confirm-cancel').removeEventListener('click', onCancel);
        document.querySelector('#modal-confirm .modal-backdrop').removeEventListener('click', onCancel);
      };
      document.getElementById('btn-confirm-ok').addEventListener('click', onOk);
      document.getElementById('btn-confirm-cancel').addEventListener('click', onCancel);
      document.querySelector('#modal-confirm .modal-backdrop').addEventListener('click', onCancel);
    });
  }

  // ===== Service Worker =====
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then(reg => reg.update())
        .catch(err => console.warn('Service Worker registration failed', err));
    });
  }

  // ===== 旧5件デモの整理 =====
  function migrateLegacyDemoData() {
    const legacyDemoAddresses = new Set([
      '横浜市鶴見区〇〇町1-2-3',
      '横浜市鶴見区△△町3-5',
      '藤沢市〇〇町4-1',
      '横浜市鶴見区◇◇町2-8',
      '鎌倉市〇〇1丁目5-10'
    ]);

    const visits = window.DB.getVisits();
    if (!Array.isArray(visits) || visits.length === 0) return;

    const filtered = visits.filter(v => !legacyDemoAddresses.has(v.address));
    if (filtered.length === visits.length) return;

    window.DB.saveVisits(filtered);
  }

  // ===== サンプルデータ（初回起動時のみ）=====
  function insertDemoData() {
    if (window.DB.getVisits().length > 0) return;
    const today = new Date();
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    const lastVisit = d.toISOString().slice(0, 10);

    window.DB.addVisit({
      address: '【サンプル】横浜市鶴見区〇〇町1-2-3付近',
      displayTitle: '【サンプル】白い門の家',
      placeMemo: '角の家、犬あり。削除可。',
      lat: null,
      lng: null,
      locationSource: '',
      name: 'サンプル訪問先（削除可）',
      gender: '',
      lastVisit,
      lastTime: 'afternoon',
      memo: 'これは初回表示用のサンプルです。実際の訪問先を登録したら、このカードは削除して構いません。',
      tags: []
    });
  }

  init();
})();

// app.js — メインロジック・イベントバインド

(() => {
  let activeTagIds = [];
  let searchQuery = '';

  // ===== 初期化 =====
  function init() {
    // ボタンが無反応になる事故を避けるため、イベント登録を最優先する
    safeRun('bindEvents', bindEvents);
    safeRun('purgeExpiredTrash', () => window.DB.purgeExpiredTrash());
    safeRun('snapshotToIndexedDB', () => window.DB.snapshotToIndexedDB());
    safeRun('updateBackupNotice', () => window.UI.updateBackupNotice());
    safeRun('migrateLegacyDemoData', migrateLegacyDemoData);
    safeRun('insertDemoData', insertDemoData);
    safeRun('renderList', renderList);
    safeRun('registerSW', registerSW);
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

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

  function toNumberOrNull(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function hasLatLng(entry) {
    if (!entry || entry.lat === null || entry.lat === undefined || entry.lng === null || entry.lng === undefined) return false;
    if (String(entry.lat).trim() === '' || String(entry.lng).trim() === '') return false;
    const lat = Number(entry.lat);
    const lng = Number(entry.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  }

  function entryTitle(entry) {
    return (entry.displayTitle || '').trim() || (entry.address || '').trim() || '場所未設定';
  }

  // ===== リストレンダリング =====
  function renderList(visits, tags, searchQuery, activeTagIds) {
    const container = document.getElementById('visit-list');
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));

    let filtered = visits.slice();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        (v.displayTitle || '').toLowerCase().includes(q) ||
        (v.address || '').toLowerCase().includes(q) ||
        (v.name || '').toLowerCase().includes(q) ||
        (v.placeMemo || '').toLowerCase().includes(q) ||
        (v.memo || '').toLowerCase().includes(q)
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
          tagsHtml += `<span class="tag-chip" style="background:${window.hexToRgba(tag.color,0.12)};color:${tag.color}">${escapeHtml(tag.name)}</span>`;
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
        <div class="trash-card-address">${escapeHtml(entryTitle(v))}</div>
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
    document.getElementById('field-display-title').value = entry.displayTitle || '';
    document.getElementById('field-place-memo').value = entry.placeMemo || '';
    document.getElementById('field-lat').value = hasLatLng(entry) ? String(entry.lat) : '';
    document.getElementById('field-lng').value = hasLatLng(entry) ? String(entry.lng) : '';
    document.getElementById('field-location-source').value = entry.locationSource || '';
    updateLocationStatus();

    document.getElementById('field-name').value = entry.name || '';
    document.getElementById('field-gender').value = entry.gender || '';
    document.getElementById('field-last-visit').value = entry.lastVisit || '';
    document.getElementById('field-memo').value = entry.memo || '';

    document.querySelectorAll('#time-options .time-chip').forEach(chip => {
      chip.classList.toggle('selected', chip.dataset.value === entry.lastTime);
    });

    renderSelectedTags(entry.tags || []);
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
      displayTitle: document.getElementById('field-display-title').value.trim(),
      placeMemo: document.getElementById('field-place-memo').value.trim(),
      lat: toNumberOrNull(document.getElementById('field-lat').value),
      lng: toNumberOrNull(document.getElementById('field-lng').value),
      locationSource: document.getElementById('field-location-source').value,
      name: document.getElementById('field-name').value.trim(),
      gender: document.getElementById('field-gender').value,
      lastVisit: document.getElementById('field-last-visit').value,
      lastTime: selectedTime ? selectedTime.dataset.value : '',
      memo: document.getElementById('field-memo').value.trim(),
      tags: getSelectedTagIds()
    };
  }

  // ===== 位置情報 =====
  function getLocationFields() {
    return {
      address: document.getElementById('field-address').value.trim(),
      displayTitle: document.getElementById('field-display-title').value.trim(),
      lat: toNumberOrNull(document.getElementById('field-lat').value),
      lng: toNumberOrNull(document.getElementById('field-lng').value),
      locationSource: document.getElementById('field-location-source').value
    };
  }

  function setLocationFields({ address, lat, lng, source, fillDisplayTitle = true }) {
    const addressField = document.getElementById('field-address');
    const titleField = document.getElementById('field-display-title');

    if (typeof address === 'string' && address.trim()) {
      addressField.value = address.trim();
      if (fillDisplayTitle && !titleField.value.trim()) {
        titleField.value = address.trim();
      }
    }

    document.getElementById('field-lat').value = Number.isFinite(Number(lat)) ? String(Number(lat)) : '';
    document.getElementById('field-lng').value = Number.isFinite(Number(lng)) ? String(Number(lng)) : '';
    document.getElementById('field-location-source').value = source || '';
    updateLocationStatus();
  }

  function clearLocationCoordinates() {
    document.getElementById('field-lat').value = '';
    document.getElementById('field-lng').value = '';
    document.getElementById('field-location-source').value = '';
    updateLocationStatus();
  }

  function updateLocationStatus(message = '') {
    const el = document.getElementById('location-status');
    if (!el) return;
    el.classList.remove('has-location', 'warn');

    if (message) {
      el.textContent = message;
      if (message.includes('失敗') || message.includes('手入力')) el.classList.add('warn');
      return;
    }

    const loc = getLocationFields();
    if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      el.textContent = '座標を保存済みです。ナビは座標を優先して開きます。';
      el.classList.add('has-location');
      return;
    }

    el.textContent = '住所を入力するか、現在地・地図から場所候補を取得できます。';
  }

  function currentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('この端末では位置情報を取得できません'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: options.timeout || 15000,
        maximumAge: 0
      });
    });
  }

  async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=ja`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('住所候補を取得できませんでした');
    const data = await res.json();
    const readable = buildReadableAddress(data);
    if (!readable) throw new Error('住所候補が空でした');
    return readable;
  }

  function buildReadableAddress(data) {
    if (!data) return '';
    const a = data.address || {};
    const parts = [
      a.province || a.state,
      a.city || a.town || a.village || a.municipality,
      a.city_district || a.borough || a.ward || a.suburb,
      a.neighbourhood || a.quarter,
      a.road,
      a.house_number
    ].filter(Boolean);

    const uniqueParts = [];
    parts.forEach(part => {
      if (!uniqueParts.includes(part)) uniqueParts.push(part);
    });

    if (uniqueParts.length >= 2) return uniqueParts.join('');
    if (data.display_name) return String(data.display_name).split(',').slice(0, 5).map(s => s.trim()).join(' ');
    return '';
  }

  async function useCurrentLocation() {
    try {
      updateLocationStatus('現在地を取得しています。');
      const pos = await currentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      updateLocationStatus('住所候補を取得しています。');
      let address = '';
      try {
        address = await reverseGeocode(lat, lng);
      } catch (err) {
        console.warn('reverse geocode failed', err);
      }

      if (address) {
        setLocationFields({ address, lat, lng, source: 'current' });
        toast('現在地から場所を入力しました');
      } else {
        setLocationFields({ lat, lng, source: 'current', fillDisplayTitle: false });
        updateLocationStatus('座標は保存しました。住所候補の取得に失敗したため、場所・住所を手入力してください。');
        toast('座標を保存しました');
      }
    } catch (err) {
      console.warn('geolocation failed', err);
      updateLocationStatus('現在地の取得に失敗しました。位置情報の許可を確認してください。');
      toast('現在地を取得できませんでした');
    }
  }

  // ===== 地図ピッカー =====
  let locationMap = null;
  let locationMarker = null;
  let pickedLocation = null;
  let pickedAddress = '';
  let reverseRequestId = 0;

  function openLocationPicker() {
    const modal = document.getElementById('modal-location-picker');
    modal.classList.remove('hidden');

    if (!window.L) {
      document.getElementById('location-picker-status').textContent = '地図ライブラリを読み込めませんでした。通信状況を確認してください。';
      return;
    }

    const loc = getLocationFields();
    const startLat = Number.isFinite(loc.lat) ? loc.lat : 35.5086;
    const startLng = Number.isFinite(loc.lng) ? loc.lng : 139.6824;
    pickedLocation = { lat: startLat, lng: startLng };
    pickedAddress = loc.address || '';

    setTimeout(() => {
      ensureLocationMap(startLat, startLng);
      setPickedLocation(startLat, startLng, false);
      if (locationMap) locationMap.invalidateSize();
    }, 80);
  }

  function closeLocationPicker() {
    document.getElementById('modal-location-picker').classList.add('hidden');
  }

  function ensureLocationMap(lat, lng) {
    if (locationMap) {
      locationMap.setView([lat, lng], 17);
      return;
    }

    locationMap = window.L.map('location-map', {
      zoomControl: true,
      attributionControl: true
    }).setView([lat, lng], 17);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(locationMap);

    locationMarker = window.L.marker([lat, lng], { draggable: true }).addTo(locationMap);

    locationMap.on('click', e => {
      setPickedLocation(e.latlng.lat, e.latlng.lng, true);
    });

    locationMarker.on('dragend', () => {
      const ll = locationMarker.getLatLng();
      setPickedLocation(ll.lat, ll.lng, true);
    });
  }

  function setPickedLocation(lat, lng, shouldReverse) {
    pickedLocation = { lat, lng };
    if (locationMarker) locationMarker.setLatLng([lat, lng]);
    if (locationMap) locationMap.setView([lat, lng], locationMap.getZoom() || 17);

    const status = document.getElementById('location-picker-status');
    if (!shouldReverse) {
      status.textContent = pickedAddress || '地図をタップして場所を選んでください。';
      return;
    }

    const requestId = ++reverseRequestId;
    pickedAddress = '';
    status.textContent = '住所候補を取得しています。';

    reverseGeocode(lat, lng)
      .then(address => {
        if (requestId !== reverseRequestId) return;
        pickedAddress = address;
        status.textContent = `住所候補：${address}`;
      })
      .catch(err => {
        if (requestId !== reverseRequestId) return;
        console.warn('picker reverse geocode failed', err);
        status.textContent = '住所候補を取得できませんでした。この場所を使う場合は、保存後に場所・住所を手入力してください。';
      });
  }

  async function movePickerToCurrentLocation() {
    try {
      const status = document.getElementById('location-picker-status');
      status.textContent = '現在地を取得しています。';
      const pos = await currentPosition();
      setPickedLocation(pos.coords.latitude, pos.coords.longitude, true);
    } catch (err) {
      console.warn('picker geolocation failed', err);
      toast('現在地を取得できませんでした');
    }
  }

  async function usePickedLocation() {
    if (!pickedLocation) {
      toast('地図で場所を選んでください');
      return;
    }

    let address = pickedAddress;
    if (!address) {
      try {
        address = await reverseGeocode(pickedLocation.lat, pickedLocation.lng);
      } catch (err) {
        console.warn('use picked reverse geocode failed', err);
      }
    }

    if (address) {
      setLocationFields({ address, lat: pickedLocation.lat, lng: pickedLocation.lng, source: 'pin' });
      toast('地図から場所を入力しました');
    } else {
      setLocationFields({ lat: pickedLocation.lat, lng: pickedLocation.lng, source: 'pin', fillDisplayTitle: false });
      updateLocationStatus('座標は保存しました。住所候補の取得に失敗したため、場所・住所を手入力してください。');
      toast('座標を保存しました');
    }
    closeLocationPicker();
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

    const metVisitCountMap = new Map();
    visitHistory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.absent)
      .sort((a, b) => {
        const da = new Date(a.item.date).getTime();
        const db = new Date(b.item.date).getTime();
        if (da !== db) return da - db;
        return a.index - b.index;
      })
      .forEach(({ index }, order) => {
        metVisitCountMap.set(index, order + 1);
      });

    const sorted = visitHistory
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const da = new Date(b.item.date).getTime();
        const db = new Date(a.item.date).getTime();
        if (da !== db) return da - db;
        return b.index - a.index;
      });

    sorted.forEach(({ item, index }) => {
      const el = document.createElement('div');
      const metVisitCount = metVisitCountMap.get(index);
      el.className = 'history-item' + (item.absent ? ' absent' : ' met');
      el.innerHTML = `
        <div class="history-item-main">
          ${metVisitCount ? `<div class="history-label-row"><span class="history-count-badge">${metVisitCount}回目</span></div>` : ''}
          <div class="history-item-top">
            <span class="history-date">${item.absent ? '🚪 ' : ''}${window.formatDate(item.date)}</span>
            <span class="history-time">${item.absent ? '不在' : (window.timeLabel(item.time) || '時間帯未設定')}</span>
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
    getLocationFields, setLocationFields, clearLocationCoordinates, updateLocationStatus,
    useCurrentLocation, openLocationPicker, closeLocationPicker, movePickerToCurrentLocation, usePickedLocation,
    renderSelectedTags, getSelectedTagIds,
    openTagPicker, closeTagPicker,
    renderVisitHistory, getVisitHistory, openVisitModal, closeVisitModal,
    getVisitFormData, openAbsentModal, closeAbsentModal, getAbsentFormData,
    saveVisitHistoryItem, deleteVisitHistoryItem,
    openAddTagModal, closeAddTagModal, getNewTagData, getEditingTagId,
    updateBackupNotice, renderFilterBar
  };
})();

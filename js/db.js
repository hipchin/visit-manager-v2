// db.js — データ永続化レイヤー
// localStorage をメインストレージとして使用
// IndexedDB にスナップショットを保存（起動後に遅延実行）
//
// 2026-07-18 起動高速化:
// - localStorageの同一JSONを起動中に何度もJSON.parseしない
// - メモリキャッシュは永続化形式を変更しない
// - 保存、インポート、削除、復元時には必ずキャッシュも同期する

window.DB = (() => {
  const KEYS = {
    visits: 'vm_visits',
    trash: 'vm_trash',
    tags: 'vm_tags',
    backupDate: 'vm_backup_date',
    version: 'vm_version'
  };

  // version.json、app.jsのAPP_BUILD_IDと揃えて更新する。
  const APP_VERSION = '1.0.12';

  const UNLOADED = Symbol('unloaded');
  let visitsCache = UNLOADED;
  let trashCache = UNLOADED;
  let tagsCache = UNLOADED;
  let backupDateCache = UNLOADED;

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('localStorage load failed:', key, err);
      return fallback;
    }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('localStorage save failed:', key, err);
      throw err;
    }
  }

  function asArray(value, fallback = []) {
    return Array.isArray(value) ? value : fallback;
  }

  function normalizeVisit(entry) {
    const normalized = entry && typeof entry === 'object' ? { ...entry } : {};

    if (normalized.displayTitle == null) normalized.displayTitle = '';
    if (normalized.placeMemo == null) normalized.placeMemo = '';
    if (normalized.locationSource == null) normalized.locationSource = '';

    // 空欄やnullを0へ変換しない。既存の0,0はアプリ側で無効座標として扱う。
    const rawLat = normalized.lat;
    const rawLng = normalized.lng;
    const lat = rawLat === null || rawLat === undefined || String(rawLat).trim() === ''
      ? NaN
      : Number(rawLat);
    const lng = rawLng === null || rawLng === undefined || String(rawLng).trim() === ''
      ? NaN
      : Number(rawLng);

    normalized.lat = Number.isFinite(lat) ? lat : null;
    normalized.lng = Number.isFinite(lng) ? lng : null;

    return normalized;
  }

  function normalizeVisits(value) {
    return asArray(value).map(normalizeVisit);
  }

  function normalizeTags(value) {
    const fallback = [
      { id: 'tag_1', name: 'エリア', color: '#2563eb' },
      { id: 'tag_2', name: '手応えあり', color: '#16a34a' },
      { id: 'tag_3', name: '要フォロー', color: '#d97706' }
    ];
    return Array.isArray(value) ? value.map(tag => ({ ...tag })) : fallback;
  }

  function ensureVisitsLoaded() {
    if (visitsCache === UNLOADED) {
      visitsCache = normalizeVisits(load(KEYS.visits, []));
    }
    return visitsCache;
  }

  function ensureTrashLoaded() {
    if (trashCache === UNLOADED) {
      trashCache = normalizeVisits(load(KEYS.trash, []));
    }
    return trashCache;
  }

  function ensureTagsLoaded() {
    if (tagsCache === UNLOADED) {
      tagsCache = normalizeTags(load(KEYS.tags, null));
    }
    return tagsCache;
  }

  function getVisits() {
    // 配列自体は複製し、UI側のsortやspliceがキャッシュ本体へ影響しないようにする。
    return ensureVisitsLoaded().slice();
  }

  function saveVisits(visits) {
    const normalized = normalizeVisits(visits);
    save(KEYS.visits, normalized);
    visitsCache = normalized;
  }

  function addVisit(entry) {
    const visits = getVisits();
    const normalized = normalizeVisit(entry);
    normalized.id = normalized.id || Date.now().toString(36) + Math.random().toString(36).slice(2);
    normalized.createdAt = normalized.createdAt || new Date().toISOString();
    normalized.updatedAt = new Date().toISOString();
    visits.push(normalized);
    saveVisits(visits);
    return normalized;
  }

  function updateVisit(id, patch) {
    const visits = getVisits();
    const idx = visits.findIndex(v => v.id === id);
    if (idx === -1) return null;
    visits[idx] = normalizeVisit({ ...visits[idx], ...patch, updatedAt: new Date().toISOString() });
    saveVisits(visits);
    return visits[idx];
  }

  function getVisitById(id) {
    return ensureVisitsLoaded().find(v => v.id === id) || null;
  }

  // trash
  function getTrash() {
    return ensureTrashLoaded().slice();
  }

  function saveTrash(trash) {
    const normalized = normalizeVisits(trash);
    save(KEYS.trash, normalized);
    trashCache = normalized;
  }

  function moveToTrash(id) {
    const visits = getVisits();
    const idx = visits.findIndex(v => v.id === id);
    if (idx === -1) return;
    const [entry] = visits.splice(idx, 1);
    entry.deletedAt = new Date().toISOString();
    const trash = getTrash();
    trash.push(entry);
    saveVisits(visits);
    saveTrash(trash);
  }

  function restoreFromTrash(id) {
    const trash = getTrash();
    const idx = trash.findIndex(v => v.id === id);
    if (idx === -1) return;
    const [entry] = trash.splice(idx, 1);
    delete entry.deletedAt;
    const visits = getVisits();
    visits.push(entry);
    saveTrash(trash);
    saveVisits(visits);
  }

  function purgeExpiredTrash() {
    const trash = getTrash();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = trash.filter(v => new Date(v.deletedAt).getTime() > cutoff);
    saveTrash(filtered);
  }

  // tags
  function getTags() {
    return ensureTagsLoaded().slice();
  }

  function saveTags(tags) {
    const normalized = normalizeTags(tags);
    save(KEYS.tags, normalized);
    tagsCache = normalized;
  }

  function addTag(tag) {
    const tags = getTags();
    const newTag = { ...tag, id: 'tag_' + Date.now().toString(36) };
    tags.push(newTag);
    saveTags(tags);
    return newTag;
  }

  function updateTag(id, patch) {
    const tags = getTags();
    const idx = tags.findIndex(t => t.id === id);
    if (idx === -1) return null;
    tags[idx] = {
      ...tags[idx],
      name: patch.name || tags[idx].name,
      color: patch.color || tags[idx].color
    };
    saveTags(tags);
    return tags[idx];
  }

  function deleteTag(id) {
    const tags = getTags().filter(t => t.id !== id);
    saveTags(tags);

    // visitからも除去
    const visits = getVisits();
    visits.forEach(v => {
      if (v.tags) v.tags = v.tags.filter(tid => tid !== id);
    });
    saveVisits(visits);
  }

  // backup
  function getBackupDate() {
    if (backupDateCache === UNLOADED) {
      backupDateCache = load(KEYS.backupDate, null);
    }
    return backupDateCache;
  }

  function setBackupDate(d) {
    const value = d || new Date().toISOString();
    save(KEYS.backupDate, value);
    backupDateCache = value;
  }

  function getAllData() {
    return {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      visits: getVisits(),
      trash: getTrash(),
      tags: getTags()
    };
  }

  // export / import
  function exportData(markBackup = true) {
    const data = getAllData();
    if (markBackup) setBackupDate(data.exportedAt);
    return data;
  }

  function importData(data) {
    if (!data || !Array.isArray(data.visits)) throw new Error('不正なデータ形式です');
    saveVisits(data.visits);
    saveTrash(Array.isArray(data.trash) ? data.trash : []);
    if (Array.isArray(data.tags)) saveTags(data.tags);
    setBackupDate(data.exportedAt || null);
  }

  // IndexedDB スナップショット（起動後に app.js から遅延実行）
  function snapshotToIndexedDB() {
    if (!window.indexedDB) return;

    const req = indexedDB.open('visit_manager_snap', 1);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'id' });
      }
    };

    req.onsuccess = e => {
      try {
        const db = e.target.result;
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        store.put({
          id: 'latest',
          data: getAllData(),
          savedAt: new Date().toISOString()
        });
        tx.oncomplete = () => db.close();
        tx.onerror = err => console.warn('IndexedDB transaction failed', err);
      } catch (err) {
        console.warn('IndexedDB snapshot failed', err);
      }
    };

    req.onerror = e => {
      console.warn('IndexedDB open failed', e);
    };
  }

  function getVersion() {
    return APP_VERSION;
  }

  return {
    getVisits, saveVisits, addVisit, updateVisit, getVisitById,
    getTrash, moveToTrash, restoreFromTrash, purgeExpiredTrash,
    getTags, saveTags, addTag, updateTag, deleteTag,
    getBackupDate, setBackupDate,
    exportData, importData,
    snapshotToIndexedDB,
    getVersion
  };
})();

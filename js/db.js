// db.js — データ永続化レイヤー
// localStorage をメインストレージとして使用
// IndexedDB にスナップショットを保存（起動時自動）

window.DB = (() => {
  const KEYS = {
    visits: 'vm_visits',
    trash: 'vm_trash',
    tags: 'vm_tags',
    backupDate: 'vm_backup_date',
    version: 'vm_version'
  };

  const APP_VERSION = '1.0.6';

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

  // visits
  function asArray(value, fallback = []) {
    return Array.isArray(value) ? value : fallback;
  }

  function normalizeTags(value) {
    const fallback = [
      { id: 'tag_1', name: 'エリア', color: '#2563eb' },
      { id: 'tag_2', name: '手応えあり', color: '#16a34a' },
      { id: 'tag_3', name: '要フォロー', color: '#d97706' }
    ];
    return Array.isArray(value) ? value : fallback;
  }

  function getVisits() { return asArray(load(KEYS.visits, [])); }
  function saveVisits(visits) { save(KEYS.visits, asArray(visits)); }

  function addVisit(entry) {
    const visits = getVisits();
    entry.id = entry.id || Date.now().toString(36) + Math.random().toString(36).slice(2);
    entry.createdAt = entry.createdAt || new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    visits.push(entry);
    saveVisits(visits);
    return entry;
  }

  function updateVisit(id, patch) {
    const visits = getVisits();
    const idx = visits.findIndex(v => v.id === id);
    if (idx === -1) return null;
    visits[idx] = { ...visits[idx], ...patch, updatedAt: new Date().toISOString() };
    saveVisits(visits);
    return visits[idx];
  }

  function getVisitById(id) {
    return getVisits().find(v => v.id === id) || null;
  }

  // trash
  function getTrash() { return asArray(load(KEYS.trash, [])); }
  function saveTrash(trash) { save(KEYS.trash, asArray(trash)); }

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
    return normalizeTags(load(KEYS.tags, null));
  }
  function saveTags(tags) { save(KEYS.tags, normalizeTags(tags)); }

  function addTag(tag) {
    const tags = getTags();
    tag.id = 'tag_' + Date.now().toString(36);
    tags.push(tag);
    saveTags(tags);
    return tag;
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
  function getBackupDate() { return load(KEYS.backupDate, null); }
  function setBackupDate(d) { save(KEYS.backupDate, d || new Date().toISOString()); }

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
  function exportData() {
    const data = getAllData();
    setBackupDate(data.exportedAt);
    return data;
  }

  function importData(data) {
    if (!data || !Array.isArray(data.visits)) throw new Error('不正なデータ形式です');
    saveVisits(data.visits);
    saveTrash(Array.isArray(data.trash) ? data.trash : []);
    if (Array.isArray(data.tags)) saveTags(data.tags);
    setBackupDate(data.exportedAt || null);
  }

  // IndexedDB スナップショット（起動時自動）
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

  function getVersion() { return APP_VERSION; }

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

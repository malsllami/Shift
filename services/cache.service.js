/**
 * cache.service.js
 * تخزين محلي عبر IndexedDB لمزامنة تزايدية (نسخة الجدول + رقم إصدارها)،
 * وتخزين آمن نسبيًا للأسرار المحلية (رمز تفعيل الجهاز الخام لقفل
 * البصمة) — لا شيء من هذا يُرسَل للخادم إلا عند الحاجة الصريحة.
 */

const DB_NAME = 'شفتات_تخزين_محلي';
const STORE_TABLES = 'جداول';
const STORE_SECRETS = 'اسرار';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TABLES)) db.createObjectStore(STORE_TABLES);
      if (!db.objectStoreNames.contains(STORE_SECRETS)) db.createObjectStore(STORE_SECRETS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function idbGet(storeName, key) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(storeName, key, value) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function idbDelete(storeName, key) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

// ---------- كاش جداول البيانات (نسخة + محتوى) ----------
export function getCachedTable(tableName) { return idbGet(STORE_TABLES, tableName); }
export function setCachedTable(tableName, version, data) {
  return idbSet(STORE_TABLES, tableName, { version, data, ts: Date.now() });
}

// ---------- أسرار محلية (رمز تفعيل الجهاز الخام) ----------
export function getLocalSecret(key) { return idbGet(STORE_SECRETS, key); }
export function setLocalSecret(key, value) { return idbSet(STORE_SECRETS, key, value); }
export function deleteLocalSecret(key) { return idbDelete(STORE_SECRETS, key); }

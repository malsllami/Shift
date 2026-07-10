/**
 * Cache.gs
 * ------------------------------------------------------------------
 * طبقة تخزين مؤقت من 3 مستويات (نفس نمط مشروع "خرائط المحطات"):
 *   1) كاش الطلب نفسه (متغيّر عام يعيش فقط أثناء تنفيذ doGet/doPost الحالي)
 *   2) CacheService.getScriptCache() — TTL≈300 ثانية، مع تقسيم الأجزاء
 *      (Chunking) لتفادي حد 100KB لكل مفتاح.
 *   3) الشيت نفسه (يُقرأ فقط عند غياب الكاش تمامًا).
 * بالإضافة لنظام "رقم إصدار البيانات" لكل جدول لدعم المزامنة التزايدية
 * من طرف العميل، وإبطال فوري (Lazy) عند أي كتابة.
 * ------------------------------------------------------------------
 */

var CACHE_TTL_SECONDS = 300;
var CACHE_CHUNK_CHARS = 40000; // هامش أمان آمن لحد 100KB مهما كان ترميز المحتوى

// كاش الطلب: كائن عام يُعاد تصفيره تلقائيًا مع كل تنفيذ جديد لـ doGet/doPost
var _requestCache = {};

// ============================================================
// قراءة/كتابة/إبطال جدول كامل من الكاش
// ============================================================

function cacheGetTable_(tableName) {
  if (Object.prototype.hasOwnProperty.call(_requestCache, tableName)) {
    return _requestCache[tableName];
  }
  var cache = CacheService.getScriptCache();
  var metaRaw = cache.get(tableName + '__meta');
  if (!metaRaw) return null;

  var meta;
  try { meta = JSON.parse(metaRaw); } catch (e) { return null; }

  var keys = [];
  for (var i = 0; i < meta.count; i++) keys.push(tableName + '__' + i);
  var parts = cache.getAll(keys);

  var chunks = [];
  for (var j = 0; j < meta.count; j++) {
    var k = tableName + '__' + j;
    if (!parts[k]) return null; // جزء ناقص = اعتبار الكاش كله غير صالح
    chunks.push(parts[k]);
  }

  var data;
  try { data = JSON.parse(chunks.join('')); } catch (e2) { return null; }
  _requestCache[tableName] = data;
  return data;
}

function cacheSetTable_(tableName, data) {
  var json = JSON.stringify(data);
  var chunks = [];
  for (var i = 0; i < json.length; i += CACHE_CHUNK_CHARS) {
    chunks.push(json.substring(i, i + CACHE_CHUNK_CHARS));
  }

  var payload = {};
  payload[tableName + '__meta'] = JSON.stringify({ count: chunks.length });
  chunks.forEach(function (c, i) { payload[tableName + '__' + i] = c; });

  CacheService.getScriptCache().putAll(payload, CACHE_TTL_SECONDS);
  _requestCache[tableName] = data;
}

function cacheInvalidateTable_(tableName) {
  var cache = CacheService.getScriptCache();
  var metaKey = tableName + '__meta';
  var metaRaw = cache.get(metaKey);
  var keysToRemove = [metaKey];

  if (metaRaw) {
    try {
      var meta = JSON.parse(metaRaw);
      for (var i = 0; i < meta.count; i++) keysToRemove.push(tableName + '__' + i);
    } catch (e) { /* تجاهل، سيُحذف مفتاح meta فقط */ }
  }

  cache.removeAll(keysToRemove);
  delete _requestCache[tableName];
}

/**
 * قراءة جدول بأسلوب Cache-first: يعيد النسخة المخزّنة إن وُجدت،
 * وإلا يستدعي loaderFn() (قراءة فعلية من الشيت) ثم يخزّن النتيجة.
 */
function readTableCached(tableName, loaderFn) {
  var cached = cacheGetTable_(tableName);
  if (cached !== null) return cached;
  var fresh = loaderFn();
  cacheSetTable_(tableName, fresh);
  return fresh;
}

/** يجب استدعاؤها في نهاية كل دالة كتابة تمسّ tableName */
function invalidateAfterWrite(tableName) {
  cacheInvalidateTable_(tableName);
  bumpDataVersion(tableName);
}

// ============================================================
// رقم إصدار البيانات (Data Version) — لكل جدول، في Script Properties
// ============================================================

function getDataVersion(tableName) {
  var v = PropertiesService.getScriptProperties().getProperty('VER_' + tableName);
  return parseInt(v || '0', 10);
}

function bumpDataVersion(tableName) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'VER_' + tableName;
    var v = parseInt(props.getProperty(key) || '0', 10) + 1;
    props.setProperty(key, String(v));
    return v;
  } finally {
    lock.releaseLock();
  }
}

/** نقطة API خفيفة: إصدارات كل الجداول المطلوبة دفعة واحدة، بدون لمس أي شيت */
function getAllDataVersions(tableNames) {
  var props = PropertiesService.getScriptProperties();
  var out = {};
  tableNames.forEach(function (t) {
    out[t] = parseInt(props.getProperty('VER_' + t) || '0', 10);
  });
  return out;
}

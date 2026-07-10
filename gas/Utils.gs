/**
 * Utils.gs
 * ------------------------------------------------------------------
 * أدوات عامة عابرة لكل الملفات: أرقام عربي/إنجليزي، تحويل ميلادي/هجري
 * (Tabular Islamic تقريبي، حسب موافقة محمد)، ترقيم طلبات تسلسلي آمن،
 * استجابة API موحدة، والوصول لمعرّفات الملفات (الرئيسي + الجسور)
 * المخزّنة في Script Properties.
 * ------------------------------------------------------------------
 */

// ============================================================
// الوصول للملفات (Script Properties)
// ============================================================

var PROP_MAIN_SPREADSHEET_ID = 'MAIN_SPREADSHEET_ID';

function getMainSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_MAIN_SPREADSHEET_ID);
  if (!id) throw new Error('لم يتم تهيئة النظام بعد. شغّل دالة تهيئة_النظام_الكامل() أولًا من Setup.gs');
  return id;
}

function getMainSpreadsheet() {
  return SpreadsheetApp.openById(getMainSpreadsheetId_());
}

function getSheet(tableName) {
  var sheet = getMainSpreadsheet().getSheetByName(tableName);
  if (!sheet) throw new Error('التبويب غير موجود: ' + tableName);
  return sheet;
}

function getBridgeSpreadsheetId_(bridgeKey) {
  var propKey = BRIDGES[bridgeKey].propKey;
  var id = PropertiesService.getScriptProperties().getProperty(propKey);
  if (!id) throw new Error('ملف الجسر غير مُهيَّأ بعد: ' + bridgeKey);
  return id;
}

function getBridgeSpreadsheet(bridgeKey) {
  return SpreadsheetApp.openById(getBridgeSpreadsheetId_(bridgeKey));
}

// ============================================================
// تحويل الأرقام العربية إلى إنجليزية (يُطبَّق قبل أي حفظ)
// ============================================================

var ARABIC_INDIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

function digitsToEnglish(value) {
  if (value === null || value === undefined) return value;
  var str = String(value);
  var out = '';
  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    var idx = ARABIC_INDIC_DIGITS.indexOf(ch);
    out += (idx > -1) ? String(idx) : ch;
  }
  return out;
}

/** يطبّق تحويل الأرقام على كل الخصائص النصية لكائن طلب وارد من الواجهة */
function normalizeIncomingParams(params) {
  var out = {};
  Object.keys(params || {}).forEach(function (key) {
    var v = params[key];
    out[key] = (typeof v === 'string') ? digitsToEnglish(v) : v;
  });
  return out;
}

// ============================================================
// تواريخ: تنسيق، فروقات، اليوم
// ============================================================

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

function todayDateObj_() {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayISO() {
  var d = todayDateObj_();
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate());
}

function toISODate(val) {
  if (!val) return '';
  var d = (val instanceof Date) ? val : new Date(digitsToEnglish(val));
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate());
}

function daysBetween(fromISO, toISO) {
  var a = new Date(fromISO); a.setHours(0, 0, 0, 0);
  var b = new Date(toISO);   b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

function daysLeftUntil(dateVal) {
  if (!dateVal) return null;
  var iso = toISODate(dateVal);
  if (!iso) return null;
  return daysBetween(todayISO(), iso);
}

// ============================================================
// التقويم الهجري (Tabular Islamic تقريبي — حساب رياضي بدون خدمة خارجية)
// ------------------------------------------------------------
// معايَر على التاريخ المرجعي في وثيقة المتطلبات: 10/07/2026م = 25/01/1448هـ
// نقطة الأساس (Epoch) = 1948439 (تقويم Tabular Islamic، نمط "civil").
// أي انحراف يظهر مستقبلًا عن الإعلان الرسمي يُصحَّح عبر إعداد
// "تصحيح_التقويم_الهجري_بالأيام" في تبويب الإعدادات، بدون تعديل الكود.
// ============================================================

var HIJRI_TABULAR_EPOCH = 1948439;

var HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

var GREGORIAN_MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function gregorianToJDN_(y, m, d) {
  var a = Math.floor((14 - m) / 12);
  var y2 = y + 4800 - a;
  var m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 +
         Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

function jdnToIslamicTabular_(jdn, correctionDays) {
  var epoch = HIJRI_TABULAR_EPOCH - (correctionDays || 0);
  var l = jdn - epoch + 10632;
  var n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
          Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
          Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  var month = Math.floor((24 * l) / 709);
  var day = l - Math.floor((709 * month) / 24);
  var year = 30 * n + j - 30;
  return { year: year, month: month, day: day };
}

/**
 * يحوّل تاريخًا ميلاديًا (Date أو ISO string) إلى نص هجري "يوم شهر سنة".
 * correctionDays: عدد أيام التصحيح من الإعدادات (0 افتراضيًا).
 */
function toHijriString(dateVal, correctionDays) {
  var iso = toISODate(dateVal);
  if (!iso) return '';
  var parts = iso.split('-');
  var jdn = gregorianToJDN_(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10));
  var h = jdnToIslamicTabular_(jdn, correctionDays);
  var monthName = HIJRI_MONTHS_AR[h.month - 1] || '';
  return h.day + ' ' + monthName + ' ' + h.year + 'هـ';
}

function toGregorianString(dateVal) {
  var iso = toISODate(dateVal);
  if (!iso) return '';
  var parts = iso.split('-');
  var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  return d + ' ' + GREGORIAN_MONTHS_AR[m - 1] + ' ' + y + 'م';
}

/** يرجع كائنًا يحوي كلا التقويمين لعرضهما معًا في الواجهة كما تطلب القاعدة */
function bothCalendars(dateVal, correctionDays) {
  return {
    ميلادي: toISODate(dateVal),
    ميلاديـنص: toGregorianString(dateVal),
    هجري: toHijriString(dateVal, correctionDays)
  };
}

// ============================================================
// ترقيم الطلبات التسلسلي الآمن (LV/OT/TR/LOG) — تسلسل دائم للأبد
// ============================================================

function nextSequenceNumber(prefix) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'SEQ_' + prefix;
    var current = parseInt(props.getProperty(key) || '0', 10) + 1;
    props.setProperty(key, String(current));
    return prefix + String(current).padStart(6, '0');
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// استجابة API موحدة
// ============================================================

function jsonOk(data, extra) {
  var body = Object.assign({ نجاح: true, بيانات: data }, extra || {});
  return ContentService.createTextOutput(JSON.stringify(body))
                        .setMimeType(ContentService.MimeType.JSON);
}

function jsonFail(errorCode, message) {
  var body = { نجاح: false, رمز_الخطأ: errorCode, رسالة: message || errorCode };
  return ContentService.createTextOutput(JSON.stringify(body))
                        .setMimeType(ContentService.MimeType.JSON);
}

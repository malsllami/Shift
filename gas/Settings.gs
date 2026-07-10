/**
 * Settings.gs
 * ------------------------------------------------------------------
 * القراءة/الكتابة لتبويب "الإعدادات". هذا الجدول يُقرأ من كل ملف تقريبًا
 * (رموز الدخول، الألوان، القوالب، مواضع دورة الورديات...) لذا هو أول
 * مرشح للكاش — يُقرأ من Cache.gs دائمًا وليس من الشيت مباشرة.
 * ------------------------------------------------------------------
 */

/** يرجع كل الإعدادات كخريطة {المفتاح: القيمة} — Cache-first */
function loadSettingsMap() {
  var rows = readTableCached(TABS.SETTINGS, function () {
    return getSheet(TABS.SETTINGS).getDataRange().getValues();
  });

  var map = {};
  var kCol = COL(TABS.SETTINGS, 'المفتاح');
  var vCol = COL(TABS.SETTINGS, 'القيمة');
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][kCol]) map[rows[i][kCol]] = rows[i][vCol];
  }
  return map;
}

function getSetting(key, fallback) {
  var map = loadSettingsMap();
  return (map[key] !== undefined && map[key] !== '') ? map[key] : fallback;
}

function getSettingInt(key, fallback) {
  var v = getSetting(key, null);
  var n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

/** يُستدعى فقط من _getSettings (مدير النظام فقط) — عرض كامل الجدول للوحة الإعدادات */
function _getSettings(auth) {
  if (!_hasRole(auth, 'مدير')) return jsonFail('forbidden', 'صلاحية المدير فقط');
  var rows = getSheet(TABS.SETTINGS).getDataRange().getValues();
  var cols = COLUMNS[TABS.SETTINGS];
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][COL(TABS.SETTINGS, 'المفتاح')]) continue;
    var obj = {};
    cols.forEach(function (c, idx) { obj[c] = rows[i][idx]; });
    list.push(obj);
  }
  return jsonOk(list);
}

/**
 * تحديث مجموعة إعدادات (مدير النظام فقط). updates: {المفتاح: القيمة الجديدة}
 * إضافة فقط: إن لم يوجد المفتاح يُضاف كصف جديد، لا يُحذف أي صف قائم أبدًا.
 */
function _updateSettings(p, auth) {
  if (!_hasRole(auth, 'مدير')) return jsonFail('forbidden', 'صلاحية المدير فقط');

  var updates;
  try { updates = JSON.parse(p.settings); } catch (e) { return jsonFail('bad_input', 'صيغة غير صحيحة'); }

  var sheet = getSheet(TABS.SETTINGS);
  var rows = sheet.getDataRange().getValues();
  var kCol = COL(TABS.SETTINGS, 'المفتاح');
  var vCol = COL(TABS.SETTINGS, 'القيمة');
  var byCol = COL(TABS.SETTINGS, 'آخر تعديل بواسطة');
  var mgCol = COL(TABS.SETTINGS, 'تاريخ آخر تعديل ميلادي');
  var hjCol = COL(TABS.SETTINGS, 'تاريخ آخر تعديل هجري');
  var today = todayISO();
  var correction = getSettingInt('تصحيح_التقويم_الهجري_بالأيام', 0);
  var todayHijri = toHijriString(today, correction);

  Object.keys(updates).forEach(function (key) {
    var value = digitsToEnglish(updates[key]);
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][kCol] === key) {
        sheet.getRange(i + 1, vCol + 1).setValue(value);
        sheet.getRange(i + 1, byCol + 1).setValue(auth.empId);
        sheet.getRange(i + 1, mgCol + 1).setValue(today);
        sheet.getRange(i + 1, hjCol + 1).setValue(todayHijri);
        found = true;
        break;
      }
    }
    if (!found) {
      var row = new Array(COL_COUNT(TABS.SETTINGS)).fill('');
      row[COL(TABS.SETTINGS, 'القسم')] = 'مخصص';
      row[kCol] = key;
      row[vCol] = value;
      row[COL(TABS.SETTINGS, 'الحالة')] = 'فعّال';
      row[byCol] = auth.empId;
      row[mgCol] = today;
      row[hjCol] = todayHijri;
      sheet.appendRow(row);
    }
  });

  invalidateAfterWrite(TABS.SETTINGS);
  return jsonOk(null, { رسالة: 'تم حفظ الإعدادات' });
}

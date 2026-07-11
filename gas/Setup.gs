/**
 * Setup.gs
 * ------------------------------------------------------------------
 * التهيئة الأولية فقط. يُشغَّل يدويًا مرة واحدة من محرر Apps Script
 * (اختر الدالة تهيئة_النظام_الكامل ثم Run). Idempotent بالكامل:
 * لا يحذف ولا يعيد إنشاء أي جدول أو بيانات موجودة مسبقًا.
 * أي إضافة مستقبلية لجدول/عمود جديد تكون بدالة مستقلة جديدة، وليس
 * بتعديل هذه الدالة (قاعدة "إضافة فقط").
 * ------------------------------------------------------------------
 */

var CLR = {
  HEADER: '#0066B3',   // أزرق البراند
  HEADER_TEXT: '#FFFFFF',
  BORDER: '#B3D1F0'
};

/**
 * نقطة الدخول الوحيدة للتهيئة. شغّلها يدويًا من محرر Apps Script.
 */
function تهيئة_النظام_الكامل() {
  var ss = _getOrCreateMainSpreadsheet_();
  _ensureAllMainTabs_(ss);
  _writeDefaultSettings_(ss);
  _getOrCreateAllBridges_();
  _removeLeftoverDefaultSheets_(ss);
  SpreadsheetApp.flush();
  Logger.log('تمت التهيئة. معرف الملف الرئيسي: ' + ss.getId());
  return 'تمت التهيئة بنجاح';
}

// ============================================================
// الملف الرئيسي
// ============================================================

function _getOrCreateMainSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(PROP_MAIN_SPREADSHEET_ID);
  if (existingId) {
    try { return SpreadsheetApp.openById(existingId); } catch (e) { /* تابع لإنشاء ملف جديد إن كان المعرف تالفًا */ }
  }
  var ss = SpreadsheetApp.create('قاعدة بيانات نظام إدارة الورديات');
  props.setProperty(PROP_MAIN_SPREADSHEET_ID, ss.getId());
  return ss;
}

function _ensureAllMainTabs_(ss) {
  Object.keys(TABS).forEach(function (key) {
    _buildSheet_(ss, TABS[key]);
  });
}

/** ينشئ التبويب إن لم يكن موجودًا، ويطبّق التنسيق دائمًا (آمن على البيانات لأنه لا يمس المحتوى، فقط الترويسة) */
function _buildSheet_(ss, tableName) {
  var sheet = ss.getSheetByName(tableName);
  var isNew = !sheet;
  if (isNew) sheet = ss.insertSheet(tableName);

  var cols = COLUMNS[tableName];
  sheet.setRightToLeft(true);

  var hdr = sheet.getRange(1, 1, 1, cols.length);
  hdr.setValues([cols])
     .setBackground(CLR.HEADER).setFontColor(CLR.HEADER_TEXT)
     .setFontWeight('bold').setFontSize(12)
     .setHorizontalAlignment('center').setVerticalAlignment('middle')
     .setFontFamily('Arial');

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 38);
  for (var i = 1; i <= cols.length; i++) sheet.setColumnWidth(i, 150);

  if (isNew) {
    var maxRows = sheet.getMaxRows();
    if (maxRows > 100) sheet.deleteRows(101, maxRows - 100); // شيت جديد فارغ فقط، لا خطر على بيانات
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, cols.length)
         .setHorizontalAlignment('center').setVerticalAlignment('middle')
         .setFontFamily('Arial').setFontSize(12);
  }

  return sheet;
}

function _removeLeftoverDefaultSheets_(ss) {
  ['Sheet1', 'ورقة1', 'Feuille 1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) {
      try { ss.deleteSheet(s); } catch (e) { /* تجاهل */ }
    }
  });
}

// ============================================================
// ملفات الجسر الخمسة (Spreadsheets مستقلة)
// ============================================================

function _getOrCreateAllBridges_() {
  Object.keys(BRIDGES).forEach(function (key) {
    _getOrCreateBridge_(key);
  });
}

function _getOrCreateBridge_(bridgeKey) {
  var bridge = BRIDGES[bridgeKey];
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(bridge.propKey);

  var ss;
  if (existingId) {
    try { ss = SpreadsheetApp.openById(existingId); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(bridge.name);
    props.setProperty(bridge.propKey, ss.getId());
  }

  Object.keys(BRIDGE_TAB_NAMES).forEach(function (tabKey) {
    var tabName = BRIDGE_TAB_NAMES[tabKey];
    var cols = _bridgeTabColumns_(tabName);
    var sheet = ss.getSheetByName(tabName);
    var isNew = !sheet;
    if (isNew) sheet = ss.insertSheet(tabName);
    sheet.setRightToLeft(true);
    sheet.getRange(1, 1, 1, cols.length)
         .setValues([cols])
         .setBackground(CLR.HEADER).setFontColor(CLR.HEADER_TEXT)
         .setFontWeight('bold').setFontSize(12)
         .setHorizontalAlignment('center').setVerticalAlignment('middle')
         .setFontFamily('Arial');
    sheet.setFrozenRows(1);
  });

  _removeLeftoverDefaultSheets_(ss);
  _recordBridgeLinkInSettings_(bridge, ss);
  return ss;
}

/** يكتب معرف ورابط ملف الجسر في تبويب الإعدادات (إضافة/تحديث فقط، بلا حذف) ليظهرا للمدير مباشرة */
function _recordBridgeLinkInSettings_(bridge, bridgeSpreadsheet) {
  var today = todayISO();
  var correction = getSettingInt('تصحيح التقويم الهجري بالأيام', 0);
  var todayHijri = toHijriString(today, correction);
  _upsertSetting_('ملفات الجسر', 'معرف ' + bridge.name, bridgeSpreadsheet.getId(), '', today, todayHijri);
  _upsertSetting_('ملفات الجسر', 'رابط ' + bridge.name, bridgeSpreadsheet.getUrl(), '', today, todayHijri);
  invalidateAfterWrite(TABS.SETTINGS);
}

/** إضافة/تحديث صف واحد في تبويب الإعدادات مباشرة على الشيت (بدون كاش، يُستخدم أثناء التهيئة فقط) */
function _upsertSetting_(section, key, value, notes, todayStr, todayHijriStr) {
  var sheet = getSheet(TABS.SETTINGS);
  var rows = sheet.getDataRange().getValues();
  var kCol = COL(TABS.SETTINGS, 'المفتاح');
  var vCol = COL(TABS.SETTINGS, 'القيمة');

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][kCol] === key) {
      sheet.getRange(i + 1, vCol + 1).setValue(value);
      return;
    }
  }

  var row = new Array(COL_COUNT(TABS.SETTINGS)).fill('');
  row[COL(TABS.SETTINGS, 'القسم')] = section;
  row[kCol] = key;
  row[vCol] = value;
  row[COL(TABS.SETTINGS, 'الحالة')] = 'فعّال';
  row[COL(TABS.SETTINGS, 'ملاحظات')] = notes || '';
  row[COL(TABS.SETTINGS, 'تاريخ آخر تعديل ميلادي')] = todayStr || todayISO();
  row[COL(TABS.SETTINGS, 'تاريخ آخر تعديل هجري')] = todayHijriStr || '';
  sheet.appendRow(row);
}

/** تبويبات الجسر تعرض أعمدة مطابقة للجدول المصدر في القاعدة الرئيسية (عدا "الشامل" له أعمدة مختصرة خاصة) */
function _bridgeTabColumns_(bridgeTabName) {
  switch (bridgeTabName) {
    case BRIDGE_TAB_NAMES.SUMMARY:   return COLUMNS[BRIDGE_TAB_NAMES.SUMMARY];
    case BRIDGE_TAB_NAMES.EMPLOYEES: return COLUMNS[TABS.EMPLOYEES];
    case BRIDGE_TAB_NAMES.LEAVES:    return COLUMNS[TABS.LEAVES];
    case BRIDGE_TAB_NAMES.OVERTIME:  return COLUMNS[TABS.OVERTIME];
    case BRIDGE_TAB_NAMES.REGIONS:   return COLUMNS[TABS.REGIONS];
    default: throw new Error('تبويب جسر غير معروف: ' + bridgeTabName);
  }
}

// ============================================================
// الإعدادات الافتراضية الحقيقية (تُكتب مرة واحدة فقط إن كان التبويب فارغًا)
// ============================================================

function _writeDefaultSettings_(ss) {
  var sheet = ss.getSheetByName(TABS.SETTINGS);
  if (sheet.getLastRow() > 1) return; // لا تكرار، لا كتابة فوق قيم عدّلها المدير سابقًا

  var today = todayISO();
  var rows = [
    // [القسم, المفتاح, القيمة, الحالة, ملاحظات]
    ['رموز الدخول', 'رمز الموظف الافتراضي',   'EMP-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'رمز المشرف الافتراضي',    'SUP-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'رمز الإداري الافتراضي',   'ADM-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'رمز المدير الافتراضي',    'MGR-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'كلمة المرور الافتراضية',  '123456',   'فعّال', 'تُفرض على الموظف تغييرها في أول دخول'],

    ['التقويم', 'التاريخ المرجعي للورديات',        '2026-07-10', 'فعّال', '25/01/1448هـ حسب وثيقة المتطلبات'],
    ['التقويم', 'موضع دورة وردية أ',               '0', 'فعّال', 'أول يوم صباح عند التاريخ المرجعي'],
    ['التقويم', 'موضع دورة وردية ب',               '6', 'فعّال', 'ثالث يوم أوف عند التاريخ المرجعي'],
    ['التقويم', 'موضع دورة وردية ج',               '4', 'فعّال', 'أول يوم أوف عند التاريخ المرجعي'],
    ['التقويم', 'موضع دورة وردية د',               '2', 'فعّال', 'أول يوم مساء عند التاريخ المرجعي'],
    ['التقويم', 'تصحيح التقويم الهجري بالأيام',    '0', 'فعّال', 'للمعايرة اليدوية إن اختلف الحساب التقريبي عن الإعلان الرسمي'],

    ['ألوان الورديات', 'لون وردية أ', '#1565C0', 'فعّال', ''],
    ['ألوان الورديات', 'لون وردية ب', '#00838F', 'فعّال', ''],
    ['ألوان الورديات', 'لون وردية ج', '#2E7D32', 'فعّال', ''],
    ['ألوان الورديات', 'لون وردية د', '#6A1B9A', 'فعّال', ''],

    ['ألوان حالة الدوام', 'لون صباح', '#1976D2', 'فعّال', ''],
    ['ألوان حالة الدوام', 'لون مساء', '#5E35B1', 'فعّال', ''],
    ['ألوان حالة الدوام', 'لون أوف',  '#9E9E9E', 'فعّال', ''],

    ['ألوان التحذيرات', 'لون تحذير أخضر',     '#2E7D32', 'فعّال', 'أكثر من 91 يوم'],
    ['ألوان التحذيرات', 'لون تحذير برتقالي', '#EF6C00', 'فعّال', 'من 90 إلى 30 يوم'],
    ['ألوان التحذيرات', 'لون تحذير أصفر',    '#F9A825', 'فعّال', 'من 29 إلى 1 يوم'],
    ['ألوان التحذيرات', 'لون تحذير أحمر',    '#C62828', 'فعّال', '0 أو أقل'],
    ['ألوان التحذيرات', 'حد تحذير برتقالي أيام', '90', 'فعّال', ''],
    ['ألوان التحذيرات', 'حد تحذير أصفر أيام',    '29', 'فعّال', ''],

    ['رموز الطلبات', 'بادئة طلب الإجازة',  'LV',  'فعّال', ''],
    ['رموز الطلبات', 'بادئة طلب الإضافي',  'OT',  'فعّال', ''],
    ['رموز الطلبات', 'بادئة طلب النقل',    'TR',  'فعّال', ''],
    ['رموز الطلبات', 'بادئة سجل النظام',   'LOG', 'فعّال', ''],

    ['الإجازات', 'أيام إضافة رصيد النظام سنويا', '35', 'فعّال', 'تُضاف تلقائيًا في 01/01 من كل سنة ميلادية'],

    ['رسائل الواتساب', 'قالب طلب إجازة جديد',
      'مرحبًا {{اسم المستقبل}}، لديك طلب إجازة جديد من {{اسم الموظف}} برقم {{رقم الطلب}} بتاريخ {{تاريخ الطلب}}.',
      'فعّال', 'المتغيرات بين {{ }} تُستبدل تلقائيًا'],
    ['رسائل الواتساب', 'قالب نتيجة إجازة',
      'مرحبًا {{اسم الموظف}}، طلب الإجازة رقم {{رقم الطلب}} {{الحالة}}.',
      'فعّال', ''],
    ['رسائل الواتساب', 'قالب طلب إضافي جديد',
      'مرحبًا {{اسم المستقبل}}، لديك طلب عمل إضافي جديد من {{اسم الموظف}} برقم {{رقم الطلب}}.',
      'فعّال', ''],
    ['رسائل الواتساب', 'قالب نتيجة إضافي',
      'مرحبًا {{اسم الموظف}}، طلب العمل الإضافي رقم {{رقم الطلب}} {{الحالة}}.',
      'فعّال', ''],
    ['رسائل الواتساب', 'قالب نقل وردية',
      'مرحبًا {{اسم الموظف}}، تم نقلك من وردية {{الوردية السابقة}} إلى وردية {{الوردية الجديدة}} بتاريخ {{تاريخ النقل}}.',
      'فعّال', ''],

    ['إعدادات الواجهة', 'اسم الشركة',            '', 'يجب التعديل', 'إلزامي: أدخل الاسم الرسمي للشركة من لوحة الإعدادات'],
    ['إعدادات الواجهة', 'لون البراند الأساسي',   '#0066B3', 'فعّال', ''],
    ['إعدادات الواجهة', 'لون البراند الثانوي',   '#00AEEF', 'فعّال', ''],
    ['إعدادات الواجهة', 'لون البراند المميز',    '#00C5A3', 'فعّال', '']
  ];

  var withDates = rows.map(function (r) {
    return r.concat(['النظام', today, toHijriString(today, 0)]);
  });

  sheet.getRange(2, 1, withDates.length, COL_COUNT(TABS.SETTINGS))
       .setValues(withDates)
       .setHorizontalAlignment('center').setVerticalAlignment('middle')
       .setFontFamily('Arial').setFontSize(12);
}

// ============================================================
// تصحيح لاحق (إضافي، آمن): استبدال الشرطات السفلية بمسافات في أعمدة
// "المفتاح"/"القيمة" لتبويب الإعدادات إن كانت التهيئة الأولى سبق أن
// كتبت مفاتيح بصيغة قديمة تحتوي "_". لا يحذف ولا يضيف أي صف، فقط
// يصحح نص الخلايا المطابقة تمامًا لقائمة معروفة. آمن التكرار.
// شغّلها يدويًا مرة واحدة من المحرر: تصحيح_مفاتيح_الاعدادات
// ============================================================

function تصحيح_مفاتيح_الاعدادات() {
  var RENAMES = [
    ['رمز_الموظف_الافتراضي', 'رمز الموظف الافتراضي'],
    ['رمز_المشرف_الافتراضي', 'رمز المشرف الافتراضي'],
    ['رمز_الإداري_الافتراضي', 'رمز الإداري الافتراضي'],
    ['رمز_المدير_الافتراضي', 'رمز المدير الافتراضي'],
    ['كلمة_المرور_الافتراضية', 'كلمة المرور الافتراضية'],
    ['التاريخ_المرجعي_للورديات', 'التاريخ المرجعي للورديات'],
    ['موضع_دورة_وردية_أ', 'موضع دورة وردية أ'],
    ['موضع_دورة_وردية_ب', 'موضع دورة وردية ب'],
    ['موضع_دورة_وردية_ج', 'موضع دورة وردية ج'],
    ['موضع_دورة_وردية_د', 'موضع دورة وردية د'],
    ['تصحيح_التقويم_الهجري_بالأيام', 'تصحيح التقويم الهجري بالأيام'],
    ['لون_وردية_أ', 'لون وردية أ'],
    ['لون_وردية_ب', 'لون وردية ب'],
    ['لون_وردية_ج', 'لون وردية ج'],
    ['لون_وردية_د', 'لون وردية د'],
    ['لون_صباح', 'لون صباح'],
    ['لون_مساء', 'لون مساء'],
    ['لون_أوف', 'لون أوف'],
    ['لون_تحذير_اخضر', 'لون تحذير أخضر'],
    ['لون_تحذير_برتقالي', 'لون تحذير برتقالي'],
    ['لون_تحذير_اصفر', 'لون تحذير أصفر'],
    ['لون_تحذير_احمر', 'لون تحذير أحمر'],
    ['حد_تحذير_برتقالي_ايام', 'حد تحذير برتقالي أيام'],
    ['حد_تحذير_اصفر_ايام', 'حد تحذير أصفر أيام'],
    ['بادئة_طلب_الاجازة', 'بادئة طلب الإجازة'],
    ['بادئة_طلب_الاضافي', 'بادئة طلب الإضافي'],
    ['بادئة_طلب_النقل', 'بادئة طلب النقل'],
    ['بادئة_سجل_النظام', 'بادئة سجل النظام'],
    ['ايام_اضافة_رصيد_النظام_سنويا', 'أيام إضافة رصيد النظام سنويا'],
    ['قالب_طلب_اجازة_جديد', 'قالب طلب إجازة جديد'],
    ['قالب_نتيجة_اجازة', 'قالب نتيجة إجازة'],
    ['قالب_طلب_اضافي_جديد', 'قالب طلب إضافي جديد'],
    ['قالب_نتيجة_اضافي', 'قالب نتيجة إضافي'],
    ['قالب_نقل_وردية', 'قالب نقل وردية'],
    ['اسم_الشركة', 'اسم الشركة'],
    ['لون_البراند_الاساسي', 'لون البراند الأساسي'],
    ['لون_البراند_الثانوي', 'لون البراند الثانوي'],
    ['لون_البراند_المميز', 'لون البراند المميز']
  ];

  // استبدال المتغيرات {{...}} داخل نصوص قوالب الواتساب (القيمة) بصيغة بمسافات بدل الشرطة السفلية
  var VALUE_FIXES = {
    'قالب_طلب_اجازة_جديد': 'مرحبًا {{اسم المستقبل}}، لديك طلب إجازة جديد من {{اسم الموظف}} برقم {{رقم الطلب}} بتاريخ {{تاريخ الطلب}}.',
    'قالب_نتيجة_اجازة': 'مرحبًا {{اسم الموظف}}، طلب الإجازة رقم {{رقم الطلب}} {{الحالة}}.',
    'قالب_طلب_اضافي_جديد': 'مرحبًا {{اسم المستقبل}}، لديك طلب عمل إضافي جديد من {{اسم الموظف}} برقم {{رقم الطلب}}.',
    'قالب_نتيجة_اضافي': 'مرحبًا {{اسم الموظف}}، طلب العمل الإضافي رقم {{رقم الطلب}} {{الحالة}}.',
    'قالب_نقل_وردية': 'مرحبًا {{اسم الموظف}}، تم نقلك من وردية {{الوردية السابقة}} إلى وردية {{الوردية الجديدة}} بتاريخ {{تاريخ النقل}}.'
  };

  var sheet = getSheet(TABS.SETTINGS);
  var rows = sheet.getDataRange().getValues();
  var kCol = COL(TABS.SETTINGS, 'المفتاح');
  var vCol = COL(TABS.SETTINGS, 'القيمة');
  var changed = 0;

  for (var i = 1; i < rows.length; i++) {
    var currentKey = rows[i][kCol];
    for (var j = 0; j < RENAMES.length; j++) {
      if (currentKey === RENAMES[j][0]) {
        sheet.getRange(i + 1, kCol + 1).setValue(RENAMES[j][1]);
        if (VALUE_FIXES[currentKey]) sheet.getRange(i + 1, vCol + 1).setValue(VALUE_FIXES[currentKey]);
        changed++;
        break;
      }
    }
  }

  invalidateAfterWrite(TABS.SETTINGS);
  Logger.log('تم تصحيح ' + changed + ' مفتاحًا في تبويب الإعدادات.');
  return 'تم تصحيح ' + changed + ' مفتاحًا';
}

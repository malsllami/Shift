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
  return ss;
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
    ['رموز الدخول', 'رمز_الموظف_الافتراضي',   'EMP-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'رمز_المشرف_الافتراضي',    'SUP-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'رمز_الإداري_الافتراضي',   'ADM-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'رمز_المدير_الافتراضي',    'MGR-2026', 'فعّال', 'يجب تغييره بعد أول استخدام'],
    ['رموز الدخول', 'كلمة_المرور_الافتراضية',  '123456',   'فعّال', 'تُفرض على الموظف تغييرها في أول دخول'],

    ['التقويم', 'التاريخ_المرجعي_للورديات',        '2026-07-10', 'فعّال', '25/01/1448هـ حسب وثيقة المتطلبات'],
    ['التقويم', 'موضع_دورة_وردية_أ',               '0', 'فعّال', 'أول يوم صباح عند التاريخ المرجعي'],
    ['التقويم', 'موضع_دورة_وردية_ب',               '6', 'فعّال', 'ثالث يوم أوف عند التاريخ المرجعي'],
    ['التقويم', 'موضع_دورة_وردية_ج',               '4', 'فعّال', 'أول يوم أوف عند التاريخ المرجعي'],
    ['التقويم', 'موضع_دورة_وردية_د',               '2', 'فعّال', 'أول يوم مساء عند التاريخ المرجعي'],
    ['التقويم', 'تصحيح_التقويم_الهجري_بالأيام',    '0', 'فعّال', 'للمعايرة اليدوية إن اختلف الحساب التقريبي عن الإعلان الرسمي'],

    ['ألوان الورديات', 'لون_وردية_أ', '#1565C0', 'فعّال', ''],
    ['ألوان الورديات', 'لون_وردية_ب', '#00838F', 'فعّال', ''],
    ['ألوان الورديات', 'لون_وردية_ج', '#2E7D32', 'فعّال', ''],
    ['ألوان الورديات', 'لون_وردية_د', '#6A1B9A', 'فعّال', ''],

    ['ألوان حالة الدوام', 'لون_صباح', '#1976D2', 'فعّال', ''],
    ['ألوان حالة الدوام', 'لون_مساء', '#5E35B1', 'فعّال', ''],
    ['ألوان حالة الدوام', 'لون_أوف',  '#9E9E9E', 'فعّال', ''],

    ['ألوان التحذيرات', 'لون_تحذير_اخضر',     '#2E7D32', 'فعّال', 'أكثر من 91 يوم'],
    ['ألوان التحذيرات', 'لون_تحذير_برتقالي', '#EF6C00', 'فعّال', 'من 90 إلى 30 يوم'],
    ['ألوان التحذيرات', 'لون_تحذير_اصفر',    '#F9A825', 'فعّال', 'من 29 إلى 1 يوم'],
    ['ألوان التحذيرات', 'لون_تحذير_احمر',    '#C62828', 'فعّال', '0 أو أقل'],
    ['ألوان التحذيرات', 'حد_تحذير_برتقالي_ايام', '90', 'فعّال', ''],
    ['ألوان التحذيرات', 'حد_تحذير_اصفر_ايام',    '29', 'فعّال', ''],

    ['رموز الطلبات', 'بادئة_طلب_الاجازة',  'LV',  'فعّال', ''],
    ['رموز الطلبات', 'بادئة_طلب_الاضافي',  'OT',  'فعّال', ''],
    ['رموز الطلبات', 'بادئة_طلب_النقل',    'TR',  'فعّال', ''],
    ['رموز الطلبات', 'بادئة_سجل_النظام',   'LOG', 'فعّال', ''],

    ['الإجازات', 'ايام_اضافة_رصيد_النظام_سنويا', '35', 'فعّال', 'تُضاف تلقائيًا في 01/01 من كل سنة ميلادية'],

    ['رسائل الواتساب', 'قالب_طلب_اجازة_جديد',
      'مرحبًا {{اسم_المستقبل}}، لديك طلب إجازة جديد من {{اسم_الموظف}} برقم {{رقم_الطلب}} بتاريخ {{تاريخ_الطلب}}.',
      'فعّال', 'المتغيرات بين {{ }} تُستبدل تلقائيًا'],
    ['رسائل الواتساب', 'قالب_نتيجة_اجازة',
      'مرحبًا {{اسم_الموظف}}، طلب الإجازة رقم {{رقم_الطلب}} {{الحالة}}.',
      'فعّال', ''],
    ['رسائل الواتساب', 'قالب_طلب_اضافي_جديد',
      'مرحبًا {{اسم_المستقبل}}، لديك طلب عمل إضافي جديد من {{اسم_الموظف}} برقم {{رقم_الطلب}}.',
      'فعّال', ''],
    ['رسائل الواتساب', 'قالب_نتيجة_اضافي',
      'مرحبًا {{اسم_الموظف}}، طلب العمل الإضافي رقم {{رقم_الطلب}} {{الحالة}}.',
      'فعّال', ''],
    ['رسائل الواتساب', 'قالب_نقل_وردية',
      'مرحبًا {{اسم_الموظف}}، تم نقلك من وردية {{الوردية_السابقة}} إلى وردية {{الوردية_الجديدة}} بتاريخ {{تاريخ_النقل}}.',
      'فعّال', ''],

    ['إعدادات الواجهة', 'اسم_الشركة',            '', 'يجب التعديل', 'إلزامي: أدخل الاسم الرسمي للشركة من لوحة الإعدادات'],
    ['إعدادات الواجهة', 'لون_البراند_الاساسي',   '#0066B3', 'فعّال', ''],
    ['إعدادات الواجهة', 'لون_البراند_الثانوي',   '#00AEEF', 'فعّال', ''],
    ['إعدادات الواجهة', 'لون_البراند_المميز',    '#00C5A3', 'فعّال', '']
  ];

  var withDates = rows.map(function (r) {
    return r.concat(['النظام', today, toHijriString(today, 0)]);
  });

  sheet.getRange(2, 1, withDates.length, COL_COUNT(TABS.SETTINGS))
       .setValues(withDates)
       .setHorizontalAlignment('center').setVerticalAlignment('middle')
       .setFontFamily('Arial').setFontSize(12);
}

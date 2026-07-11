/**
 * Auth.gs
 * ------------------------------------------------------------------
 * دخول عادي (رقم وظيفي + كلمة مرور)، أول دخول (فرض تغيير كلمة المرور)،
 * تغيير كلمة المرور، الجلسات (تدعم عدة أجهزة نشطة في نفس الوقت)،
 * وتسجيل/دخول قفل الجهاز عبر بصمة محلية (جدول 16 الأجهزة الموثوقة).
 *
 * تنبيه أمني مهم: WebAuthn هنا (navigator.credentials في الفرونت إند)
 * هو بوّابة UX محلية فقط تجبر المتصفح على طلب بصمة/PIN حقيقي من نظام
 * التشغيل — لا يُرسَل أي توقيع تشفيري لهذا الملف، ولا يوجد تحقق FIDO2
 * حقيقي على الخادم (Google Apps Script لا يدعم WebCrypto اللازم لذلك).
 * المصادقة الموثوقة الوحيدة تبقى: رقم وظيفي + كلمة مرور + رمز جلسة.
 * ------------------------------------------------------------------
 */

var SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 ساعة
var PROP_SESSIONS = 'SESSIONS';

// ============================================================
// تجزئة كلمة المرور (SHA-256 + Salt — لا بديل حقيقي داخل حدود Apps Script)
// ============================================================

function _hashWithSalt_(plainText, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plainText + ':' + salt);
  return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function _generateSalt_() {
  return Utilities.getUuid();
}

// ============================================================
// تسجيل الدخول العادي
// ============================================================

function _login(p) {
  var empId = String(p.empId || '').trim();
  var password = String(p.password || '');
  if (!empId || !password) return jsonFail('missing_fields', 'الرقم الوظيفي وكلمة المرور مطلوبان');

  var account = _findAccountRow_(empId);
  if (!account) return jsonFail('invalid_credentials', 'بيانات الدخول غير صحيحة');

  var computedHash = _hashWithSalt_(password, account.row[COL(TABS.ACCOUNTS, 'ملح كلمة المرور')]);
  if (computedHash !== account.row[COL(TABS.ACCOUNTS, 'كلمة المرور المشفرة')]) {
    return jsonFail('invalid_credentials', 'بيانات الدخول غير صحيحة');
  }

  var perm = _findPermissionRow_(empId);
  if (!perm || perm.row[COL(TABS.PERMISSIONS, 'حالة الحساب')] !== 'فعّال') {
    return jsonFail('account_disabled', 'الحساب غير مفعّل');
  }

  var employee = _findEmployeeRow_(empId);
  if (!employee) return jsonFail('employee_not_found', 'لا يوجد ملف موظف مرتبط بهذا الرقم الوظيفي');

  var token = _issueSession_(empId);
  var forceChange = account.row[COL(TABS.ACCOUNTS, 'حالة كلمة المرور')] === 'افتراضية';

  return jsonOk({
    الرمز: token,
    المستخدم: _employeeToAuthObject_(employee.row, perm.row),
    فرض_تغيير_كلمة_المرور: forceChange
  });
}

function _findAccountRow_(empId) {
  var sheet = getSheet(TABS.ACCOUNTS);
  var rows = sheet.getDataRange().getValues();
  var idCol = COL(TABS.ACCOUNTS, 'الرقم الوظيفي');
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === empId) return { rowIndex: i + 1, row: rows[i] };
  }
  return null;
}

function _findPermissionRow_(empId) {
  var sheet = getSheet(TABS.PERMISSIONS);
  var rows = sheet.getDataRange().getValues();
  var idCol = COL(TABS.PERMISSIONS, 'الرقم الوظيفي');
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === empId) return { rowIndex: i + 1, row: rows[i] };
  }
  return null;
}

function _findEmployeeRow_(empId) {
  var sheet = getSheet(TABS.EMPLOYEES);
  var rows = sheet.getDataRange().getValues();
  var idCol = COL(TABS.EMPLOYEES, 'الرقم الوظيفي');
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === empId) return { rowIndex: i + 1, row: rows[i] };
  }
  return null;
}

function _employeeToAuthObject_(empRow, permRow) {
  var roles = [];
  if (String(permRow[COL(TABS.PERMISSIONS, 'صلاحية الموظف')]).indexOf('نعم') === 0)  roles.push('موظف');
  if (String(permRow[COL(TABS.PERMISSIONS, 'صلاحية المشرف')]).indexOf('نعم') === 0)  roles.push('مشرف');
  if (String(permRow[COL(TABS.PERMISSIONS, 'صلاحية الإداري')]).indexOf('نعم') === 0) roles.push('إداري');
  if (String(permRow[COL(TABS.PERMISSIONS, 'صلاحية المدير')]).indexOf('نعم') === 0)  roles.push('مدير');

  return {
    الرقم_الوظيفي: empRow[COL(TABS.EMPLOYEES, 'الرقم الوظيفي')],
    الاسم:         empRow[COL(TABS.EMPLOYEES, 'الاسم')],
    الوردية:       empRow[COL(TABS.EMPLOYEES, 'الوردية')],
    المنطقة:       empRow[COL(TABS.EMPLOYEES, 'المنطقة')],
    المركز:        empRow[COL(TABS.EMPLOYEES, 'المركز')],
    الصلاحيات:     roles
  };
}

// ============================================================
// الجلسات (تدعم عدة أجهزة نشطة لنفس الموظف في نفس الوقت)
// ============================================================

function _issueSession_(empId) {
  var token = Utilities.base64EncodeWebSafe(empId + ':' + Date.now() + ':' + Math.random().toString(36).slice(2));
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var sessions = JSON.parse(props.getProperty(PROP_SESSIONS) || '{}');
    sessions[token] = { empId: empId, ts: Date.now() };
    props.setProperty(PROP_SESSIONS, JSON.stringify(sessions));
  } finally {
    lock.releaseLock();
  }
  return token;
}

/** يُستدعى من Code.gs لكل طلب محمي. يرجع كائن auth أو null */
function verifySession(token) {
  if (!token) return null;
  var props = PropertiesService.getScriptProperties();
  var sessions = JSON.parse(props.getProperty(PROP_SESSIONS) || '{}');
  var sess = sessions[token];
  if (!sess) return null;
  if (Date.now() - sess.ts > SESSION_TTL_MS) {
    delete sessions[token];
    props.setProperty(PROP_SESSIONS, JSON.stringify(sessions));
    return null;
  }

  var employee = _findEmployeeRow_(sess.empId);
  var perm = _findPermissionRow_(sess.empId);
  if (!employee || !perm) return null;

  var auth = _employeeToAuthObject_(employee.row, perm.row);
  auth.empId = auth.الرقم_الوظيفي; // اختصار داخلي بالإنجليزية للاستخدام في باقي الكود
  auth.name  = auth.الاسم;
  auth.shift = auth.الوردية;
  auth.region = auth.المنطقة;
  auth.center = auth.المركز;
  auth.roles  = auth.الصلاحيات;
  return auth;
}

function _hasRole(auth, roleName) {
  return !!auth && Array.isArray(auth.roles) && auth.roles.indexOf(roleName) > -1;
}

function _logout(p) {
  if (!p.token) return jsonOk(null);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var props = PropertiesService.getScriptProperties();
    var sessions = JSON.parse(props.getProperty(PROP_SESSIONS) || '{}');
    delete sessions[p.token];
    props.setProperty(PROP_SESSIONS, JSON.stringify(sessions));
  } finally {
    lock.releaseLock();
  }
  return jsonOk(null);
}

// ============================================================
// تغيير كلمة المرور
// ============================================================

function _changePassword(p, auth) {
  var newPassword = String(p.newPassword || '');
  if (newPassword.length < 6) return jsonFail('password_too_short', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

  var defaultPassword = getSetting('كلمة المرور الافتراضية', '123456');
  if (newPassword === defaultPassword) {
    return jsonFail('password_same_as_default', 'لا يمكن استخدام كلمة المرور الافتراضية');
  }

  var account = _findAccountRow_(auth.empId);
  if (!account) return jsonFail('not_found', 'لا يوجد حساب لهذا الموظف');

  var salt = _generateSalt_();
  var hash = _hashWithSalt_(newPassword, salt);
  var sheet = getSheet(TABS.ACCOUNTS);
  sheet.getRange(account.rowIndex, COL(TABS.ACCOUNTS, 'كلمة المرور المشفرة') + 1).setValue(hash);
  sheet.getRange(account.rowIndex, COL(TABS.ACCOUNTS, 'ملح كلمة المرور') + 1).setValue(salt);
  sheet.getRange(account.rowIndex, COL(TABS.ACCOUNTS, 'حالة كلمة المرور') + 1).setValue('مُغيَّرة');

  invalidateAfterWrite(TABS.ACCOUNTS);
  return jsonOk(null, { رسالة: 'تم تغيير كلمة المرور' });
}

// ============================================================
// أداة تشغيل يدوية من محرر Apps Script فقط (ليست جزءًا من doPost/doGet)
// تُستخدم لضبط/إعادة تعيين كلمة مرور موظف مباشرة (أول موظف اختباري
// حقيقي، أو عند نسيان كلمة المرور قبل بناء واجهة إعادة التعيين).
// إن لم يكن للموظف صف في "الحسابات والجلسات" بعد، تُنشئ له صفًا جديدًا.
// ============================================================

function تعيين_كلمة_مرور_موظف_يدويا(empId, plainPassword) {
  empId = String(empId).trim();
  var salt = _generateSalt_();
  var hash = _hashWithSalt_(String(plainPassword), salt);
  var sheet = getSheet(TABS.ACCOUNTS);
  var account = _findAccountRow_(empId);

  if (account) {
    sheet.getRange(account.rowIndex, COL(TABS.ACCOUNTS, 'كلمة المرور المشفرة') + 1).setValue(hash);
    sheet.getRange(account.rowIndex, COL(TABS.ACCOUNTS, 'ملح كلمة المرور') + 1).setValue(salt);
    sheet.getRange(account.rowIndex, COL(TABS.ACCOUNTS, 'حالة كلمة المرور') + 1).setValue('افتراضية');
  } else {
    var row = new Array(COL_COUNT(TABS.ACCOUNTS)).fill('');
    row[COL(TABS.ACCOUNTS, 'الرقم الوظيفي')] = empId;
    row[COL(TABS.ACCOUNTS, 'كلمة المرور المشفرة')] = hash;
    row[COL(TABS.ACCOUNTS, 'ملح كلمة المرور')] = salt;
    row[COL(TABS.ACCOUNTS, 'حالة كلمة المرور')] = 'افتراضية';
    row[COL(TABS.ACCOUNTS, 'حالة البصمة')] = 'غير مفعّلة';
    row[COL(TABS.ACCOUNTS, 'حالة الجلسة')] = '';
    sheet.appendRow(row);
  }

  invalidateAfterWrite(TABS.ACCOUNTS);
  Logger.log('تم ضبط كلمة المرور للموظف ' + empId + ' — الحالة: افتراضية (سيُطلب تغييرها في أول دخول)');
  return 'تم';
}

// ============================================================
// قفل الجهاز (بصمة محلية) — تسجيل وتفعيل أجهزة متعددة (جدول 16)
// ============================================================

/** يُستدعى بعد نجاح navigator.credentials.create() محليًا لتسجيل جهاز جديد */
function _registerDevice(p, auth) {
  var deviceId = String(p.deviceId || '').trim();
  var deviceName = String(p.deviceName || 'جهاز غير مسمّى');
  var credentialId = String(p.credentialId || '');
  var activationHash = String(p.activationTokenHash || ''); // تجزئة مُحسَبة على العميل، لا تُرسَل القيمة الخام أبدًا

  if (!deviceId || !activationHash) return jsonFail('missing_fields', 'بيانات الجهاز ناقصة');

  var today = todayISO();
  var correction = getSettingInt('تصحيح التقويم الهجري بالأيام', 0);
  var row = new Array(COL_COUNT(TABS.TRUSTED_DEVICES)).fill('');
  row[COL(TABS.TRUSTED_DEVICES, 'الرقم الوظيفي')] = auth.empId;
  row[COL(TABS.TRUSTED_DEVICES, 'معرف الجهاز')] = deviceId;
  row[COL(TABS.TRUSTED_DEVICES, 'اسم الجهاز')] = deviceName;
  row[COL(TABS.TRUSTED_DEVICES, 'معرف البصمة')] = credentialId;
  row[COL(TABS.TRUSTED_DEVICES, 'رمز تفعيل الجهاز المشفر')] = activationHash;
  row[COL(TABS.TRUSTED_DEVICES, 'حالة الجهاز')] = 'نشط';
  row[COL(TABS.TRUSTED_DEVICES, 'تاريخ التفعيل ميلادي')] = today;
  row[COL(TABS.TRUSTED_DEVICES, 'تاريخ التفعيل هجري')] = toHijriString(today, correction);
  row[COL(TABS.TRUSTED_DEVICES, 'آخر استخدام ميلادي')] = today;
  row[COL(TABS.TRUSTED_DEVICES, 'آخر استخدام هجري')] = toHijriString(today, correction);

  getSheet(TABS.TRUSTED_DEVICES).appendRow(row);
  invalidateAfterWrite(TABS.TRUSTED_DEVICES);
  return jsonOk(null, { رسالة: 'تم تفعيل البصمة على هذا الجهاز' });
}

/** دخول ببصمة محلية على جهاز مُفعَّل مسبقًا — بدون كلمة مرور */
function _deviceLogin(p) {
  var empId = String(p.empId || '').trim();
  var deviceId = String(p.deviceId || '').trim();
  var activationToken = String(p.activationToken || ''); // القيمة الخام، تُرسَل فقط هنا وتُهاش على الخادم

  if (!empId || !deviceId || !activationToken) return jsonFail('missing_fields', 'بيانات الدخول بالبصمة ناقصة');

  var sheet = getSheet(TABS.TRUSTED_DEVICES);
  var rows = sheet.getDataRange().getValues();
  var idCol = COL(TABS.TRUSTED_DEVICES, 'الرقم الوظيفي');
  var devCol = COL(TABS.TRUSTED_DEVICES, 'معرف الجهاز');
  var statusCol = COL(TABS.TRUSTED_DEVICES, 'حالة الجهاز');
  var hashCol = COL(TABS.TRUSTED_DEVICES, 'رمز تفعيل الجهاز المشفر');

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === empId && String(rows[i][devCol]) === deviceId) {
      if (rows[i][statusCol] !== 'نشط') return jsonFail('device_revoked', 'تم إلغاء هذا الجهاز، الرجاء الدخول العادي');

      var computedHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, activationToken)
        .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
      if (computedHash !== rows[i][hashCol]) return jsonFail('invalid_device_token', 'رمز الجهاز غير صحيح');

      var perm = _findPermissionRow_(empId);
      if (!perm || perm.row[COL(TABS.PERMISSIONS, 'حالة الحساب')] !== 'فعّال') {
        return jsonFail('account_disabled', 'الحساب غير مفعّل');
      }
      var employee = _findEmployeeRow_(empId);
      if (!employee) return jsonFail('employee_not_found', 'لا يوجد ملف موظف');

      var today = todayISO();
      var correction = getSettingInt('تصحيح التقويم الهجري بالأيام', 0);
      sheet.getRange(i + 1, COL(TABS.TRUSTED_DEVICES, 'آخر استخدام ميلادي') + 1).setValue(today);
      sheet.getRange(i + 1, COL(TABS.TRUSTED_DEVICES, 'آخر استخدام هجري') + 1).setValue(toHijriString(today, correction));
      invalidateAfterWrite(TABS.TRUSTED_DEVICES);

      var token = _issueSession_(empId);
      return jsonOk({ الرمز: token, المستخدم: _employeeToAuthObject_(employee.row, perm.row) });
    }
  }
  return jsonFail('device_not_found', 'هذا الجهاز غير مفعّل لهذا الموظف');
}

/** قائمة أجهزة الموظف الحالي (لعرضها له أو للمدير) */
function _listDevices(p, auth) {
  var targetEmpId = (p.empId && _hasRole(auth, 'مدير')) ? p.empId : auth.empId;
  var rows = getSheet(TABS.TRUSTED_DEVICES).getDataRange().getValues();
  var idCol = COL(TABS.TRUSTED_DEVICES, 'الرقم الوظيفي');
  var cols = COLUMNS[TABS.TRUSTED_DEVICES];
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) !== String(targetEmpId)) continue;
    var obj = {};
    cols.forEach(function (c, idx) { obj[c] = rows[i][idx]; });
    list.push(obj);
  }
  return jsonOk(list);
}

/** إلغاء جهاز (المدير من لوحة الصلاحيات، أو الموظف نفسه لأحد أجهزته) */
function _revokeDevice(p, auth) {
  var sheet = getSheet(TABS.TRUSTED_DEVICES);
  var rows = sheet.getDataRange().getValues();
  var idCol = COL(TABS.TRUSTED_DEVICES, 'الرقم الوظيفي');
  var devCol = COL(TABS.TRUSTED_DEVICES, 'معرف الجهاز');

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][devCol]) !== String(p.deviceId)) continue;
    var ownerEmpId = String(rows[i][idCol]);
    if (ownerEmpId !== String(auth.empId) && !_hasRole(auth, 'مدير')) {
      return jsonFail('forbidden', 'لا تملك صلاحية إلغاء هذا الجهاز');
    }
    sheet.getRange(i + 1, COL(TABS.TRUSTED_DEVICES, 'حالة الجهاز') + 1).setValue('ملغى');
    invalidateAfterWrite(TABS.TRUSTED_DEVICES);
    return jsonOk(null, { رسالة: 'تم إلغاء الجهاز' });
  }
  return jsonFail('not_found', 'الجهاز غير موجود');
}

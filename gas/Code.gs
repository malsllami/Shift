/**
 * Code.gs
 * ------------------------------------------------------------------
 * نقطة الدخول الوحيدة بين الفرونت إند و Google Apps Script.
 * كل الطلبات (قراءة وكتابة) تمر عبر doPost بصيغة JSON في جسم الطلب
 * (Content-Type: text/plain لتفادي CORS Preflight من GitHub Pages)،
 * لتفادي تسريب بيانات حساسة (كلمات مرور) في سجلات GET/Query String.
 * doGet مخصص فقط لفحص أن الخدمة تعمل (action=ping).
 * ------------------------------------------------------------------
 */

var PUBLIC_ACTIONS = ['login', 'deviceLogin', 'ping'];

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'ping') return jsonOk({ الحالة: 'يعمل', الوقت: new Date().toISOString() });
  return jsonFail('use_post', 'الرجاء استخدام POST لكل العمليات');
}

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); }
      catch (parseErr) { return jsonFail('bad_request', 'صيغة الطلب غير صحيحة'); }
    }

    var params = normalizeIncomingParams(body);
    var action = params.action;
    if (!action) return jsonFail('missing_action', 'لم يتم تحديد نوع العملية');

    var auth = null;
    if (PUBLIC_ACTIONS.indexOf(action) === -1) {
      auth = verifySession(params.token);
      if (!auth) return jsonFail('session_expired', 'انتهت الجلسة، الرجاء تسجيل الدخول من جديد');
    }

    switch (action) {
      case 'ping':           return jsonOk({ الحالة: 'يعمل' });

      // ---- المصادقة والجلسات ----
      case 'login':           return _login(params);
      case 'deviceLogin':     return _deviceLogin(params);
      case 'logout':          return _logout(params);
      case 'changePassword':  return _changePassword(params, auth);
      case 'registerDevice':  return _registerDevice(params, auth);
      case 'listDevices':     return _listDevices(params, auth);
      case 'revokeDevice':    return _revokeDevice(params, auth);

      // ---- الإعدادات ----
      case 'getSettings':     return _getSettings(auth);
      case 'updateSettings':  return _updateSettings(params, auth);

      // ---- المزامنة التزايدية ----
      case 'checkVersions':   return jsonOk(getAllDataVersions(Object.keys(TABS).map(function (k) { return TABS[k]; })));

      default: return jsonFail('unknown_action', 'عملية غير معروفة: ' + action);
    }
  } catch (err) {
    _logSystemError_(err);
    return jsonFail('server_error', String(err && err.message || err));
  }
}

/** تسجيل أي استثناء غير متوقع في تبويب "مراقبة النظام" — لا يوقف الاستجابة عند فشله */
function _logSystemError_(err) {
  try {
    var sheet = getSheet(TABS.MONITORING);
    var row = new Array(COL_COUNT(TABS.MONITORING)).fill('');
    row[COL(TABS.MONITORING, 'رقم العملية')] = nextSequenceNumber('LOG');
    row[COL(TABS.MONITORING, 'نوع العملية')] = 'خطأ غير متوقع';
    row[COL(TABS.MONITORING, 'المصدر')] = 'Code.gs';
    row[COL(TABS.MONITORING, 'الوصف')] = String(err && err.message || err);
    row[COL(TABS.MONITORING, 'الحالة')] = 'خطأ';
    row[COL(TABS.MONITORING, 'التاريخ ميلادي')] = todayISO();
    sheet.appendRow(row);
  } catch (loggingErr) { /* تجاهل: لا نفشل الاستجابة بسبب فشل تسجيل الخطأ نفسه */ }
}

/**
 * Employees.gs
 * ------------------------------------------------------------------
 * قراءة/تعديل بيانات الموظف. هذه نسخة أولية (بطاقة "بياناتي" فقط) —
 * قوائم الموظفين الكاملة للمشرف/الإداري/المدير (CRUD كامل) تُضاف في
 * خطوة لاحقة من خارطة الطريق دون تعديل هذا الملف بما يكسر التوافق.
 * ------------------------------------------------------------------
 */

/**
 * يحسب لون التحذير حسب عدد الأيام المتبقية، بالاعتماد على حدود
 * قابلة للتعديل من الإعدادات (وليست ثابتة بالكود):
 * أخضر > حد تحذير برتقالي أيام، برتقالي حتى ذلك الحد، أصفر حتى
 * حد تحذير أصفر أيام، أحمر 0 أو أقل.
 */
function _employeeWarningColor_(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return null;
  var orangeUpper = getSettingInt('حد تحذير برتقالي أيام', 90);
  var yellowUpper = getSettingInt('حد تحذير أصفر أيام', 29);
  if (daysLeft <= 0) return 'احمر';
  if (daysLeft <= yellowUpper) return 'اصفر';
  if (daysLeft <= orangeUpper) return 'برتقالي';
  return 'اخضر';
}

/** بطاقة "بياناتي" — الموظف لنفسه، أو المشرف/الإداري/المدير لأي موظف عبر p.empId */
function _getMyProfile(p, auth) {
  var canViewOthers = _hasRole(auth, 'مدير') || _hasRole(auth, 'مشرف') || _hasRole(auth, 'إداري');
  var targetId = (p.empId && canViewOthers) ? p.empId : auth.empId;

  var found = _findEmployeeRow_(targetId);
  if (!found) return jsonFail('not_found', 'لم يتم العثور على بيانات هذا الموظف');
  var r = found.row;

  var workLeft = daysLeftUntil(r[COL(TABS.EMPLOYEES, 'تاريخ انتهاء بطاقة العمل ميلادي')]);
  var srcLeft  = daysLeftUntil(r[COL(TABS.EMPLOYEES, 'تاريخ انتهاء بطاقة مصدر مستلم ميلادي')]);

  return jsonOk({
    الرقم_الوظيفي: r[COL(TABS.EMPLOYEES, 'الرقم الوظيفي')],
    الاسم:         r[COL(TABS.EMPLOYEES, 'الاسم')],
    رقم_الجوال:    r[COL(TABS.EMPLOYEES, 'رقم الجوال')],
    الوردية:       r[COL(TABS.EMPLOYEES, 'الوردية')],
    المنطقة:       r[COL(TABS.EMPLOYEES, 'المنطقة')],
    المركز:        r[COL(TABS.EMPLOYEES, 'المركز')],
    رقم_السيارة:   r[COL(TABS.EMPLOYEES, 'رقم السيارة')],
    بطاقة_العمل:          { الأيام_المتبقية: workLeft, اللون: _employeeWarningColor_(workLeft) },
    بطاقة_مصدر_مستلم:     { الأيام_المتبقية: srcLeft,  اللون: _employeeWarningColor_(srcLeft) },
    حالة_الموظف:   r[COL(TABS.EMPLOYEES, 'حالة الموظف')],
    اكتمال_الملف:  r[COL(TABS.EMPLOYEES, 'اكتمال الملف')]
  });
}

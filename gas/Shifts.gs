/**
 * Shifts.gs
 * ------------------------------------------------------------------
 * حساب حالة الورديات A/B/C/D لأي تاريخ، اعتمادًا فقط على الإعدادات
 * (التاريخ المرجعي + موضع كل وردية عند المرجع) — بدون أي قيمة ثابتة
 * بالكود. دورة الوردية: يومين صباح، يومين مساء، أربعة أيام أوف (8 أيام).
 * ------------------------------------------------------------------
 */

var SHIFT_CYCLE_PHASES = ['صباح', 'صباح', 'مساء', 'مساء', 'أوف', 'أوف', 'أوف', 'أوف'];
var SHIFT_LABELS = ['أ', 'ب', 'ج', 'د'];

function _shiftPositionSettingKey_(shiftLabel) {
  var map = {
    'أ': 'موضع_دورة_وردية_أ', 'ب': 'موضع_دورة_وردية_ب',
    'ج': 'موضع_دورة_وردية_ج', 'د': 'موضع_دورة_وردية_د'
  };
  return map[shiftLabel];
}

/** رقم اليوم داخل فترته الحالية (مثال: اليوم الثاني من صباح) */
function _dayWithinPhase_(pos) {
  if (pos === 0 || pos === 1) return pos + 1;       // صباح: يوم 1 أو 2
  if (pos === 2 || pos === 3) return pos - 1;       // مساء: يوم 1 أو 2
  return pos - 3;                                    // أوف: يوم 1 إلى 4
}

function shiftStatusForDate(shiftLabel, dateISO) {
  var refDate = getSetting('التاريخ_المرجعي_للورديات', '2026-07-10');
  var startPos = getSettingInt(_shiftPositionSettingKey_(shiftLabel), 0);
  var offset = daysBetween(refDate, dateISO);
  var pos = ((offset + startPos) % 8 + 8) % 8;
  return { الحالة: SHIFT_CYCLE_PHASES[pos], رقم_اليوم_في_الفترة: _dayWithinPhase_(pos), الموضع: pos };
}

function _getWeekStrip_() {
  var today = todayISO();
  var correction = getSettingInt('تصحيح_التقويم_الهجري_بالأيام', 0);
  var days = [];
  for (var i = -1; i <= 5; i++) {
    var d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() + i);
    var iso = toISODate(d);
    var perShift = {};
    SHIFT_LABELS.forEach(function (s) { perShift[s] = shiftStatusForDate(s, iso).الحالة; });
    days.push({
      التاريخ_ميلادي: iso,
      التاريخ_هجري: toHijriString(iso, correction),
      اليوم_الحالي: iso === today,
      الورديات: perShift
    });
  }
  return days;
}

/** حالة وردية الموظف الحالي اليوم + شريط أسبوعي لكل الورديات (لعرضه في الصفحة الرئيسية) */
function _getShiftStatus(p, auth) {
  if (!auth.shift) return jsonFail('no_shift_assigned', 'لا توجد وردية مرتبطة بحسابك بعد');

  var today = todayISO();
  var correction = getSettingInt('تصحيح_التقويم_الهجري_بالأيام', 0);
  var mine = shiftStatusForDate(auth.shift, today);

  var colors = {};
  SHIFT_LABELS.forEach(function (s) {
    var key = { 'أ': 'لون_وردية_أ', 'ب': 'لون_وردية_ب', 'ج': 'لون_وردية_ج', 'د': 'لون_وردية_د' }[s];
    colors[s] = getSetting(key, '#0a5fa8');
  });

  return jsonOk({
    التاريخ_ميلادي: today,
    التاريخ_هجري: toHijriString(today, correction),
    الوردية: auth.shift,
    الحالة: mine.الحالة,
    رقم_اليوم_في_الفترة: mine.رقم_اليوم_في_الفترة,
    ألوان_الورديات: colors,
    لون_صباح: getSetting('لون_صباح', '#1976D2'),
    لون_مساء: getSetting('لون_مساء', '#5E35B1'),
    لون_أوف: getSetting('لون_أوف', '#9E9E9E'),
    الأسبوع: _getWeekStrip_()
  });
}

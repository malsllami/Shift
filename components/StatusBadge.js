/** StatusBadge.js — شارة حالة ملوّنة (تحذيرات البطاقات، حالات الطلبات...) */

const LABELS = { اخضر: 'جيد', برتقالي: 'تنبيه', اصفر: 'حذر شديد', احمر: 'منتهي' };

export function statusPillHtml(colorKey, customLabel) {
  if (!colorKey) return '<span class="pill pill-neutral">—</span>';
  const label = customLabel || LABELS[colorKey] || colorKey;
  return `<span class="pill pill-${colorKey}">${label}</span>`;
}

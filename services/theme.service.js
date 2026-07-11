/**
 * theme.service.js
 * يحقن ألوان البراند/الورديات/الدوام من تبويب الإعدادات الحقيقي في
 * متغيرات CSS وقت التشغيل — لا ألوان ثابتة في الكود بعد هذه النقطة.
 */
import { apiCall } from './api.service.js';

const CSS_VAR_MAP = {
  لون_البراند_الاساسي: '--brand',
  لون_البراند_الثانوي: '--brand-2',
  لون_وردية_أ: '--shift-a',
  لون_وردية_ب: '--shift-b',
  لون_وردية_ج: '--shift-c',
  لون_وردية_د: '--shift-d',
  لون_صباح: '--duty-morning',
  لون_مساء: '--duty-evening',
  لون_أوف: '--duty-off'
};

export async function applyRuntimeTheme() {
  let settings;
  try { settings = await apiCall('getPublicSettings', {}); }
  catch (e) { return null; } // فشل صامت: تبقى ألوان variables.css الافتراضية سارية

  const root = document.documentElement;
  Object.keys(CSS_VAR_MAP).forEach((key) => {
    if (settings[key]) root.style.setProperty(CSS_VAR_MAP[key], settings[key]);
  });
  return settings;
}

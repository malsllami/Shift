/**
 * app-config.js
 * إعدادات تقنية بحتة فقط (رابط الخلفية). لا بيانات عمل هنا إطلاقًا —
 * كل بيانات العمل (ألوان، رموز، رسائل...) تُقرأ من تبويب الإعدادات عبر API.
 */
window.APP_CONFIG = {
  // رابط تطبيق الويب المنشور فعليًا من Google Apps Script
  API_URL: 'https://script.google.com/macros/s/AKfycbyC07vg2C_8XGP-LjhvRV1J-88sTYbSq-hA1utIG9tgDk4_y3bvGmMEGtMjH-zzfogT/exec',

  SESSION_STORAGE_KEY: 'شفتات_رمز_الجلسة',
  USER_STORAGE_KEY: 'شفتات_بيانات_المستخدم',
  DEVICE_ID_STORAGE_KEY: 'شفتات_معرف_الجهاز',
  DEVICE_TOKEN_STORAGE_KEY: 'شفتات_رمز_تفعيل_الجهاز'
};

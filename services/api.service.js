/**
 * api.service.js
 * طبقة اتصال موحدة بـ Google Apps Script. POST دائمًا بصيغة
 * text/plain (لا JSON header) لتفادي CORS Preflight من GitHub Pages.
 */

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function getToken() {
  return localStorage.getItem(window.APP_CONFIG.SESSION_STORAGE_KEY) || '';
}

export async function apiCall(action, params) {
  params = params || {};
  const body = Object.assign({ action, token: getToken() }, params);

  let res;
  try {
    res = await fetch(window.APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
  } catch (networkErr) {
    throw new ApiError('network_error', 'تعذر الاتصال بالخادم، تحقق من الإنترنت');
  }

  if (!res.ok) throw new ApiError('http_error', 'خطأ في الاتصال بالخادم');

  let json;
  try { json = await res.json(); }
  catch (parseErr) { throw new ApiError('bad_response', 'استجابة غير صالحة من الخادم'); }

  if (!json.نجاح) throw new ApiError(json.رمز_الخطأ || 'unknown_error', json.رسالة || 'حدث خطأ غير متوقع');
  return json.بيانات !== undefined ? json.بيانات : json;
}

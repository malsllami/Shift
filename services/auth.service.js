/**
 * auth.service.js
 * الدخول العادي، الجلسة، وقفل الجهاز عبر بصمة محلية.
 *
 * تنبيه: navigator.credentials هنا يُستخدم فقط لإجبار المتصفح على
 * طلب بصمة/PIN حقيقي من نظام التشغيل كبوّابة تجربة استخدام محلية.
 * لا يُرسَل أي توقيع WebAuthn تشفيري للخادم — المصادقة الموثوقة
 * الوحيدة تبقى: الرقم الوظيفي + كلمة المرور + رمز الجلسة.
 */

import { apiCall } from './api.service.js';
import { getLocalSecret, setLocalSecret, deleteLocalSecret } from './cache.service.js';

const cfg = window.APP_CONFIG;

// ============================================================
// الجلسة العادية
// ============================================================

export async function login(empId, password) {
  const data = await apiCall('login', { empId, password });
  localStorage.setItem(cfg.SESSION_STORAGE_KEY, data.الرمز);
  localStorage.setItem(cfg.USER_STORAGE_KEY, JSON.stringify(data.المستخدم));
  return data;
}

export async function logout() {
  try { await apiCall('logout', {}); } catch (e) { /* نظّف محليًا حتى لو فشل الطلب */ }
  localStorage.removeItem(cfg.SESSION_STORAGE_KEY);
  localStorage.removeItem(cfg.USER_STORAGE_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(cfg.USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem(cfg.SESSION_STORAGE_KEY);
}

export async function changePassword(newPassword) {
  return apiCall('changePassword', { newPassword });
}

// ============================================================
// قفل الجهاز (بصمة محلية) — تعدد الأجهزة مسموح
// ============================================================

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(digest);
}

export function isDeviceLockSupported() {
  return typeof window.PublicKeyCredential !== 'undefined' && !!navigator.credentials;
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem(cfg.DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(cfg.DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}

/** يُستدعى بعد دخول عادي ناجح لتفعيل البصمة على هذا الجهاز */
export async function activateDeviceLock(deviceName) {
  if (!isDeviceLockSupported()) throw new Error('هذا الجهاز/المتصفح لا يدعم قفل البصمة المحلي');

  // يطلب بصمة/PIN فعليًا من نظام التشغيل كبوّابة UX — لا يُرسَل الناتج للخادم
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'نظام إدارة الورديات' },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'جهاز محلي',
        displayName: 'جهاز محلي'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000
    }
  });

  const deviceId = getOrCreateDeviceId();
  const activationToken = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const activationTokenHash = await sha256Hex(activationToken);

  await apiCall('registerDevice', {
    deviceId,
    deviceName: deviceName || navigator.userAgent.slice(0, 60),
    credentialId: credential ? bytesToHex(new Uint8Array(credential.rawId)) : '',
    activationTokenHash
  });

  await setLocalSecret(cfg.DEVICE_TOKEN_STORAGE_KEY, { deviceId, activationToken });
}

export async function isDeviceLockActivatedHere() {
  const secret = await getLocalSecret(cfg.DEVICE_TOKEN_STORAGE_KEY);
  return !!secret;
}

/** دخول ببصمة محلية على جهاز مُفعَّل مسبقًا، بدون كلمة مرور */
export async function loginWithDeviceLock(empId) {
  const secret = await getLocalSecret(cfg.DEVICE_TOKEN_STORAGE_KEY);
  if (!secret) throw new Error('لم يتم تفعيل البصمة على هذا الجهاز بعد');

  if (isDeviceLockSupported()) {
    // يطلب بصمة/PIN محليًا مرة أخرى كبوّابة قبل استخدام الرمز المخزّن
    try {
      await navigator.credentials.get({
        publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), timeout: 60000, userVerification: 'required' }
      });
    } catch (e) {
      throw new Error('تعذّر التحقق من البصمة');
    }
  }

  const data = await apiCall('deviceLogin', {
    empId,
    deviceId: secret.deviceId,
    activationToken: secret.activationToken
  });
  localStorage.setItem(cfg.SESSION_STORAGE_KEY, data.الرمز);
  localStorage.setItem(cfg.USER_STORAGE_KEY, JSON.stringify(data.المستخدم));
  return data;
}

export async function deactivateDeviceLockHere() {
  await deleteLocalSecret(cfg.DEVICE_TOKEN_STORAGE_KEY);
}

export async function listMyDevices() {
  return apiCall('listDevices', {});
}

export async function revokeDevice(deviceId) {
  return apiCall('revokeDevice', { deviceId });
}

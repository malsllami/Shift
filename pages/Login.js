/** Login.js — تسجيل الدخول العادي + الدخول بالبصمة المحلية إن كانت مفعّلة على الجهاز */
import { createInputField } from '../components/InputField.js';
import { showToast } from '../components/Toast.js';
import * as AuthService from '../services/auth.service.js';
import { ApiError } from '../services/api.service.js';

export async function renderLogin(container, onLoggedIn) {
  const deviceReady = await AuthService.isDeviceLockActivatedHere();

  container.innerHTML = `
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px">
      <div class="card card-pad" style="width:100%; max-width:380px">
        <div style="text-align:center; margin-bottom:20px">
          <div style="width:52px;height:52px;border-radius:15px;margin:0 auto 10px;background:linear-gradient(135deg,var(--brand),var(--brand-2));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px">SE</div>
          <h2 style="font-size:17px">تسجيل الدخول</h2>
          <p class="dual-date" style="justify-content:center; margin-top:4px">نظام إدارة الورديات</p>
        </div>

        <div id="device-login-box" style="${deviceReady ? '' : 'display:none'}; margin-bottom:16px">
          ${createInputField({ id: 'device-emp-id', label: 'الرقم الوظيفي', numeric: true }).element.outerHTML}
          <button class="btn btn-primary btn-block" id="btn-device-login">الدخول بالبصمة</button>
          <div style="text-align:center; margin:14px 0; color:var(--text-muted); font-size:12px">— أو —</div>
        </div>

        <form id="login-form"></form>
        <button class="btn btn-primary btn-block" id="btn-login" form="login-form" type="submit">دخول</button>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const empField = createInputField({ id: 'emp-id', label: 'الرقم الوظيفي', numeric: true, required: true });
  const passField = createInputField({ id: 'password', label: 'كلمة المرور', type: 'password', required: true });
  form.appendChild(empField.element);
  form.appendChild(passField.element);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    empField.setError(''); passField.setError('');
    try {
      const result = await AuthService.login(empField.input.value.trim(), passField.input.value);
      showToast('تم تسجيل الدخول بنجاح', 'success');
      onLoggedIn(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'تعذر تسجيل الدخول';
      passField.setError(msg);
      showToast(msg, 'error');
    }
  });

  if (deviceReady) {
    container.querySelector('#btn-device-login').addEventListener('click', async () => {
      const empId = container.querySelector('#device-emp-id').value.trim();
      if (!empId) return showToast('أدخل الرقم الوظيفي أولًا', 'error');
      try {
        const result = await AuthService.loginWithDeviceLock(empId);
        showToast('تم الدخول بالبصمة', 'success');
        onLoggedIn(result);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : err.message || 'تعذر الدخول بالبصمة', 'error');
      }
    });
  }
}

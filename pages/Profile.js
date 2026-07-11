/** Profile.js — صفحة "بياناتي" المستقلة (نسخة أولية: عرض فقط، التعديل يُضاف لاحقًا) */
import { apiCall, ApiError } from '../services/api.service.js';
import { statusPillHtml } from '../components/StatusBadge.js';

export async function renderProfile(container) {
  container.innerHTML = '<div class="app-loading">جاري تحميل بياناتك...</div>';
  try {
    const p = await apiCall('getMyProfile', {});
    container.innerHTML = `
      <div class="page">
        <div class="card card-pad" style="max-width:520px; margin:0 auto">
          <h2 style="font-size:16px; margin-bottom:14px">بياناتي</h2>
          <div class="field-row"><span class="k">الرقم الوظيفي</span><span class="v">${p.الرقم_الوظيفي}</span></div>
          <div class="field-row"><span class="k">الاسم</span><span class="v">${p.الاسم}</span></div>
          <div class="field-row"><span class="k">رقم الجوال</span><span class="v">${p.رقم_الجوال || '—'}</span></div>
          <div class="field-row"><span class="k">الوردية</span><span class="v">${p.الوردية || '—'}</span></div>
          <div class="field-row"><span class="k">المنطقة</span><span class="v">${p.المنطقة || '—'}</span></div>
          <div class="field-row"><span class="k">المركز</span><span class="v">${p.المركز || '—'}</span></div>
          <div class="field-row"><span class="k">رقم السيارة</span><span class="v">${p.رقم_السيارة || '—'}</span></div>
          <div class="field-row"><span class="k">بطاقة العمل</span><span class="v">${p.بطاقة_العمل.الأيام_المتبقية !== null ? p.بطاقة_العمل.الأيام_المتبقية + ' يوم متبقي' : '—'} ${statusPillHtml(p.بطاقة_العمل.اللون)}</span></div>
          <div class="field-row"><span class="k">بطاقة مصدر مستلم</span><span class="v">${p.بطاقة_مصدر_مستلم.الأيام_المتبقية !== null ? p.بطاقة_مصدر_مستلم.الأيام_المتبقية + ' يوم متبقي' : '—'} ${statusPillHtml(p.بطاقة_مصدر_مستلم.اللون)}</span></div>
          <div class="field-row"><span class="k">حالة الموظف</span><span class="v">${p.حالة_الموظف || '—'}</span></div>
          <div class="field-row"><span class="k">اكتمال الملف</span><span class="v">${p.اكتمال_الملف || '—'}</span></div>
        </div>
      </div>
    `;
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'تعذر تحميل بياناتك';
    container.innerHTML = `<div class="page"><div class="card card-pad" style="color:var(--warn-red)">${msg}</div></div>`;
  }
}

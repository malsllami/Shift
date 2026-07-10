/**
 * Home.js — الصفحة الرئيسية.
 * دسكتوب (≥861px): بطاقة وردية مضغوطة + شريط أيام + بطاقتا بياناتي/مركزي جنبًا لجنب (نموذج 2).
 * جوال (<861px): نفس المحتوى داخل أقسام قابلة للطي (نموذج 4).
 */
import { apiCall, ApiError } from '../services/api.service.js';
import { ROUTES } from '../config/routes.js';
import { iconSvg } from '../components/icons.js';
import { createAccordion } from '../components/Accordion.js';
import { statusPillHtml } from '../components/StatusBadge.js';
import { showToast } from '../components/Toast.js';

const DUTY_VAR = { صباح: '--duty-morning', مساء: '--duty-evening', أوف: '--duty-off' };

/** شريط أيام يعرض حالة وردية الموظف نفسه (وليس كل الورديات) لكل يوم من أسبوعه */
function dayStripHtml(week, myShift) {
  const dow = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  return `<div class="day-strip">${week.map((d) => {
    const date = new Date(d.التاريخ_ميلادي + 'T00:00:00');
    const myStatus = d.الورديات[myShift];
    return `<div class="day-cell${d.اليوم_الحالي ? ' today' : ''}">
      <span class="dow">${dow[date.getDay()]}</span>
      <span class="dnum">${date.getDate()}</span>
      <span class="pill" style="font-size:9.5px;background:var(${DUTY_VAR[myStatus] || '--duty-off'})">${myStatus}</span>
    </div>`;
  }).join('')}</div>`;
}

function profileCardHtml(profile) {
  return `
    <div class="field-row"><span class="k">المنطقة</span><span class="v">${profile.المنطقة || '—'}</span></div>
    <div class="field-row"><span class="k">المركز</span><span class="v">${profile.المركز || '—'}</span></div>
    <div class="field-row"><span class="k">رقم السيارة</span><span class="v">${profile.رقم_السيارة || '—'}</span></div>
    <div class="field-row"><span class="k">بطاقة العمل</span><span class="v">${profile.بطاقة_العمل.الأيام_المتبقية !== null ? profile.بطاقة_العمل.الأيام_المتبقية + ' يوم' : '—'} ${statusPillHtml(profile.بطاقة_العمل.اللون)}</span></div>
    <div class="field-row"><span class="k">بطاقة مصدر مستلم</span><span class="v">${profile.بطاقة_مصدر_مستلم.الأيام_المتبقية !== null ? profile.بطاقة_مصدر_مستلم.الأيام_المتبقية + ' يوم' : '—'} ${statusPillHtml(profile.بطاقة_مصدر_مستلم.اللون)}</span></div>
    <div class="field-row"><span class="k">اكتمال الملف</span><span class="v">${profile.اكتمال_الملف || '—'}</span></div>
  `;
}

export async function renderHome(container) {
  container.innerHTML = '<div class="app-loading">جاري تحميل بيانات الوردية...</div>';

  let shift, profile;
  try {
    [shift, profile] = await Promise.all([
      apiCall('getShiftStatus', {}),
      apiCall('getMyProfile', {})
    ]);
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'تعذر تحميل بيانات الصفحة الرئيسية';
    container.innerHTML = `<div class="page"><div class="card card-pad" style="color:var(--warn-red)">${msg}</div></div>`;
    return;
  }

  const shiftColor = shift.ألوان_الورديات[shift.الوردية] || 'var(--brand)';

  const quickGrid = ROUTES.filter((r) => r.path !== '#/home').map((r) => `
    <a class="quick" href="${r.path}">
      <div class="ic">${iconSvg(r.icon, 18)}</div>
      <span>${r.label}${r.ready ? '' : ' <small style="font-weight:400;color:var(--text-muted)">(قريبًا)</small>'}</span>
    </a>`).join('');

  container.innerHTML = `
    <div class="page">
      <div class="shift-hero" style="background:linear-gradient(120deg, ${shiftColor}, var(--brand-ink))">
        <div>
          <div class="label">وردية اليوم</div>
          <div class="big">${shift.الوردية} — ${shift.الحالة}</div>
          <div class="sub">اليوم ${['واحد','الثاني','الثالث','الرابع'][shift.رقم_اليوم_في_الفترة - 1] || shift.رقم_اليوم_في_الفترة} من فترة ${shift.الحالة}</div>
        </div>
        <div class="dual-date" style="color:#fff; opacity:.9">
          <b>${shift.التاريخ_ميلادي}</b><span>·</span><b>${shift.التاريخ_هجري}</b>
        </div>
      </div>

      <div style="margin:18px 0" class="quick-grid">${quickGrid}</div>

      <!-- ---- دسكتوب: بطاقتان جنبًا لجنب ---- -->
      <div class="desktop-only grid-2" style="display:grid; grid-template-columns:1.3fr 1fr; gap:16px">
        <div class="card card-pad">
          <b style="font-size:13px">جدول أسبوعي لورديتي</b>
          <div style="margin-top:10px">${dayStripHtml(shift.الأسبوع, shift.الوردية)}</div>
        </div>
        <div class="card card-pad">
          <b style="font-size:13px">بياناتي</b>
          ${profileCardHtml(profile)}
        </div>
      </div>

      <!-- ---- جوال: أقسام قابلة للطي ---- -->
      <div class="mobile-only" id="mobile-accordions"></div>
    </div>
  `;

  const mobileHost = container.querySelector('#mobile-accordions');
  if (mobileHost) {
    const weekBody = document.createElement('div');
    weekBody.innerHTML = dayStripHtml(shift.الأسبوع, shift.الوردية);
    mobileHost.appendChild(createAccordion({ icon: 'shift', title: 'جدول أسبوعي لورديتي', bodyEl: weekBody, open: true }));

    const profileBody = document.createElement('div');
    profileBody.innerHTML = profileCardHtml(profile);
    mobileHost.appendChild(createAccordion({ icon: 'user', title: 'بياناتي', bodyEl: profileBody }));
  }
}

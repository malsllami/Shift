/** TopBar.js — شريط علوي + تبويبات أفقية (شاشات كبيرة) / قائمة منسدلة (جوال) */
import { ROUTES } from '../config/routes.js';
import { iconSvg } from './icons.js';

export function renderTopBar({ user, currentPath, companyName, onLogout }) {
  const wrap = document.createElement('div');

  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <div class="brand">
      <div class="mark">SE</div>
      <b>${companyName || 'إدارة الورديات'}</b>
    </div>
    <div class="right">
      <span class="icon-btn" title="الإشعارات">${iconSvg('bell', 19)}</span>
      <span style="font-size:12.5px;font-weight:700">${user ? user.الاسم : ''}</span>
      <button class="btn btn-secondary" id="topbar-logout" style="padding:7px 12px">خروج</button>
      <button class="icon-btn hamburger" id="topbar-hamburger" aria-label="القائمة">${iconSvg('menu', 20)}</button>
    </div>
  `;

  const tabs = document.createElement('nav');
  tabs.className = 'tabs';
  tabs.innerHTML = ROUTES.map((r) => `<a class="tab${r.path === currentPath ? ' active' : ''}" href="${r.path}">${r.label}</a>`).join('');

  const drawer = document.createElement('div');
  drawer.className = 'nav-drawer';
  drawer.innerHTML = `
    <div class="backdrop"></div>
    <div class="panel">
      <div class="brand" style="margin-bottom:14px"><div class="mark">SE</div><b>${companyName || 'إدارة الورديات'}</b></div>
      ${ROUTES.map((r) => `<a class="drawer-item${r.path === currentPath ? ' active' : ''}" href="${r.path}">${iconSvg(r.icon, 17)}${r.label}</a>`).join('')}
    </div>
  `;

  wrap.appendChild(topbar);
  wrap.appendChild(tabs);
  wrap.appendChild(drawer);

  const hamburgerBtn = topbar.querySelector('#topbar-hamburger');
  hamburgerBtn.addEventListener('click', () => drawer.classList.add('open'));
  drawer.querySelector('.backdrop').addEventListener('click', () => drawer.classList.remove('open'));
  drawer.querySelectorAll('.drawer-item').forEach((a) => a.addEventListener('click', () => drawer.classList.remove('open')));

  topbar.querySelector('#topbar-logout').addEventListener('click', () => { if (onLogout) onLogout(); });

  return wrap;
}

/** Accordion.js — قسم قابل للطي (نمط الجوال، النموذج المختار رقم 4) */
import { iconSvg } from './icons.js';

export function createAccordion({ icon, title, bodyEl, open = false }) {
  const el = document.createElement('div');
  el.className = 'accordion' + (open ? ' open' : '');
  el.innerHTML = `
    <div class="acc-header">
      <div class="l"><div class="ic">${iconSvg(icon, 16)}</div>${title}</div>
      ${iconSvg('chev', 16).replace('<svg', '<svg class="chev"')}
    </div>
  `;
  const body = document.createElement('div');
  body.className = 'acc-body';
  body.appendChild(bodyEl);
  el.appendChild(body);

  el.querySelector('.acc-header').addEventListener('click', () => el.classList.toggle('open'));
  return el;
}

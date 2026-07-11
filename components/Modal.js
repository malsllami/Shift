/** Modal.js — نافذة منبثقة بسيطة */
import { iconSvg } from './icons.js';

export function openModal({ title, bodyEl, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
  head.innerHTML = `<h3>${title}</h3><button class="icon-btn" aria-label="إغلاق" style="background:none;border:none">${iconSvg('close', 18)}</button>`;

  modal.appendChild(head);
  modal.appendChild(bodyEl);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }

  head.querySelector('button').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  return { close, modal };
}

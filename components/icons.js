/**
 * icons.js — أيقونات SVG بسيطة (خطوط، بدون Emoji) مستخدمة في كل الواجهة.
 */
const PATHS = {
  shift: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3.2 1.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  user: '<circle cx="12" cy="8.3" r="3.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 19.5c1.3-3.4 4-5.1 7-5.1s5.7 1.7 7 5.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  leave: '<rect x="4" y="5.5" width="16" height="14" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  ot: '<circle cx="12" cy="12.5" r="7.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8.3v4.5l3 1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 3.2h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  inbox: '<path d="M4 7.5 12 13l8-5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="6" width="16" height="12.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  outbox: '<path d="M13 6h4.5A1.5 1.5 0 0 1 19 7.5v9a1.5 1.5 0 0 1-1.5 1.5H13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 12h9M11 8.5 14.5 12 11 15.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  map: '<path d="M12 21s6.5-6.1 6.5-11A6.5 6.5 0 1 0 5.5 10c0 4.9 6.5 11 6.5 11Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  cog: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  bell: '<path d="M6 10.5a6 6 0 0 1 12 0c0 3.6 1 5 1.8 5.8H4.2C5 15.5 6 14.1 6 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  chev: '<path d="M8 5.5 15 12l-7 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  archive: '<rect x="4" y="4.5" width="16" height="4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 8.5V18a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 12.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
};

export function iconSvg(name, size) {
  size = size || 17;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${PATHS[name] || ''}</svg>`;
}

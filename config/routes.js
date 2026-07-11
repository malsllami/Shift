/**
 * routes.js — قائمة التنقّل الأساسية (Hash-based، لأن GitHub Pages
 * استضافة ثابتة ولا تدعم إعادة توجيه مسارات SPA حقيقية).
 * "جاهزة" تعني وجود صفحة فعلية متكاملة مع الخلفية الآن؛ الباقي يعرض
 * حالة "قيد الإنشاء" صريحة بدل أي بيانات وهمية.
 */
export const ROUTES = [
  { path: '#/home',     label: 'الرئيسية',         icon: 'shift',  ready: true },
  { path: '#/profile',  label: 'بياناتي',          icon: 'user',   ready: true },
  { path: '#/leaves',   label: 'الإجازات',          icon: 'leave',  ready: false },
  { path: '#/overtime', label: 'العمل الإضافي',     icon: 'ot',     ready: false },
  { path: '#/inbox',    label: 'الوارد',            icon: 'inbox',  ready: false },
  { path: '#/outbox',   label: 'الصادر',            icon: 'outbox', ready: false },
  { path: '#/regions',  label: 'المناطق والمراكز', icon: 'map',    ready: false }
];

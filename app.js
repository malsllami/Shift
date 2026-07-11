/**
 * app.js — نقطة إقلاع الموقع وموجّه المسارات (Hash-based).
 */
import { applyRuntimeTheme } from './services/theme.service.js';
import * as AuthService from './services/auth.service.js';
import { renderTopBar } from './components/TopBar.js';
import { renderLogin } from './pages/Login.js';
import { renderHome } from './pages/Home.js';
import { renderProfile } from './pages/Profile.js';
import { renderPlaceholder } from './pages/Placeholder.js';
import { ROUTES } from './config/routes.js';

const root = document.getElementById('app');
let companyName = '';

async function boot() {
  const settings = await applyRuntimeTheme();
  companyName = settings ? settings.اسم_الشركة : '';
  renderApp();
}

function renderApp() {
  root.innerHTML = '';
  if (!AuthService.isAuthenticated()) {
    renderLogin(root, () => renderApp());
    return;
  }
  renderShell();
}

function renderShell() {
  const user = AuthService.getCurrentUser();
  const path = location.hash || '#/home';
  if (!location.hash) location.hash = '#/home';

  const topbar = renderTopBar({
    user, currentPath: path, companyName,
    onLogout: async () => { await AuthService.logout(); renderApp(); }
  });
  root.appendChild(topbar);

  const pageContainer = document.createElement('main');
  root.appendChild(pageContainer);
  renderPage(path, pageContainer);
}

function renderPage(path, container) {
  const route = ROUTES.find((r) => r.path === path);
  if (!route) { location.hash = '#/home'; return; }
  if (!route.ready) { renderPlaceholder(container, route.label); return; }

  if (path === '#/home') renderHome(container);
  else if (path === '#/profile') renderProfile(container);
}

window.addEventListener('hashchange', () => {
  if (AuthService.isAuthenticated()) renderShell();
});

boot();

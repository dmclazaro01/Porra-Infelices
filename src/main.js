import { initSupabase, login, logout, joinGroup, fetchState, saveGroupPrediction, saveTiebreak, saveKnockoutPrediction, saveBonus, onAuthChange, getCurrentUser, getSessionToken } from './api.js';
import { getState, load, isLocked, isAdmin, canEditPredictions, subscribe, startLiveRefresh, stopLiveRefresh } from './state.js';
import { renderLogin, renderGroupChoice } from './render/login.js';
import { renderTopbar } from './render/topbar.js';
// renderTopbar reads state internally via getState()
import { renderGroups } from './render/groups.js';
import { renderKnockout } from './render/knockout.js';
import { renderBonus } from './render/bonus.js';
import { renderResults } from './render/results.js';
import { renderLeaderboard } from './render/leaderboard.js';
import { renderRules } from './render/rules.js';
import { renderPicks } from './render/picks.js';
import { renderAdmin } from './render/admin.js';

let activeTab = 'groups';

const app = document.getElementById('app');

function render() {
  const tabsEl = document.querySelector('.tabs');
  const savedScrollLeft = tabsEl ? tabsEl.scrollLeft : 0;
  app.textContent = '';
  const state = getState();
  if (!state || !state.profile) {
    renderLoginScreen();
    return;
  }
  if (state.profile.role === 'player' && !state.profile.group_name) {
    renderGroupChoiceScreen();
    return;
  }
  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.append(renderTopbar());
  const container = document.createElement('main');
  container.className = 'container';
  container.append(renderTabs());
  if (activeTab === 'groups') container.append(renderGroups());
  else if (activeTab === 'knockout') container.append(renderKnockout());
  else if (activeTab === 'bonus') container.append(renderBonus());
  else if (activeTab === 'results') container.append(renderResults());
  else if (activeTab === 'leaderboard') container.append(renderLeaderboard());
  else if (activeTab === 'rules') container.append(renderRules());
  else if (activeTab === 'picks') container.append(renderPicks());
  else if (activeTab === 'admin') container.append(renderAdmin());
  shell.append(container);
  app.append(shell);
  if (savedScrollLeft) {
    requestAnimationFrame(() => {
      const newTabs = document.querySelector('.tabs');
      if (newTabs) newTabs.scrollLeft = savedScrollLeft;
    });
  }
}

function renderLoginScreen() {
  const state = getState();
  const page = document.createElement('section');
  page.className = 'login-page';
  const panel = document.createElement('div');
  panel.className = 'login-panel';
  panel.append(document.createElement('div'));
  panel.querySelector('div').className = 'login-kicker';
  panel.querySelector('div').textContent = '⚽ Mundial 2026 ⚽';

  const h1 = document.createElement('h1');
  h1.className = 'epic-title';
  h1.textContent = 'Porras Infelices';
  panel.append(h1);

  const copy = document.createElement('p');
  copy.className = 'login-copy';
  const deadline = state?.settings?.lock_deadline;
  copy.textContent = `Cierre ${deadline ? new Date(deadline).toLocaleString('es-ES') : 'No definido'} · 48 selecciones · un bote · una gloria`;
  panel.append(copy);

  const form = document.createElement('form');
  form.className = 'login-form';
  const emailInput = document.createElement('input');
  emailInput.name = 'username';
  emailInput.type = 'text';
  emailInput.autocomplete = 'username';
  emailInput.placeholder = 'tu.usuario';
  emailInput.maxLength = 60;
  const passwordInput = document.createElement('input');
  passwordInput.name = 'password';
  passwordInput.type = 'password';
  passwordInput.autocomplete = 'current-password';
  passwordInput.placeholder = 'Contraseña';
  const error = document.createElement('div');
  error.className = 'error';
  const button = document.createElement('button');
  button.className = 'primary';
  button.type = 'submit';
  button.textContent = 'ENTRAR »';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    try {
      const raw = emailInput.value.trim();
      const email = raw.includes('@') ? raw : raw ? `${raw.toLowerCase()}@porra.fake` : '';
      await login(email, passwordInput.value);
      await load();
      render();
    } catch (exc) {
      error.textContent = exc.message;
    }
  });

  form.append(createField('Usuario', emailInput));
  form.append(createField('Contraseña', passwordInput));
  form.append(button);
  form.append(error);
  panel.append(form);
  page.append(panel);
  app.append(page);
}

function createField(label, control) {
  const l = document.createElement('label');
  l.className = 'field';
  const s = document.createElement('span');
  s.textContent = label;
  l.append(s, control);
  return l;
}

function renderGroupChoiceScreen() {
  const state = getState();
  const page = document.createElement('section');
  page.className = 'login-page';
  const panel = document.createElement('div');
  panel.className = 'login-panel group-choice';
  panel.append(document.createElement('div'));
  panel.querySelector('div').className = 'login-kicker';
  panel.querySelector('div').textContent = '⚽ Un último paso ⚽';

  const h1 = document.createElement('h1');
  h1.className = 'epic-title';
  h1.textContent = `Hola, ${state.profile?.name || ''}`;
  panel.append(h1);

  const copy = document.createElement('p');
  copy.className = 'login-copy';
  copy.textContent = '¿A qué grupo perteneces? Elige bien.';
  panel.append(copy);

  const error = document.createElement('div');
  error.className = 'error';
  const buttons = document.createElement('div');
  buttons.className = 'group-choice-buttons';
  (state.playerGroups || []).forEach((group, index) => {
    const groupName = group.name || group;
    const colorClasses = ['gb-c1', 'gb-c2', 'gb-c3', 'gb-c4', 'gb-c5', 'gb-c6'];
    const btn = document.createElement('button');
    btn.className = `group-choice-btn ${colorClasses[index % 6]}`;
    btn.textContent = groupName;
    btn.addEventListener('click', async () => {
      error.textContent = '';
      try {
        await joinGroup(state.profile.id, groupName);
        await load();
        render();
      } catch (exc) {
        error.textContent = exc.message;
      }
    });
    buttons.append(btn);
  });
  panel.append(buttons);
  panel.append(error);

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'ghost-button choice-logout';
  logoutBtn.textContent = 'Salir';
  logoutBtn.addEventListener('click', async () => { await logout(); await load(); render(); });
  panel.append(logoutBtn);
  page.append(panel);
  app.append(page);
}

function renderTabs() {
  const tabs = document.createElement('nav');
  tabs.className = 'tabs';
  const items = [];
  if (!isAdmin()) {
    items.push(['groups', 'Grupos'], ['bonus', '🏅 Bonus']);
  }
  items.push(['results', '⚽ Resultados']);
  items.push(['leaderboard', 'Clasificación']);
  items.push(['rules', 'ℹ️ Puntos']);
  items.push(['picks', isLocked() || isAdmin() ? '👀 Quinielas' : '🔒 Quinielas']);
  if (isAdmin()) items.push(['admin', 'Admin']);
  items.forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.className = `tab ${activeTab === id ? 'active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', () => { activeTab = id; render(); });
    tabs.append(btn);
  });
  return tabs;
}

const SYNC_INTERVAL_MS = 60 * 1000;

async function autoSyncIfStale() {
  const state = getState();
  if (!state) return;
  const lastSync = state.sync?.last_sync_at;
  if (lastSync) {
    const elapsed = Date.now() - new Date(lastSync).getTime();
    if (elapsed < SYNC_INTERVAL_MS) return;
  }
  try {
    const token = await getSessionToken();
    if (!token) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    await fetch(`${supabaseUrl}/functions/v1/sync-results`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await load();
  } catch (e) {
    console.warn('Auto-sync failed:', e);
  }
}

async function init() {
  initSupabase();
  try {
    await load();
  } catch (e) {
    console.warn('Load failed, showing login:', e);
  }
  render();
  startLiveRefresh();
  // first sync check after page settles to avoid disrupting user interaction
  setTimeout(autoSyncIfStale, 10000);
  // check again every 30s (also refreshes on visibility change in state.js)
  setInterval(autoSyncIfStale, 30000);
}

subscribe(() => {
  // Re-render on all tabs to reflect state changes (logout, data updates, etc.)
  render();
});

init();
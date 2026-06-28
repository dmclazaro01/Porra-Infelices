import { el, formatDate } from '../utils.js';
import { getState, isLocked, isAdmin } from '../state.js';
import * as api from '../api.js';
import { load } from '../state.js';

export function renderTopbar() {
  const state = getState();
  const profile = state?.profile;
  const settings = state?.settings || {};
  const name = profile?.name || '';
  const group = profile?.group_name || '';
  const locked = isLocked();
  const admin = isAdmin();

  // Show the upcoming knockout deadline while eliminatorias are still editable,
  // otherwise fall back to the main pool deadline.
  let deadline = settings.lock_deadline;
  let deadlineLabel = 'cierre';
  if (settings.knockout_lock_deadline && new Date(settings.knockout_lock_deadline) > new Date()) {
    deadline = settings.knockout_lock_deadline;
    deadlineLabel = 'cierre eliminatorias';
  }
  const deadlineText = deadline ? formatDate(deadline) : '';

  const topbar = el('div', { class: 'topbar' });
  const inner = el('div', { class: 'topbar-inner' });

  const brandArea = el('div', { class: 'brand' }, [
    el('span', { class: 'brand-ball' }, ['\u26BD']),
    ' Porras Infelices ',
    el('span', { class: 'brand-ball' }, ['\u26BD']),
  ]);
  inner.appendChild(brandArea);

  const statusParts = [name];
  if (group) statusParts.push(group);
  if (deadlineText) statusParts.push(`${deadlineLabel} ${deadlineText}`);
  const statusText = statusParts.join(' \u00b7 ');

  const statusLine = el('div', { class: 'status-line' }, [statusText]);
  inner.appendChild(statusLine);

  const actions = el('div', { class: 'topbar-actions' });

  if (locked) {
    actions.appendChild(el('span', { class: 'badge locked' }, ['\uD83D\uDD12 Bloqueado']));
  } else {
    actions.appendChild(el('span', { class: 'badge open' }, ['\uD83D\uDD13 Abierto']));
  }

  if (admin) {
    actions.appendChild(el('span', { class: 'badge admin-badge' }, ['\uD83D\uDC51 Admin']));
  }

  const logoutBtn = el('button', { class: 'ghost-button' }, ['Salir']);
  logoutBtn.addEventListener('click', async () => {
    try {
      await api.logout();
      await load();
    } catch (err) {
      console.error(err);
    }
  });
  actions.appendChild(logoutBtn);

  inner.appendChild(actions);
  topbar.appendChild(inner);

  return topbar;
}
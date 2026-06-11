import { el, field, formatDate, groupChip } from '../utils.js';
import { getState, isLocked } from '../state.js';
import * as api from '../api.js';
import { load } from '../state.js';

const GROUP_COLORS = ['navy', 'purple', 'teal', 'red', 'green', 'orange'];

export function renderLogin(state) {
  const settings = state?.settings || {};
  const deadline = settings.lock_deadline ? formatDate(settings.lock_deadline) : '';

  const page = el('div', { class: 'login-page' });

  const panel = el('div', { class: 'login-panel' });

  const kicker = el('p', { class: 'login-kicker' }, ['\u26BD Mundial 2026 \u26BD']);
  panel.appendChild(kicker);

  const title = el('h1', { class: 'epic-title' }, ['Porras Infelices']);
  panel.appendChild(title);

  if (deadline) {
    const copy = el('p', { class: 'login-copy' }, [`Cierre de ponencias: ${deadline}`]);
    panel.appendChild(copy);
  }

  const errorDiv = el('div', { class: 'error', id: 'login-error' });

  const form = el('form', { class: 'login-form' }, [
    field('Email', el('input', { type: 'email', name: 'email', required: '', autocomplete: 'email', placeholder: 'tu@email.com' })),
    field('Contraseña', el('input', { type: 'password', name: 'password', required: '', autocomplete: 'current-password', placeholder: '********' })),
    el('button', { type: 'submit', class: 'primary' }, ['ENTRAR \u00BB']),
    errorDiv,
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';
    const email = form.email.value.trim();
    const password = form.password.value;
    const btn = form.querySelector('.primary');
    try {
      btn.disabled = true;
      await api.login(email, password);
      await load();
    } catch (err) {
      errorDiv.textContent = err.message || 'Error al iniciar sesi\u00f3n';
    } finally {
      btn.disabled = false;
    }
  });

  panel.appendChild(form);
  page.appendChild(panel);

  const trophyCard = el('div', { class: 'trophy-card' }, [
    el('div', { class: 'trophy-banner' }, ['\uD83C\uDFC6']),
    el('div', { class: 'trophy-footer' }, ['\u00bfQui\u00e9n levantar\u00e1 la copa?']),
  ]);
  page.appendChild(trophyCard);

  return page;
}

export function renderGroupChoice(state) {
  const name = state?.profile?.name || 'Jugador';
  const userId = state?.profile?.id;
  const groups = state?.playerGroups || [];

  const page = el('div', { class: 'login-page' });

  const panel = el('div', { class: 'login-panel' });

  const greeting = el('h1', { class: 'epic-title' }, [`Hola, ${name}`]);
  panel.appendChild(greeting);

  const subtitle = el('p', { class: 'login-copy' }, ['Elige tu grupo']);
  panel.appendChild(subtitle);

  const groupContainer = el('div', { class: 'group-choice-buttons' });

  for (const group of groups) {
    const groupName = group.name || group;
    const index = groupName.charCodeAt(0) - 65;
    const colorClass = GROUP_COLORS[index % GROUP_COLORS.length];
    const chip = groupChip(groupName);
    const btn = el('button', { class: `group-choice-btn ${colorClass}` }, [groupName]);

    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        await api.joinGroup(userId, groupName);
        await load();
      } catch (err) {
        btn.disabled = false;
        alert(err.message || 'Error al unirse al grupo');
      }
    });

    groupContainer.appendChild(btn);
  }

  panel.appendChild(groupContainer);

  const logoutBtn = el('button', { class: 'ghost-button' }, ['Cerrar sesi\u00f3n']);
  logoutBtn.addEventListener('click', async () => {
    try {
      await api.logout();
      await load();
    } catch (err) {
      console.error(err);
    }
  });
  panel.appendChild(logoutBtn);

  page.appendChild(panel);
  return page;
}
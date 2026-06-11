import * as api from './api.js';

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'class') {
        node.className = val;
      } else if (key.startsWith('on')) {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else {
        node.setAttribute(key, val);
      }
    }
  }
  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  }
  return node;
}

export function renderLogin(app, state, onLogin) {
  app.innerHTML = '';

  const deadline = state.settings.lock_deadline
    ? new Date(state.settings.lock_deadline).toLocaleString('es-ES')
    : '';

  const form = el('form', { class: 'login-form' },
    el('h1', { class: 'login-title' }, 'Porras Infelices'),
    deadline
      ? el('p', { class: 'login-subtitle' }, `Se bloquea: ${deadline}`)
      : el('p', { class: 'login-subtitle' }, ''),
    el('input', { type: 'email', placeholder: 'Tu email', name: 'email', required: '', autocomplete: 'email' }),
    el('input', { type: 'password', placeholder: 'Contraseña', name: 'password', required: '', autocomplete: 'current-password' }),
    el('button', { type: 'submit', class: 'login-btn' }, 'Entrar'),
    el('div', { class: 'login-error', id: 'login-error' })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = form.querySelector('#login-error');
    errorDiv.textContent = '';

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      form.querySelector('.login-btn').disabled = true;
      await api.login(email, password);
      onLogin();
    } catch (err) {
      errorDiv.textContent = err.message || 'Error al iniciar sesión';
    } finally {
      form.querySelector('.login-btn').disabled = false;
    }
  });

  app.appendChild(form);
}

export function renderGroupChoice(app, state, onGroupChosen) {
  app.innerHTML = '';

  const name = state.profile?.name || 'Jugador';
  const userId = state.profile?.id;

  const container = el('div', { class: 'group-choice' },
    el('h1', { class: 'group-choice-title' }, `Hola, ${name}`),
    el('p', { class: 'group-choice-subtitle' }, 'Elige tu grupo')
  );

  const groups = state.playerGroups || [];
  for (const group of groups) {
    const groupName = group.name || group;
    const btn = el('button', { class: 'group-choice-btn' }, groupName);
    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        await api.joinGroup(userId, groupName);
        onGroupChosen();
      } catch (err) {
        btn.disabled = false;
        alert(err.message || 'Error al unirse al grupo');
      }
    });
    container.appendChild(btn);
  }

  app.appendChild(container);
}
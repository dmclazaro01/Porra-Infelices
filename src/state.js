import * as api from './api.js';

let state = null;
let listeners = [];
let refreshTimer = null;
let lockTimer = null;

export function getState() {
  return state;
}

export async function load() {
  try {
    state = await api.fetchState();
  } catch (e) {
    if (e.message === 'Not authenticated') {
      state = null;
    } else {
      console.warn('fetchState failed:', e.message);
    }
  }
  notifyListeners();
  scheduleLockRefresh();
  scheduleLiveRefresh();
  return state;
}

export function subscribe(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

export function isLocked() {
  if (!state) return true;
  if (state.settings.locked) return true;
  if (state.settings.lock_deadline) {
    return new Date(state.settings.lock_deadline) <= new Date();
  }
  return false;
}

export function isAdmin() {
  if (!state) return false;
  return state.profile.role === 'admin';
}

export function canEditPredictions() {
  if (!state) return false;
  // Both player and admin can edit predictions as long as they are active and the pool is not locked
  return state.profile.is_active && !isLocked();
}

// Cuando se pasa matchNumber la comprobación es más flexible: además de la
// autorización global (knockout_editable + deadline), un partido concreto que
// el admin haya listado en settings.editable_ko_matches también se considera
// editable. Sin argumento se conserva el contrato antiguo (edición global).
export function canEditKnockout(matchNumber) {
  if (!state) return false;
  if (!state.profile.is_active) return false;
  const globallyEditable = state.settings.knockout_editable === true &&
    (!state.settings.knockout_lock_deadline ||
      new Date(state.settings.knockout_lock_deadline) > new Date());
  if (globallyEditable) return true;
  if (!matchNumber) return false;
  const overrides = state.settings.editable_ko_matches;
  return Array.isArray(overrides) && overrides.includes(matchNumber);
}

// True cuando hay algún cruce (global o por override) que el usuario actual
// puede tocar. Útil para decidir si mostrar botones/tabs, aunque la mayoría
// del bracket esté bloqueado.
export function hasAnyKnockoutEditable() {
  if (!state || !state.profile.is_active) return false;
  if (canEditKnockout()) return true;
  const overrides = state.settings.editable_ko_matches;
  return Array.isArray(overrides) && overrides.length > 0;
}

function notifyListeners() {
  listeners.forEach(cb => cb(state));
}

function scheduleLockRefresh() {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }

  if (!state || !state.settings.lock_deadline || state.settings.locked) return;

  const deadline = new Date(state.settings.lock_deadline).getTime();
  const now = Date.now();
  const delay = deadline - now;

  if (delay <= 0) {
    load();
    return;
  }

  lockTimer = setTimeout(() => {
    lockTimer = null;
    load();
  }, delay + 1000);
}

function scheduleLiveRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') {
      load();
    }
  }, 60000);
}

export function startLiveRefresh() {
  scheduleLiveRefresh();
}

export function stopLiveRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
}
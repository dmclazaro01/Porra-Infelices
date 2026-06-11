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
    console.warn('Not authenticated, clearing state');
    state = null;
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
  return state.profile.role === 'player' && state.profile.is_active && !isLocked();
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
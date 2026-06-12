import { el, field } from '../utils.js';
import { getState, canEditPredictions, isLocked } from '../state.js';
import { saveBonus } from '../api.js';

let bonusLocal = {};
let serverBonus = {};
let saveTimer = null;

function debounceSaveBonus() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await saveBonus(bonusLocal.top_scorer || null, bonusLocal.best_player || null);
    serverBonus = { ...bonusLocal };
    updateIndicators();
  }, 500);
}

function updateIndicators() {
  document.querySelectorAll('[data-bonus-ind]').forEach(node => {
    const key = node.getAttribute('data-bonus-ind');
    const local = (bonusLocal[key] || '').trim();
    const saved = (serverBonus[key] || '').trim();
    if (!local && !saved) {
      node.textContent = 'Sin rellenar.';
      node.className = 'bonus-server empty';
    } else if (local === saved) {
      node.textContent = `✓ Guardado en el servidor: «${saved}»`;
      node.className = 'bonus-server ok';
    } else {
      node.textContent = saved ? `⏳ Guardando... (en el servidor: «${saved}»)` : '⏳ Guardando...';
      node.className = 'bonus-server pending';
    }
  });
}

export function renderBonus() {
  const state = getState();
  bonusLocal = { ...(state.bonus || {}) };
  serverBonus = { ...(state.bonus || {}) };
  const editable = canEditPredictions();
  const answers = state.bonus_answers || {};

  const wrap = el('section', { class: 'phase-section bonus-section' });

  const locked = isLocked();
  const right = el('div', { class: 'lock-banner-right' });
  right.append(el('span', { class: `badge ${canEditPredictions() ? 'open' : 'locked'}`, text: canEditPredictions() ? 'Editable' : 'Sin edición' }));
  wrap.append(el('div', { class: `lock-banner ${locked ? 'is-locked' : 'is-open'}` }, [
    el('div', {}, [
      el('strong', { text: locked ? 'Porra cerrada' : 'Porra abierta' }),
      el('span', { text: locked ? 'Lo guardado queda fijo.' : 'Acierta el pichichi y el mejor jugador.' }),
    ]),
    right,
  ]));

  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Bonus' }),
      el('p', { text: `Pichichi y MVP: +${5} puntos cada uno.` }),
    ]),
  ]));

  const panel = el('article', { class: 'panel bonus-panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', {}, [
      el('div', { class: 'panel-title', text: 'Tus apuestas estrella' }),
      el('div', { class: 'muted-line', text: editable ? 'Escribe el nombre del futbolista. Se guarda solo.' : 'Porra cerrada: esto ya no se toca.' }),
    ]),
    el('span', { class: 'burst', text: `+${5} PTS` }),
  ]));

  const fields = [
    { key: 'top_scorer', label: '🥇 Pichichi (máximo goleador)', placeholder: 'Ej: Mbappé' },
    { key: 'best_player', label: '⭐ Mejor jugador del torneo', placeholder: 'Ej: Lamine Yamal' },
  ];

  fields.forEach(({ key, label, placeholder }) => {
    const input = el('input', {
      type: 'text', maxlength: '60', placeholder,
      value: bonusLocal[key] || '',
      disabled: !editable ? 'disabled' : null,
    });
    input.addEventListener('input', () => {
      bonusLocal[key] = input.value;
      state.bonus = { ...bonusLocal };
      debounceSaveBonus();
    });
    const row = el('div', { class: 'bonus-field' });
    row.append(field(label, input));
    const indicator = el('div', { class: 'bonus-server empty', 'data-bonus-ind': key, text: 'Sin rellenar.' });
    row.append(indicator);
    if (answers[key]) {
      row.append(el('div', { class: 'muted-line bonus-official', text: `Oficial: ${answers[key]}` }));
    }
    panel.append(row);
  });

  if (editable) {
    const saveBtn = el('button', { class: 'primary bonus-save-btn', text: '💾 GUARDAR BONUS' });
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
      try {
        await saveBonus(bonusLocal.top_scorer || null, bonusLocal.best_player || null);
        serverBonus = { ...bonusLocal };
        saveBtn.textContent = '✓ GUARDADO';
        setTimeout(() => {
          saveBtn.textContent = '💾 GUARDAR BONUS';
          saveBtn.disabled = false;
        }, 2000);
      } catch (e) {
        saveBtn.textContent = '💾 GUARDAR BONUS';
        saveBtn.disabled = false;
        alert(e.message);
      }
      updateIndicators();
    });
    panel.append(el('div', { class: 'bonus-save-wrap' }, [saveBtn]));
  }

  wrap.append(panel);
  setTimeout(updateIndicators, 0);
  return wrap;
}
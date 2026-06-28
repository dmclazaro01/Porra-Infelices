import { el, teamInline } from '../utils.js';
import { getState, canEditPredictions, canEditKnockout, isLocked, isAdmin } from '../state.js';
import { saveKnockoutPrediction } from '../api.js';
import { resolveBracket, isBracketComplete } from '../bracket.js';

const BONUS_POINTS_INFO = 5;

const LEFT_ROUNDS = [
  { label: 'Dieciseisavos', matches: ['M73', 'M74', 'M75', 'M76', 'M77', 'M78', 'M79', 'M80'] },
  { label: 'Octavos', matches: ['M89', 'M90', 'M93', 'M94'] },
  { label: 'Cuartos', matches: ['M97', 'M98'] },
  { label: 'Semis', matches: ['M101'] },
];

const RIGHT_ROUNDS = [
  { label: 'Semis', matches: ['M102'] },
  { label: 'Cuartos', matches: ['M99', 'M100'] },
  { label: 'Octavos', matches: ['M91', 'M92', 'M95', 'M96'] },
  { label: 'Dieciseisavos', matches: ['M81', 'M82', 'M83', 'M84', 'M85', 'M86', 'M87', 'M88'] },
];

const ROUND_LABELS = { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semifinales', THIRD: '3er puesto', FINAL: 'Final' };

let knockoutPredictions = {};
let saveTimers = {};

function debounceSaveKnockout(matchNumber, winnerId) {
  clearTimeout(saveTimers[`ko-${matchNumber}`]);
  saveTimers[`ko-${matchNumber}`] = setTimeout(() => {
    saveKnockoutPrediction(matchNumber, winnerId);
  }, 300);
}

function renderLockBanner() {
  const locked = isLocked();
  const koEditable = canEditKnockout();
  const editable = canEditPredictions() || koEditable;
  const right = el('div', { class: 'lock-banner-right' });
  if (editable) {
    const saveBtn = el('button', { class: 'force-save', text: '💾 Forzar guardado' });
    saveBtn.addEventListener('click', async () => {
      saveBtn.textContent = '⏳ Guardando...';
      saveBtn.disabled = true;
      try {
        const jobs = Object.entries(knockoutPredictions).map(([mn, wid]) => saveKnockoutPrediction(mn, wid));
        await Promise.all(jobs);
        saveBtn.textContent = '✓ Guardado';
        setTimeout(() => {
          saveBtn.textContent = '💾 Forzar guardado';
          saveBtn.disabled = false;
        }, 2000);
      } catch (e) {
        console.error('Error saving knockout:', e);
        saveBtn.textContent = '❌ Error: ' + e.message;
        setTimeout(() => {
          saveBtn.textContent = '💾 Forzar guardado';
          saveBtn.disabled = false;
        }, 3000);
      }
    });
    right.append(saveBtn);
  }
  right.append(el('span', { class: `badge ${editable ? 'open' : 'locked'}`, text: koEditable ? 'Eliminatorias editables' : editable ? 'Editable' : 'Sin edición' }));
  const bannerText = locked ? (koEditable ? 'Solo eliminatorias editables' : 'Porra cerrada') : 'Porra abierta';
  return el('div', { class: `lock-banner ${locked ? 'is-locked' : 'is-open'}` }, [
    el('div', {}, [
      el('strong', { text: bannerText }),
      el('span', { text: koEditable ? 'Puedes modificar las eliminatorias. Grupos y bonus están fijos.' : locked ? 'Lo guardado queda fijo.' : 'Predice los ganadores de cada cruce.' }),
    ]),
    right,
  ]);
}

function buildBracketFromModule(state) {
  const resolved = resolveBracket(state, { realMode: false });
  const result = {};
  for (const [mn, data] of Object.entries(resolved)) {
    result[mn] = {
      match_number: mn,
      round: data.round,
      label_a: data.label_a,
      label_b: data.label_b,
      team_a: data.team_a,
      team_b: data.team_b,
      winner: data.winner,
      next: data.round === 'FINAL' ? null : data.round,
    };
  }
  return result;
}

function renderKoMatch(matchData, side) {
  const card = el('div', { class: `ko-match ${side}` });
  const nextLabel = matchData.next ? `→ ${matchData.next}` : matchData.match_number === 'M104' ? 'Campeón' : '';
  card.append(el('div', { class: 'ko-title' }, [
    el('span', { text: matchData.match_number }),
    el('span', { text: nextLabel }),
  ]));
  [['team_a', matchData.label_a], ['team_b', matchData.label_b]].forEach(([slot, fallback]) => {
    const teamId = matchData[slot];
    card.append(el('button', {
      class: `winner ${matchData.winner === teamId ? 'active' : ''}`,
      disabled: (!canEditPredictions() && !canEditKnockout()) || !teamId ? 'disabled' : null,
      onclick: () => {
        if ((!canEditPredictions() && !canEditKnockout()) || !teamId) return;
        knockoutPredictions[matchData.match_number] = teamId;
        debounceSaveKnockout(matchData.match_number, teamId);
        rebuild();
      },
    }, [teamInline(teamId, fallback)]));
  });
  return card;
}

function renderBracketSide(bracket, rounds, side) {
  const sideNode = el('div', { class: `bracket-side ${side}` });
  rounds.forEach(round => {
    const col = el('div', { class: 'round-column' }, [el('h3', { text: round.label })]);
    round.matches.forEach(mn => {
      if (bracket[mn]) col.append(renderKoMatch(bracket[mn], side));
    });
    sideNode.append(col);
  });
  return sideNode;
}

function renderFinalColumn(bracket) {
  return el('div', { class: 'final-column' }, [
    el('h3', { text: 'Final' }),
    renderKoMatch(bracket.M104, 'center'),
    el('h3', { text: '3º puesto' }),
    renderKoMatch(bracket.M103, 'center'),
  ]);
}

let container = null;

function rebuild() {
  if (!container) return;
  container.textContent = '';
  container.append(buildContent());
}

function buildContent() {
  const state = getState();
  const fragment = document.createDocumentFragment();
  const groupMatchesCount = state.matches.filter(m => m.stage === 'GROUP').length;
  const filledGroupPredictions = Object.keys(state.predictions || {}).filter(id => state.matches.find(m => m.id === id && m.stage === 'GROUP')).length;
  const koEditable = canEditKnockout();

  if (filledGroupPredictions < groupMatchesCount && groupMatchesCount > 0 && !isAdmin() && !koEditable) {
    fragment.append(renderLockBanner());
    const waiting = el('div', { class: 'empty-state' });
    waiting.append(el('h2', { text: 'Eliminatorias' }));
    waiting.append(el('p', { text: 'Termina primero tus predicciones de la fase de grupos para desbloquear las eliminatorias.' }));
    fragment.append(waiting);
    return fragment;
  }

  const bracket = buildBracketFromModule(state);
  fragment.append(renderLockBanner());
  fragment.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Eliminatorias' }),
      el('p', { text: 'Dos lados conectados hacia la final.' }),
    ]),
  ]));
  fragment.append(el('div', { class: 'bracket-board' }, [
    renderBracketSide(bracket, LEFT_ROUNDS, 'left'),
    renderFinalColumn(bracket),
    renderBracketSide(bracket, RIGHT_ROUNDS, 'right'),
  ]));
  return fragment;
}

export function renderKnockout() {
  const state = getState();
  knockoutPredictions = { ...(state.knockout_predictions || {}) };
  container = el('section', { class: 'phase-section knockout-section' });
  container.append(buildContent());
  return container;
}
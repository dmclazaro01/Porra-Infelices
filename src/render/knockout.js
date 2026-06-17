import { el, teamInline } from '../utils.js';
import { getState, canEditPredictions, canEditKnockout, isLocked, isAdmin } from '../state.js';
import { saveKnockoutPrediction } from '../api.js';
import { computeGroupStandings, getBestThirds } from '../scoring.js';

const BONUS_POINTS_INFO = 5;

const LEFT_ROUNDS = [
  { label: 'Dieciseisavos', matches: ['M73', 'M74', 'M75', 'M77', 'M83', 'M84', 'M81', 'M82'] },
  { label: 'Octavos', matches: ['M89', 'M90', 'M93', 'M94'] },
  { label: 'Cuartos', matches: ['M97', 'M98'] },
  { label: 'Semis', matches: ['M101'] },
];

const RIGHT_ROUNDS = [
  { label: 'Semis', matches: ['M102'] },
  { label: 'Cuartos', matches: ['M99', 'M100'] },
  { label: 'Octavos', matches: ['M91', 'M92', 'M95', 'M96'] },
  { label: 'Dieciseisavos', matches: ['M76', 'M78', 'M79', 'M80', 'M86', 'M88', 'M85', 'M87'] },
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

function buildBracket(state) {
  const standingsByGroup = {};
  const groups = state.groups || [];
  for (const group of groups) {
    const matches = state.matches.filter(m => m.group_letter === group.letter && m.stage === 'GROUP');
    standingsByGroup[group.letter] = computeGroupStandings(group.letter, matches, state.predictions || {}, state.tiebreaks || {});
  }

  const groupWinners = {};
  const groupRunnersUp = {};
  const groupThirds = {};
  for (const [letter, standings] of Object.entries(standingsByGroup)) {
    if (standings.length >= 1) groupWinners[letter] = standings[0].team_id;
    if (standings.length >= 2) groupRunnersUp[letter] = standings[1].team_id;
    if (standings.length >= 3) groupThirds[letter] = standings[2].team_id;
  }

  const bestThirds = getBestThirds(groups, state.matches.filter(m => m.stage === 'GROUP'), state.predictions || {}, state.tiebreaks || {});

  const bracket = {};
  const stateMatches = state.matches || [];
  const matchMap = {};
  stateMatches.forEach(m => { matchMap[m.match_number] = m; });

  function resolveTeam(label) {
    if (!label) return null;
    if (label.startsWith('W') && label.length >= 4) {
      const mn = label.substring(1);
      if (knockoutPredictions[mn]) return knockoutPredictions[mn];
      return null;
    }
    if (label.startsWith('L') && label.length >= 4) {
      const mn = label.substring(1);
      const winner = knockoutPredictions[mn];
      if (!winner || !matchMap[mn]) return null;
      const match = matchMap[mn];
      return match.home_team_id === winner ? match.away_team_id : match.home_team_id;
    }
    if (/^[12][A-L]$/.test(label)) {
      const pos = label[0];
      const grp = label[1];
      return pos === '1' ? groupWinners[grp] : groupRunnersUp[grp];
    }
    if (label.startsWith('3')) {
      return bestThirds[0] || null;
    }
    return null;
  }

  function getKnockoutMatch(mn) {
    const match = matchMap[mn];
    if (!match) return null;
    const teamA = match.home_team_id || resolveTeam(match.home_label);
    const teamB = match.away_team_id || resolveTeam(match.away_label);
    const winner = knockoutPredictions[mn] || null;
    const nextMatch = match.round === 'FINAL' ? null : match.round;
    return {
      match_number: mn,
      round: match.round,
      label_a: match.home_label,
      label_b: match.away_label,
      team_a: teamA,
      team_b: teamB,
      winner: winner,
      next: nextMatch,
    };
  }

  const allMatchNumbers = stateMatches.filter(m => m.stage === 'KNOCKOUT').map(m => m.match_number);
  allMatchNumbers.forEach(mn => { bracket[mn] = getKnockoutMatch(mn); });
  return bracket;
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

  if (filledGroupPredictions < groupMatchesCount && groupMatchesCount > 0 && !isAdmin()) {
    fragment.append(renderLockBanner());
    fragment.append(el('div', { class: 'empty-state' }, [
      el('h2', { text: 'Eliminatorias' }),
      el('p', { text: 'Completa todos los grupos para abrir el cuadro.' }),
    ]));
    return fragment;
  }

  const bracket = buildBracket(state);
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
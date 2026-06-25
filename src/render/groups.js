import { el, teamInline, formatPoints, groupMatches } from '../utils.js';
import { getState, canEditPredictions, isLocked } from '../state.js';
import { saveGroupPrediction, saveTiebreak } from '../api.js';
import { computeGroupStandings } from '../scoring.js';

let predictions = {};
let tiebreaks = {};
let saveTimers = {};

function debounceSavePrediction(matchId, prediction) {
  clearTimeout(saveTimers[`pred-${matchId}`]);
  saveTimers[`pred-${matchId}`] = setTimeout(() => {
    saveGroupPrediction(matchId, prediction);
  }, 300);
}

async function handleTiebreakSwap(letter, standings, index, direction) {
  if (!canEditPredictions()) return;
  const target = index + direction;
  if (target < 0 || target >= standings.length) return;
  if (standings[index].points !== standings[target].points) return;
  const order = standings.map(row => row.team_id);
  [order[index], order[target]] = [order[target], order[index]];
  tiebreaks[letter] = order;
  try {
    await saveTiebreak(letter, order);
  } catch (e) {
    console.error('Error saving tiebreak:', e);
    alert('Error al guardar el desempate: ' + e.message);
  }
  rebuild();
}

function renderLockBanner() {
  const locked = isLocked();
  const state = getState();
  const inactive = state.participant?.role === 'player' && !state.participant?.is_active;
  const right = el('div', { class: 'lock-banner-right' });
  if (canEditPredictions()) {
    const saveBtn = el('button', { class: 'force-save', text: '💾 Forzar guardado' });
    saveBtn.addEventListener('click', () => forceSaveAll(saveBtn));
    right.append(saveBtn);
  }
  right.append(el('span', { class: `badge ${canEditPredictions() ? 'open' : 'locked'}`, text: canEditPredictions() ? 'Editable' : 'Sin edición' }));
  return el('div', { class: `lock-banner ${locked ? 'is-locked' : 'is-open'}` }, [
    el('div', {}, [
      el('strong', { text: inactive ? 'Jugador no activo' : locked ? 'Porra cerrada' : 'Porra abierta' }),
      el('span', { text: locked ? 'Lo guardado queda fijo.' : `Bloqueo: ${state.settings?.lock_deadline ? new Date(state.settings.lock_deadline).toLocaleString('es-ES') : 'No definido'}` }),
    ]),
    right,
  ]);
}

async function forceSaveAll(btn) {
  if (btn) {
    btn.textContent = '⏳ Guardando...';
    btn.disabled = true;
  }
  try {
    const jobs = [];
    for (const [matchId, pred] of Object.entries(predictions)) {
      jobs.push(saveGroupPrediction(matchId, pred));
    }
    for (const [letter, order] of Object.entries(tiebreaks)) {
      jobs.push(saveTiebreak(letter, order));
    }
    await Promise.all(jobs);
    if (btn) {
      btn.textContent = '✓ Guardado';
      setTimeout(() => {
        btn.textContent = '💾 Forzar guardado';
        btn.disabled = false;
      }, 2000);
    }
  } catch (e) {
    console.error('Error saving:', e);
    if (btn) {
      btn.textContent = '❌ Error: ' + e.message;
      setTimeout(() => {
        btn.textContent = '💾 Forzar guardado';
        btn.disabled = false;
      }, 3000);
    }
  }
}

function getMatchActual(match) {
  if (match.actual_home_score == null || match.actual_away_score == null) return null;
  if (match.actual_home_score > match.actual_away_score) return '1';
  if (match.actual_home_score < match.actual_away_score) return '2';
  return 'X';
}

function renderMatchRow(match) {
  const editable = canEditPredictions();
  const pred = predictions[match.id] || null;
  const actual = getMatchActual(match);
  const played = actual !== null;
  const correct = played && pred && pred === actual;
  const wrong = played && pred && pred !== actual;
  const missed = played && !pred;

  const rowClasses = ['match-row'];
  if (correct) rowClasses.push('match-correct');
  else if (wrong) rowClasses.push('match-wrong');
  else if (missed) rowClasses.push('match-missed');
  else if (played) rowClasses.push('match-pending-result');

  const row = el('div', { class: rowClasses.join(' '), 'data-match': match.id });
  row.append(el('div', { class: 'team-block right' }, [teamInline(match.home_team_id, match.home_label || 'TBD')]));
  const middle = el('div', { class: 'match-middle' });
  const choices = el('div', { class: 'choices' });
  ['1', 'X', '2'].forEach(outcome => {
    const oddsMap = { '1': match.odds_home_decimal, 'X': match.odds_draw_decimal, '2': match.odds_away_decimal };
    const odds = oddsMap[outcome];
    const isCorrectChoice = played && actual === outcome;
    const isWrongChoice = played && pred === outcome && actual !== outcome;
    const btnClass = [
      'choice',
      pred === outcome ? 'active' : '',
      isCorrectChoice ? 'choice-correct' : '',
      isWrongChoice ? 'choice-wrong' : '',
    ].filter(Boolean).join(' ');
    const btn = el('button', {
      class: btnClass,
      disabled: !editable ? 'disabled' : null,
      onclick: () => {
        if (!editable) return;
        predictions[match.id] = outcome;
        debounceSavePrediction(match.id, outcome);
        rebuild();
      }
    }, [
      el('span', { class: 'choice-sign', text: outcome }),
      el('small', { class: 'choice-odds', text: odds ? formatPoints(Number(odds)) : '·' }),
    ]);
    choices.append(btn);
  });
  middle.append(choices);

  if (match.kickoff_at) {
    middle.append(el('div', { class: 'match-time', text: new Date(match.kickoff_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }));
  }

  if (played && match.actual_home_score != null && match.actual_away_score != null) {
    const scoreText = `${match.actual_home_score} - ${match.actual_away_score}`;
    const mark = correct
      ? el('span', { class: 'match-mark ok', text: '✓' })
      : wrong
        ? el('span', { class: 'match-mark bad', text: '✕' })
        : el('span', { class: 'match-mark pending', text: '·' });
    const status = correct
      ? el('span', { class: 'match-status ok', text: 'Acertado' })
      : wrong
        ? el('span', { class: 'match-status bad', text: 'Fallado' })
        : el('span', { class: 'match-status pending', text: 'Sin pick' });
    middle.append(el('div', { class: 'match-result' }, [
      mark,
      el('span', { class: 'match-score', text: scoreText }),
      status,
    ]));
  }

  row.append(middle);
  row.append(el('div', { class: 'team-block left' }, [teamInline(match.away_team_id, match.away_label || 'TBD')]));
  return row;
}

function renderStandings(standings, letter) {
  const editable = canEditPredictions();
  const tieRows = new Set();
  standings.forEach((row, i) => {
    if (i > 0 && row.points === standings[i - 1].points) {
      tieRows.add(standings[i - 1].team_id);
      tieRows.add(row.team_id);
    }
  });
  const showArrows = tieRows.size > 0 && editable;
  const table = el('table', { class: 'standings' });
  const thead = el('thead');
  const headers = ['#', 'Equipo', 'Pts', 'PJ', 'G', 'E', 'P'];
  if (showArrows) headers.push('');
  thead.append(el('tr', {}, headers.map(h => el('th', { text: h }))));
  table.append(thead);
  const tbody = el('tbody');
  standings.forEach((row, index) => {
    const rowClass = row.position <= 2 ? 'qualified' : row.position === 3 ? 'third-place' : '';
    const isTied = tieRows.has(row.team_id);
    const cells = [
      el('td', { text: String(row.position) }),
      el('td', {}, [teamInline(row.team_id)]),
      el('td', { text: String(row.points) }),
      el('td', { text: String(row.played) }),
      el('td', { text: String(row.won) }),
      el('td', { text: String(row.drawn) }),
      el('td', { text: String(row.lost) }),
    ];
    if (showArrows) {
      const arrows = el('td', { class: 'tie-arrows' });
      if (isTied) {
        if (index > 0 && standings[index - 1].points === row.points) {
          arrows.append(el('button', { class: 'tie-btn', text: '▲', onclick: () => handleTiebreakSwap(letter, standings, index, -1) }));
        }
        if (index < standings.length - 1 && standings[index + 1].points === row.points) {
          arrows.append(el('button', { class: 'tie-btn', text: '▼', onclick: () => handleTiebreakSwap(letter, standings, index, 1) }));
        }
      }
      cells.push(arrows);
    }
    tbody.append(el('tr', { class: `${rowClass} ${isTied ? 'tied-row' : ''}` }, cells));
  });
  table.append(tbody);
  return table;
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
  fragment.append(renderLockBanner());
  const heading = el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Fase de grupos' }),
      el('p', { text: 'Formato 1-X-2 con clasificación calculada al momento.' }),
    ]),
  ]);
  fragment.append(heading);
  const hasKnockout = Object.keys(state.knockout_predictions || {}).length > 0;
  if (canEditPredictions() && hasKnockout) {
    fragment.append(el('div', { class: 'ko-disclaimer' }, [
      el('strong', { text: '⚠ AVISO: ' }),
      el('span', { text: 'Ya tienes la eliminatoria rellena. Cualquier cambio aquí recalcula los cruces.' }),
    ]));
  }
  const grid = el('div', { class: 'group-grid' });
  for (const group of state.groups) {
    grid.append(renderGroup(group));
  }
  fragment.append(grid);
  return fragment;
}

function renderGroup(group) {
  const matches = groupMatches(getState(), group.letter);
  const standings = computeGroupStandings(group.letter, matches, predictions, tiebreaks[group.letter]);
  const completed = matches.filter(m => predictions[m.id]).length;
  const panel = el('article', { class: `panel group-card group-${group.letter}`, 'data-group': group.letter });

  const strip = el('div', { class: 'group-strip' });
  (group.team_ids || []).forEach(tid => strip.append(teamInline(tid, '', { full: true })));
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', {}, [
      el('div', { class: 'panel-title', text: `Grupo ${group.letter}` }),
      strip,
    ]),
    el('span', { class: 'badge', text: `${completed}/6` }),
  ]));

  for (const match of matches) {
    panel.append(renderMatchRow(match));
  }

  panel.append(renderStandings(standings, group.letter));

  if (standings.some((row, i) => i > 0 && row.points === standings[i - 1].points)) {
    panel.append(el('div', { class: 'tie-notice' }, [
      el('strong', { text: '⚠ Empate a puntos. ' }),
      el('span', { text: canEditPredictions() ? 'Usa ▲▼ para decidir el orden.' : 'Orden según desempate guardado.' }),
    ]));
  }
  return panel;
}

export function renderGroups() {
  const state = getState();
  predictions = { ...(state.predictions || {}) };
  tiebreaks = { ...(state.tiebreaks || {}) };
  container = el('section', { class: 'phase-section' });
  container.append(buildContent());
  return container;
}
import { el, teamInline, formatDate, groupMatches } from '../utils.js';
import { getState } from '../state.js';
import { computeGroupStandings } from '../scoring.js';

function computeRealStandingsForGroup(letter, matches) {
  const state = getState();
  const group = state.groups.find(g => g.letter === letter);
  if (!group) return [];
  const realResults = {};
  for (const m of matches) {
    if (m.status !== 'finished' && m.actual_home_score === null) continue;
    if (m.actual_home_score > m.actual_away_score) realResults[m.id] = '1';
    else if (m.actual_home_score < m.actual_away_score) realResults[m.id] = '2';
    else realResults[m.id] = 'X';
  }
  return computeGroupStandings(letter, matches, realResults, null);
}

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'];
const ROUND_TITLES = { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semifinales', THIRD: '3er puesto', FINAL: 'GRAN FINAL' };

function renderResultRow(match, options = {}) {
  const row = el('div', { class: `result-row ${match.status} ${options.big ? 'big' : ''}` });
  const home = match.home_team_id
    ? teamInline(match.home_team_id)
    : el('span', { class: 'seed-label', text: match.home_label || '?' });
  const away = match.away_team_id
    ? teamInline(match.away_team_id)
    : el('span', { class: 'seed-label', text: match.away_label || '?' });
  const homeBox = el('div', { class: 'result-team home' }, [home]);
  const awayBox = el('div', { class: 'result-team away' }, [away]);
  const middle = el('div', { class: 'result-middle' });
  const hasScore = match.actual_home_score !== null && match.actual_home_score !== undefined
    && match.actual_away_score !== null && match.actual_away_score !== undefined;
  if (hasScore) {
    middle.append(el('span', { class: 'score', text: `${match.actual_home_score} - ${match.actual_away_score}` }));
    if (match.status === 'live') {
      middle.append(el('span', { class: 'live-dot', text: 'EN VIVO' }));
    } else if (match.stage === 'KNOCKOUT' && match.actual_winner_team_id && match.actual_home_score === match.actual_away_score) {
      middle.append(el('span', { class: 'result-when', text: `Pasa ${teamName(match.actual_winner_team_id)}` }));
    }
  } else if (match.status === 'live') {
    middle.append(el('span', { class: 'live-dot', text: 'EN VIVO' }));
  } else {
    middle.append(el('span', { class: 'result-when', text: match.kickoff_at ? formatDate(match.kickoff_at) : 'Por programar' }));
  }
  if (match.stage === 'KNOCKOUT') {
    row.append(el('div', { class: 'result-code', text: match.match_number || '' }));
  }
  row.append(homeBox, middle, awayBox);
  return row;
}

function renderResultGroup(group, state) {
  const matches = state.matches.filter(m => m.group_letter === group.letter && m.stage === 'GROUP')
    .sort((a, b) => {
      if (a.kickoff_at && b.kickoff_at) return new Date(a.kickoff_at) - new Date(b.kickoff_at);
      if (a.kickoff_at) return -1;
      if (b.kickoff_at) return 1;
      return (a.match_number || '').localeCompare(b.match_number || '');
    });
  const finals = matches.filter(m => m.status === 'finished' || m.actual_home_score !== null);
  const panel = el('article', { class: `panel group-card group-${group.letter}` });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: `Grupo ${group.letter}` }),
    el('span', { class: 'badge', text: `${finals.length}/6 jugados` }),
  ]));
  matches.forEach(match => panel.append(renderResultRow(match)));
  if (finals.length) {
    panel.append(computeRealStandingsForGroup(group.letter, matches));
  }
  return panel;
}

function computeRealStandingsFromGroup(letter, matches) {
  const state = getState();
  const group = state.groups.find(g => g.letter === letter);
  if (!group) return el('div');
  const standings = computeRealStandings(letter, matches);
  const table = el('table', { class: 'standings' });
  const thead = el('thead');
  thead.append(el('tr', {}, ['#', 'Equipo', 'Pts', 'PJ', 'G', 'E', 'P'].map(h => el('th', { text: h }))));
  table.append(thead);
  const tbody = el('tbody');
  standings.forEach(row => {
    const rowClass = row.position <= 2 ? 'qualified' : row.position === 3 ? 'third-place' : '';
    tbody.append(el('tr', { class: rowClass }, [
      el('td', { text: String(row.position) }),
      el('td', {}, [teamInline(row.team_id)]),
      el('td', { text: String(row.points) }),
      el('td', { text: String(row.played) }),
      el('td', { text: String(row.won) }),
      el('td', { text: String(row.drawn) }),
      el('td', { text: String(row.lost) }),
    ]));
  });
  table.append(tbody);
  return table;
}

function teamName(teamId) {
  if (!teamId) return '?';
  const state = getState();
  const team = state.teams.find(t => t.id === teamId);
  return team ? team.name : teamId;
}

export function renderResults() {
  const state = getState();
  const wrap = el('section', { class: 'phase-section results-section' });
  const sync = state.sync || {};

  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Resultados reales' }),
      el('p', { text: sync.last_sync_at ? `Marcadores oficiales · actualizado ${formatDate(sync.last_sync_at)}` : 'Marcadores oficiales · se refresca solo' }),
    ]),
  ]));

  const liveMatches = state.matches.filter(m => m.status === 'live');
  if (liveMatches.length) {
    const liveBox = el('div', { class: 'live-board' });
    liveBox.append(el('h3', { class: 'live-title', text: '🔴 EN JUEGO AHORA' }));
    liveMatches.forEach(match => liveBox.append(renderResultRow(match, { big: true })));
    wrap.append(liveBox);
  }

  wrap.append(el('h3', { class: 'results-block-title', text: 'Fase de grupos' }));
  const grid = el('div', { class: 'group-grid' });
  for (const group of state.groups) {
    grid.append(renderResultGroup(group, state));
  }
  wrap.append(grid);

  wrap.append(el('h3', { class: 'results-block-title', text: 'Eliminatorias' }));
  const knockoutMatches = state.matches.filter(m => m.stage === 'KNOCKOUT');
  const byRound = {};
  knockoutMatches.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
  const koWrap = el('div', { class: 'results-knockout' });
  ROUND_ORDER.forEach(round => {
    const matches = (byRound[round] || []).sort((a, b) => (a.match_number || '').localeCompare(b.match_number || ''));
    if (!matches.length) return;
    const known = matches.filter(m => m.home_team_id || m.away_team_id).length;
    const block = el('article', { class: `panel ko-results-block ${round === 'FINAL' ? 'is-final' : ''}` });
    block.append(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-title', text: ROUND_TITLES[round] || round }),
      el('span', { class: 'badge', text: known ? `${known}/${matches.length} definidos` : 'Por definir' }),
    ]));
    matches.forEach(match => block.append(renderResultRow(match)));
    koWrap.append(block);
  });
  wrap.append(koWrap);
  return wrap;
}
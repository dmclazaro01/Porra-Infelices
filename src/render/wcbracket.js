import { el, teamInline } from '../utils.js';
import { getState } from '../state.js';
import { resolveBracket, isBracketComplete } from '../bracket.js';

const LEFT_ROUNDS = [
  { label: 'Dieciseisavos', matches: ['M74', 'M77', 'M73', 'M75', 'M76', 'M78', 'M79', 'M80'] },
  { label: 'Octavos', matches: ['M89', 'M90', 'M93', 'M94'] },
  { label: 'Cuartos', matches: ['M97', 'M98'] },
  { label: 'Semis', matches: ['M101'] },
];

const RIGHT_ROUNDS = [
  { label: 'Semis', matches: ['M102'] },
  { label: 'Cuartos', matches: ['M99', 'M100'] },
  { label: 'Octavos', matches: ['M91', 'M92', 'M95', 'M96'] },
  { label: 'Dieciseisavos', matches: ['M83', 'M84', 'M81', 'M82', 'M86', 'M88', 'M85', 'M87'] },
];

const STATUS_BADGE = {
  scheduled: { icon: '⏳', text: 'Pendiente' },
  live: { icon: '🔴', text: 'EN VIVO' },
  finished: { icon: '✓', text: 'Finalizado' },
};

function renderBanner(state) {
  const r32Matches = state.matches.filter(m => m.stage === 'KNOCKOUT' && m.round === 'R32');
  const r32Defined = r32Matches.filter(m => m.home_team_id && m.away_team_id).length;
  const complete = isBracketComplete(state);
  return el('div', { class: `lock-banner ${complete ? 'is-open' : 'is-locked'}` }, [
    el('div', {}, [
      el('strong', { text: complete ? 'Cuadro completo' : 'Cuadro en construcción' }),
      el('span', { text: complete ? 'Los 16 cruces de dieciseisavos están definidos.' : `${r32Defined}/16 cruces de dieciseisavos definidos.` }),
    ]),
    el('span', { class: `badge ${complete ? 'open' : 'locked'}`, text: 'Solo lectura' }),
  ]);
}

function renderMatch(matchData) {
  const card = el('div', { class: 'wc-match' });
  const badge = STATUS_BADGE[matchData.status] || STATUS_BADGE.scheduled;
  card.append(el('div', { class: 'wc-match-title' }, [
    el('span', { text: matchData.match_number || '' }),
    el('span', { class: 'wc-match-status', text: `${badge.icon} ${badge.text}` }),
  ]));
  [['team_a', matchData.label_a], ['team_b', matchData.label_b]].forEach(([slot, fallback]) => {
    const teamId = matchData[slot];
    const isWinner = matchData.winner === teamId;
    const row = el('div', { class: `wc-team-row ${isWinner ? 'winner-team' : ''}` });
    row.append(teamInline(teamId, fallback));
    card.append(row);
  });
  if (matchData.isProvisional) {
    card.append(el('div', { class: 'wc-provisional-note', text: '⚠ Pendiente de confirmar' }));
  }
  return card;
}

function renderSide(bracket, rounds, side) {
  const sideNode = el('div', { class: `bracket-side ${side}` });
  rounds.forEach(round => {
    const col = el('div', { class: 'round-column' }, [el('h3', { text: round.label })]);
    round.matches.forEach(mn => {
      if (bracket[mn]) col.append(renderMatch(bracket[mn]));
    });
    sideNode.append(col);
  });
  return sideNode;
}

function renderFinalColumn(bracket) {
  return el('div', { class: 'final-column' }, [
    el('h3', { text: 'Final' }),
    bracket.M104 ? renderMatch(bracket.M104) : el('div'),
    el('h3', { text: '3er puesto' }),
    bracket.M103 ? renderMatch(bracket.M103) : el('div'),
  ]);
}

function buildContent(state) {
  const fragment = document.createDocumentFragment();
  const bracket = resolveBracket(state, { realMode: true });
  fragment.append(renderBanner(state));
  fragment.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Cuadro real' }),
      el('p', { text: 'Cómo se va formando el Mundial 2026 a partir de los resultados.' }),
    ]),
  ]));
  fragment.append(el('div', { class: 'bracket-board' }, [
    renderSide(bracket, LEFT_ROUNDS, 'left'),
    renderFinalColumn(bracket),
    renderSide(bracket, RIGHT_ROUNDS, 'right'),
  ]));
  return fragment;
}

export function renderWcBracket() {
  const state = getState();
  if (!state) {
    return el('section', { class: 'phase-section wcbracket-section' }, [
      el('div', { class: 'empty-state' }, [
        el('h2', { text: 'Cuadro real' }),
        el('p', { text: 'Inicia sesión para ver el cuadro.' }),
      ]),
    ]);
  }
  const section = el('section', { class: 'phase-section wcbracket-section' });
  section.append(buildContent(state));
  return section;
}

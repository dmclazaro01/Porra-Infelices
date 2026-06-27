import { el, formatDate, formatMoney, groupChip, paymentPill } from '../utils.js';
import { getState, isAdmin } from '../state.js';
import { computePointsBreakdown } from '../scoring.js';

function fmtPts(n) {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function renderMyBreakdown(state) {
  const me = state.profile?.id;
  if (!me) return null;
  const breakdown = computePointsBreakdown(me, state);
  const panel = el('article', { class: 'panel breakdown-panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: `Tus puntos · ${fmtPts(breakdown.total)}` }),
    el('span', { class: 'badge', text: `${breakdown.matchResults.hits + breakdown.knockout.hits} aciertos` }),
  ]));

  // Match-by-match (1/X/2) summary
  panel.append(el('div', { class: 'breakdown-row' }, [
    el('span', { class: 'breakdown-label', text: 'Aciertos 1/X/2 en grupos' }),
    el('span', { class: 'breakdown-detail', text: `${breakdown.matchResults.hits}/${breakdown.matchResults.possible} · 0.25 c/u` }),
    el('span', { class: 'breakdown-points', text: `+${fmtPts(breakdown.matchResults.points)}` }),
  ]));

  // Group breakdown (only finished groups contribute, but show in-progress too)
  const finished = breakdown.groups.details.filter(d => d.played === d.total);
  if (finished.length) {
    panel.append(el('h3', { class: 'breakdown-subtitle', text: 'Grupos finalizados' }));
    const table = el('table', { class: 'breakdown-table' });
    table.append(el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Grupo' }),
        el('th', { text: 'Clasificados', title: '1 punto por cada equipo predicho como 1º o 2º que realmente queda top-2 o entre los 8 mejores terceros' }),
        el('th', { text: 'Posición exacta', title: '1 punto por acertar quién es 1º y quién 2º' }),
        el('th', { text: 'Orden completo', title: '1 punto si aciertas el orden de los 4 equipos' }),
        el('th', { text: 'Total' }),
      ]),
    ]));
    const tbody = el('tbody');
    finished.forEach(d => {
      const sub = d.classified + d.exact + d.fullOrder;
      tbody.append(el('tr', {}, [
        el('td', { text: d.group }),
        el('td', { text: `${d.classified}/2` }),
        el('td', { text: `${d.exact}/2` }),
        el('td', { text: d.fullOrder ? '✓' : '—' }),
        el('td', { text: `+${sub}` }),
      ]));
    });
    tbody.append(el('tr', { class: 'breakdown-total-row' }, [
      el('td', { text: 'Subtotal' }),
      el('td', { text: '' }),
      el('td', { text: '' }),
      el('td', { text: '' }),
      el('td', { text: `+${breakdown.groups.points}` }),
    ]));
    table.append(tbody);
    panel.append(table);
  } else {
    panel.append(el('div', { class: 'breakdown-row' }, [
      el('span', { class: 'breakdown-label', text: 'Bonus por grupos finalizados' }),
      el('span', { class: 'breakdown-detail', text: 'Sin grupos cerrados aún' }),
      el('span', { class: 'breakdown-points', text: '+0' }),
    ]));
  }

  // Knockout
  panel.append(el('div', { class: 'breakdown-row' }, [
    el('span', { class: 'breakdown-label', text: 'Aciertos eliminatorias' }),
    el('span', { class: 'breakdown-detail', text: `${breakdown.knockout.hits}/${breakdown.knockout.possible} · 2 c/u` }),
    el('span', { class: 'breakdown-points', text: `+${breakdown.knockout.points}` }),
  ]));

  // Bonus
  const b = breakdown.bonus;
  const bonusBits = [];
  if (b.top_scorer.revealed) bonusBits.push(`Goleador ${b.top_scorer.correct ? '✓' : '✕'}`);
  if (b.best_player.revealed) bonusBits.push(`Mejor jugador ${b.best_player.correct ? '✓' : '✕'}`);
  panel.append(el('div', { class: 'breakdown-row' }, [
    el('span', { class: 'breakdown-label', text: 'Bonus (goleador / mejor jugador)' }),
    el('span', { class: 'breakdown-detail', text: bonusBits.length ? bonusBits.join(' · ') : 'Sin revelar' }),
    el('span', { class: 'breakdown-points', text: `+${breakdown.bonus.points}` }),
  ]));

  panel.append(el('div', { class: 'breakdown-row breakdown-total' }, [
    el('span', { class: 'breakdown-label', text: 'Total' }),
    el('span', { class: 'breakdown-detail', text: '' }),
    el('span', { class: 'breakdown-points', text: fmtPts(breakdown.total) }),
  ]));

  return panel;
}

function metricCard(label, value, hint) {
  return el('div', { class: 'metric-card' }, [
    el('span', { text: label }),
    el('strong', { text: value }),
    el('small', { text: hint }),
  ]);
}

function renderPrizePool(state) {
  const pool = state.prize_pool || { groups: [] };
  const groups = (pool.groups || []).filter(item => {
    if (!isAdmin()) return item.name === state.participant?.group_name;
    return true;
  });
  const wrap = el('div', { class: 'pot-blocks' });
  groups.forEach(item => {
    const block = el('div', { class: 'pot-block' });
    if (isAdmin() || groups.length > 1) {
      block.append(el('div', { class: 'pot-block-title' }, [groupChip(item.name)]));
    }
    block.append(el('div', { class: 'money-grid' }, [
      metricCard('Bote', formatMoney(item.pot || 0), `${item.paid_count || 0}/${item.active_count || 0} pagos`),
      metricCard('Entrada', formatMoney(item.entry_fee * 100 || 200), 'por jugador'),
      metricCard('🥇 1º se lleva', formatMoney(item.pot || 0), 'todo el bote'),
    ]));
    wrap.append(block);
  });
  if (!groups.length) {
    wrap.append(el('div', { class: 'muted-line', text: 'Sin datos de bote todavía.' }));
  }
  return wrap;
}

function renderPaymentStatus(state) {
  const players = (state.players || []).filter(p => p.is_active);
  if (!isAdmin()) {
    const myGroup = state.participant?.group_name;
    const filtered = myGroup ? players.filter(p => p.group_name === myGroup) : players;
    return el('div', { class: 'payment-strip' }, filtered.map(p =>
      el('div', { class: 'payment-item' }, [
        el('span', { text: p.name }),
        paymentPill(p),
      ])
    ));
  }
  return el('div', { class: 'payment-strip' }, players.map(p =>
    el('div', { class: 'payment-item' }, [
      el('span', { text: p.name }),
      groupChip(p.group_name),
      paymentPill(p),
    ])
  ));
}

export function renderLeaderboard() {
  const state = getState();
  const wrap = el('section', { class: 'phase-section leaderboard-section' });

  const locked = true;
  const right = el('div', { class: 'lock-banner-right' });
  right.append(el('span', { class: 'badge locked', text: 'Clasificación' }));
  wrap.append(el('div', { class: 'lock-banner is-locked' }, [
    el('div', {}, [
      el('strong', { text: 'Clasificación' }),
      el('span', { text: 'Puntuación actualizada con los resultados.' }),
    ]),
    right,
  ]));

  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Clasificación' }),
      el('p', { text: 'Ranking, bote y reparto.' }),
    ]),
  ]));

  const myBreakdown = renderMyBreakdown(state);
  if (myBreakdown) wrap.append(myBreakdown);

  wrap.append(renderPrizePool(state));

  const leaderboard = state.leaderboard || [];
  const table = el('table', { class: 'leaderboard' });
  table.append(el('thead', {}, [
    el('tr', {}, ['#', 'Jugador', 'Puntos', 'Premio', 'Pago'].map(h => el('th', { text: h }))),
  ]));
  const tbody = el('tbody');
  leaderboard.forEach(row => {
    const player = (state.players || []).find(p => p.id === row.participant_id);
    tbody.append(el('tr', {}, [
      el('td', { text: String(row.rank) }),
      el('td', {}, [
        el('span', { text: row.name }),
        el('span', { text: ' ' }),
        groupChip(player?.group_name),
      ]),
      el('td', { text: String(row.total) }),
      el('td', { text: formatMoney(row.prize * 100 || 0) }),
      el('td', {}, [paymentPill(player)]),
    ]));
  });
  table.append(tbody);
  wrap.append(table);
  return wrap;
}
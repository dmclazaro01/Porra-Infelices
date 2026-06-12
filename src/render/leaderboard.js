import { el, formatDate, formatMoney, groupChip, paymentPill } from '../utils.js';
import { getState, isAdmin } from '../state.js';

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
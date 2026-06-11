import { el, teamInline, formatDate, groupChip, paymentPill } from '../utils.js';
import { getState, isLocked, isAdmin } from '../state.js';

const ROUND_LABELS = { R32: '16avos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', THIRD: '3º', FINAL: 'Final' };

function resultMark(item) {
  if (item.status === 'correct') return el('span', { class: 'result-mark ok', text: `✓ +${item.points}` });
  if (item.status === 'wrong') return el('span', { class: 'result-mark bad', text: '✕ +0' });
  if (item.status === 'missing') return el('span', { class: 'result-mark pending', text: 'Sin pick' });
  return el('span', { class: 'result-mark pending', text: 'Pendiente' });
}

function renderGroupPickRow(item) {
  return el('div', { class: 'pick-row' }, [
    el('div', { class: 'pick-match' }, [
      teamInline(item.home_team_id),
      el('span', { class: 'versus', text: 'vs' }),
      teamInline(item.away_team_id),
    ]),
    el('div', { class: 'pick-value', text: item.predicted || '-' }),
    resultMark(item),
  ]);
}

function renderKnockoutPickRow(item) {
  return el('div', { class: 'pick-row' }, [
    el('div', { class: 'pick-match' }, [
      el('span', { class: 'match-code', text: item.match_number }),
      item.predicted_winner ? teamInline(item.predicted_winner) : el('span', { text: 'Sin ganador' }),
    ]),
    el('div', { class: 'pick-value', text: ROUND_LABELS[item.round] || item.round || '' }),
    resultMark(item),
  ]);
}

function renderPickDetail(entry) {
  const player = entry.participant;
  const detail = el('article', { class: 'pick-detail panel' });
  detail.append(el('div', { class: 'panel-head' }, [
    el('div', {}, [
      el('div', { class: 'panel-title', text: player.name }),
      el('div', { class: 'muted-line', text: player.is_active ? 'Jugador activo' : 'No cuenta para bote' }),
    ]),
    paymentPill(player),
  ]));

  if (entry.details?.bonus?.length) {
    detail.append(el('div', { class: 'detail-section' }, [
      el('h3', { text: 'Bonus' }),
      ...entry.details.bonus.map(item => el('div', { class: 'pick-row' }, [
        el('div', { class: 'pick-match' }, [el('span', { text: item.label })]),
        el('div', { class: 'pick-value', text: item.predicted || '—' }),
        resultMark(item),
      ])),
    ]));
  }

  detail.append(el('div', { class: 'detail-section' }, [
    el('h3', { text: 'Grupos' }),
    ...(entry.details?.groups || []).map(renderGroupPickRow),
  ]));

  detail.append(el('div', { class: 'detail-section' }, [
    el('h3', { text: 'Eliminatorias' }),
    ...(entry.details?.knockout || []).map(renderKnockoutPickRow),
  ]));

  return detail;
}

let selectedId = null;

export function renderPicks() {
  const state = getState();
  const allowed = isLocked() || isAdmin();
  const wrap = el('section', { class: 'phase-section picks-section' });

  const right = el('div', { class: 'lock-banner-right' });
  right.append(el('span', { class: `badge ${allowed ? 'open' : 'locked'}`, text: allowed ? 'Desbloqueada' : 'Bloqueada' }));
  wrap.append(el('div', { class: `lock-banner ${allowed ? 'is-open' : 'is-locked'}` }, [
    el('div', {}, [
      el('strong', { text: allowed ? 'Quinielas públicas' : '🔒 Bloqueada' }),
      el('span', { text: allowed ? 'Puedes ver las predicciones de los demás.' : `Se desbloquea al cierre (${formatDate(state.settings?.lock_deadline || '')})` }),
    ]),
    right,
  ]));

  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Quinielas' }),
      el('p', { text: allowed ? 'Predicciones de tu grupo.' : 'Se desbloquea automáticamente al cierre.' }),
    ]),
  ]));

  if (!allowed) {
    wrap.append(el('div', { class: 'empty-state' }, [
      el('h2', { text: '🔒 Bloqueada hasta el cierre' }),
      el('p', { text: 'Cuando cierre la porra se desbloqueará y podrás ver las quinielas de tu grupo.' }),
    ]));
    return wrap;
  }

  const entries = Object.values(state.public_predictions || {});
  if (!entries.length) {
    wrap.append(el('div', { class: 'empty-state' }, [
      el('h2', { text: 'Sin quinielas visibles' }),
      el('p', { text: 'Nadie ha hecho predicciones aún.' }),
    ]));
    return wrap;
  }

  if (!entries.some(e => e.participant?.id === selectedId)) {
    selectedId = entries[0].participant?.id;
  }
  const selected = entries.find(e => e.participant?.id === selectedId) || entries[0];
  selectedId = selected.participant?.id;

  const layout = el('div', { class: 'picks-layout' });
  const list = el('div', { class: 'player-list' });
  entries.forEach(entry => {
    const player = entry.participant;
    list.append(el('button', {
      class: `player-select ${selectedId === player?.id ? 'active' : ''}`,
      onclick: () => { selectedId = player?.id; },
    }, [
      el('span', { text: player?.name || '??' }),
      isAdmin() ? groupChip(player?.group_name) : '',
      paymentPill(player),
    ]));
  });
  layout.append(list);
  layout.append(renderPickDetail(selected));
  wrap.append(layout);
  return wrap;
}
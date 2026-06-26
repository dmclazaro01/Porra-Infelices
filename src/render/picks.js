import { el, teamInline, formatDate, groupChip, paymentPill } from '../utils.js';
import { getState, isLocked, isAdmin } from '../state.js';
import { computePointsBreakdown } from '../scoring.js';

const ROUND_LABELS = { R32: '16avos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', THIRD: '3º', FINAL: 'Final' };

function resultMark(item) {
  if (item.status === 'correct') return el('span', { class: 'result-mark ok', text: `✓ +${item.points}` });
  if (item.status === 'wrong') return el('span', { class: 'result-mark bad', text: '✕ +0' });
  if (item.status === 'missing') return el('span', { class: 'result-mark pending', text: 'Sin pick' });
  return el('span', { class: 'result-mark pending', text: 'Pendiente' });
}

function renderGroupPickRow(item) {
  const hasResult = item.actual_home_score != null;
  return el('div', { class: 'pick-row' }, [
    el('div', { class: 'pick-match' }, [
      teamInline(item.home_team_id),
      el('span', { class: 'versus', text: 'vs' }),
      teamInline(item.away_team_id),
    ]),
    el('div', { class: 'pick-pred', text: item.predicted || '-' }),
    el('div', { class: 'pick-actual', text: hasResult ? `${item.actual_home_score}-${item.actual_away_score} (${item.real_result})` : '—' }),
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

// Sum classified + exact across finished groups only (per group totals come
// from scoring.js, which already gates them by allPlayed).
function summarizeBreakdown(userId, state) {
  const b = computePointsBreakdown(userId, state);
  const finishedGroups = b.groups.details.filter(d => d.played === d.total);
  const classified = finishedGroups.reduce((s, d) => s + d.classified, 0);
  const exact = finishedGroups.reduce((s, d) => s + d.exact, 0);
  const fullOrder = finishedGroups.reduce((s, d) => s + d.fullOrder, 0);
  return {
    matchHits: b.matchResults.hits,
    matchPossible: b.matchResults.possible,
    matchPoints: b.matchResults.points,
    classified,
    classifiedPossible: finishedGroups.length * 2,
    exact,
    exactPossible: finishedGroups.length * 2,
    fullOrder,
    finishedGroups: finishedGroups.length,
    groupBonusPoints: b.groups.points,
    total: b.total,
  };
}

function compareCell(a, b, kind) {
  if (kind === 'higher-better') {
    if (a > b) return ['cmp-win', 'cmp-lose'];
    if (a < b) return ['cmp-lose', 'cmp-win'];
  }
  return ['', ''];
}

function renderComparisonSummary(entryA, entryB, state) {
  const sa = summarizeBreakdown(entryA.participant.id, state);
  const sb = summarizeBreakdown(entryB.participant.id, state);

  const panel = el('article', { class: 'panel compare-summary' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: 'Comparativa de puntos' }),
    el('span', { class: 'badge', text: `${sa.finishedGroups} grupos finalizados` }),
  ]));

  const table = el('table', { class: 'compare-table' });
  table.append(el('thead', {}, [
    el('tr', {}, [
      el('th', { text: '' }),
      el('th', { text: entryA.participant.name }),
      el('th', { text: entryB.participant.name }),
    ]),
  ]));
  const tbody = el('tbody');

  function row(label, hint, aText, bText, aVal, bVal) {
    const [clsA, clsB] = compareCell(aVal, bVal, 'higher-better');
    tbody.append(el('tr', {}, [
      el('td', {}, [
        el('div', { class: 'cmp-label', text: label }),
        el('div', { class: 'cmp-hint', text: hint }),
      ]),
      el('td', { class: `cmp-cell ${clsA}`, text: aText }),
      el('td', { class: `cmp-cell ${clsB}`, text: bText }),
    ]));
  }

  row(
    'Resultados de partido',
    'Aciertos 1/X/2 · 0.25 c/u',
    `${sa.matchHits}/${sa.matchPossible} · +${sa.matchPoints.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`,
    `${sb.matchHits}/${sb.matchPossible} · +${sb.matchPoints.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`,
    sa.matchHits, sb.matchHits,
  );
  row(
    'Países clasificados',
    'En grupos finalizados · 1 c/u',
    `${sa.classified}/${sa.classifiedPossible} · +${sa.classified}`,
    `${sb.classified}/${sb.classifiedPossible} · +${sb.classified}`,
    sa.classified, sb.classified,
  );
  row(
    'Posiciones exactas',
    'Acierto de 1º y 2º · 1 c/u',
    `${sa.exact}/${sa.exactPossible} · +${sa.exact}`,
    `${sb.exact}/${sb.exactPossible} · +${sb.exact}`,
    sa.exact, sb.exact,
  );
  tbody.append(el('tr', { class: 'cmp-total' }, [
    el('td', { text: 'Total acumulado' }),
    el('td', { class: `cmp-cell ${compareCell(sa.total, sb.total, 'higher-better')[0]}`, text: String(sa.total) }),
    el('td', { class: `cmp-cell ${compareCell(sa.total, sb.total, 'higher-better')[1]}`, text: String(sb.total) }),
  ]));
  table.append(tbody);
  panel.append(table);
  return panel;
}

let mode = 'single'; // 'single' | 'compare'
let selectedId = null;
let selectedIdB = null;

function renderModeToggle(onChange) {
  const toggle = el('div', { class: 'picks-mode-toggle' });
  ['single', 'compare'].forEach(m => {
    const btn = el('button', {
      class: `mode-btn ${mode === m ? 'active' : ''}`,
      text: m === 'single' ? '👤 Ver una' : '⚖ Comparar dos',
    });
    btn.addEventListener('click', () => {
      if (mode === m) return;
      mode = m;
      onChange();
    });
    toggle.append(btn);
  });
  return toggle;
}

function renderPlayerSelect(entries, currentId, onPick, label) {
  const wrap = el('div', { class: 'compare-select-wrap' });
  wrap.append(el('label', { class: 'compare-select-label', text: label }));
  const sel = el('select', { class: 'compare-select' });
  entries.forEach(e => {
    const opt = el('option', { value: e.participant.id, text: e.participant.name });
    if (e.participant.id === currentId) opt.selected = true;
    sel.append(opt);
  });
  sel.addEventListener('change', () => onPick(sel.value));
  wrap.append(sel);
  return wrap;
}

export function renderPicks() {
  const state = getState();
  const allowed = isLocked() || isAdmin();
  const wrap = el('section', { class: 'phase-section picks-section' });

  const right = el('div', { class: 'lock-banner-right' });
  right.append(el('span', { class: `badge ${allowed ? 'open' : 'locked'}`, text: allowed ? 'Desbloqueada' : 'Bloqueada' }));
  wrap.append(el('div', { class: `lock-banner ${allowed ? 'is-open' : 'is-locked'}` }, [
    el('div', {}, [
      el('strong', { text: allowed ? 'Quinielas públicas' : '🔒 Bloqueada' }),
      el('span', { text: allowed ? 'Puedes ver y comparar las predicciones de los demás.' : `Se desbloquea al cierre (${formatDate(state.settings?.lock_deadline || '')})` }),
    ]),
    right,
  ]));

  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Quinielas' }),
      el('p', { text: allowed ? 'Predicciones de tu grupo. Cambia a "Comparar dos" para enfrentarlas.' : 'Se desbloquea automáticamente al cierre.' }),
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

  if (!entries.some(e => e.participant?.id === selectedId)) selectedId = entries[0].participant.id;
  if (!entries.some(e => e.participant?.id === selectedIdB) || selectedIdB === selectedId) {
    const other = entries.find(e => e.participant.id !== selectedId);
    selectedIdB = other ? other.participant.id : selectedId;
  }

  // Host that the toggle handler rewrites without rebuilding the rest of the page.
  const host = el('div', { class: 'picks-host' });
  wrap.append(renderModeToggle(() => rebuildHost()));
  wrap.append(host);

  function rebuildHost() {
    host.textContent = '';
    if (mode === 'single') host.append(renderSingleView(entries));
    else host.append(renderCompareView(entries, state));
  }
  rebuildHost();

  return wrap;
}

function renderSingleView(entries) {
  const layout = el('div', { class: 'picks-layout' });
  const list = el('div', { class: 'player-list' });
  let detailWrap = renderPickDetail(entries.find(e => e.participant.id === selectedId) || entries[0]);

  entries.forEach(entry => {
    const player = entry.participant;
    const btn = el('button', {
      class: `player-select ${selectedId === player?.id ? 'active' : ''}`,
    }, [
      el('span', { text: player?.name || '??' }),
      isAdmin() ? groupChip(player?.group_name) : '',
      paymentPill(player),
    ]);
    btn.dataset.playerId = player?.id;
    btn.addEventListener('click', () => {
      selectedId = player.id;
      list.querySelectorAll('.player-select').forEach(b => b.classList.toggle('active', b.dataset.playerId === selectedId));
      const entry2 = entries.find(e => e.participant?.id === selectedId) || entries[0];
      const nd = renderPickDetail(entry2);
      detailWrap.replaceWith(nd);
      detailWrap = nd;
    });
    list.append(btn);
  });
  layout.append(list);
  layout.append(detailWrap);
  return layout;
}

function renderCompareView(entries, state) {
  const wrap = el('div', { class: 'compare-wrap' });

  const selectorsBar = el('div', { class: 'compare-selectors' });
  // Entry B options must exclude the selected A and vice-versa; rebuild on every change.
  function rerender() {
    const fresh = renderCompareView(entries, state);
    wrap.replaceWith(fresh);
  }

  selectorsBar.append(renderPlayerSelect(
    entries.filter(e => e.participant.id !== selectedIdB),
    selectedId,
    (id) => { selectedId = id; rerender(); },
    'Jugador A',
  ));
  selectorsBar.append(renderPlayerSelect(
    entries.filter(e => e.participant.id !== selectedId),
    selectedIdB,
    (id) => { selectedIdB = id; rerender(); },
    'Jugador B',
  ));
  wrap.append(selectorsBar);

  const entryA = entries.find(e => e.participant.id === selectedId);
  const entryB = entries.find(e => e.participant.id === selectedIdB);
  if (!entryA || !entryB) return wrap;

  wrap.append(renderComparisonSummary(entryA, entryB, state));

  const cols = el('div', { class: 'compare-columns' });
  cols.append(renderPickDetail(entryA));
  cols.append(renderPickDetail(entryB));
  wrap.append(cols);

  return wrap;
}

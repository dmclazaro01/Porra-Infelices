import { el, formatDate, groupChip, formatMoney, paymentPill } from '../utils.js';
import { getState, load } from '../state.js';
import * as api from '../api.js';

export function renderAdmin() {
  const state = getState();
  const wrap = el('section', { class: 'phase-section' });
  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: 'Admin' }),
      el('p', { text: 'Gestión de jugadores, resultados y configuración.' }),
    ]),
  ]));

  wrap.append(renderGroupManagement(state));
  wrap.append(renderPlayerManagement(state));
  wrap.append(renderMatchResults(state));
  wrap.append(renderSettingsPanel(state));
  wrap.append(renderSyncPanel(state));

  return wrap;
}

function renderGroupManagement(state) {
  const panel = el('article', { class: 'panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: 'Grupos' }),
    el('span', { class: 'badge', text: `${(state.playerGroups || []).length} total` }),
  ]));

  const createForm = el('div', { class: 'admin-create-form' });
  const nameInput = el('input', { type: 'text', placeholder: 'Nombre del grupo', style: 'flex:1' });
  const createBtn = el('button', { class: 'primary', text: 'Crear grupo' });
  const createError = el('div', { class: 'error' });

  createBtn.addEventListener('click', async () => {
    createError.textContent = '';
    try {
      await api.adminCreateGroup(nameInput.value.trim());
      nameInput.value = '';
      createError.textContent = '✓ Creado';
      createError.style.color = 'var(--green)';
      setTimeout(() => { createError.textContent = ''; }, 2000);
    } catch (e) {
      createError.textContent = e.message;
      createError.style.color = 'var(--red)';
    }
  });

  createForm.append(nameInput, createBtn);
  panel.append(createForm);
  panel.append(createError);

  const list = el('div', { class: 'payment-strip' });
  (state.playerGroups || []).forEach(group => {
    const groupName = group.name || group;
    list.append(el('div', { class: 'payment-item' }, [
      el('span', { text: groupName }),
    ]));
  });
  if (!(state.playerGroups || []).length) {
    list.append(el('div', { class: 'muted-line', text: 'Sin grupos creados aún.' }));
  }
  panel.append(list);

  return panel;
}

function renderPlayerManagement(state) {
  const panel = el('article', { class: 'panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: 'Jugadores' }),
    el('span', { class: 'badge', text: `${(state.players || []).length} total` }),
  ]));

  const createForm = el('div', { class: 'admin-create-form' });
  const usernameInput = el('input', { type: 'text', placeholder: 'Usuario (para iniciar sesión)', style: 'flex:1' });
  const nameInput = el('input', { type: 'text', placeholder: 'Nombre visible', style: 'flex:1' });
  const passwordInput = el('input', { type: 'password', placeholder: 'Contraseña', style: 'flex:1' });
  const groupSelect = el('select', { style: 'flex:1' });
  groupSelect.append(el('option', { value: '', text: 'Sin grupo' }));
  (state.playerGroups || []).forEach(group => {
    const groupName = group.name || group;
    groupSelect.append(el('option', { value: groupName, text: groupName }));
  });
  const createBtn = el('button', { class: 'primary', text: 'Crear jugador' });
  const createError = el('div', { class: 'error' });

  createBtn.addEventListener('click', async () => {
    createError.textContent = '';
    try {
      const fakeEmail = `${usernameInput.value.trim().toLowerCase()}@porra.fake`;
      await api.adminCreatePlayer(fakeEmail, passwordInput.value, nameInput.value, groupSelect.value || null);
      usernameInput.value = '';
      nameInput.value = '';
      passwordInput.value = '';
      groupSelect.value = '';
      createError.textContent = '✓ Creado';
      createError.style.color = 'var(--green)';
    } catch (e) {
      createError.textContent = e.message;
      createError.style.color = 'var(--red)';
    }
  });

  createForm.append(usernameInput, nameInput, passwordInput, groupSelect, createBtn);
  panel.append(createForm);
  panel.append(createError);

  const playerError = el('div', { class: 'error' });

  const table = el('table', { class: 'admin-table' });
  table.append(el('thead', {}, [
    el('tr', {}, ['Nombre', 'Grupo', 'Rol', 'Activo', 'Pagado', 'Acciones'].map(h => el('th', { text: h }))),
  ]));
  const tbody = el('tbody');
  (state.players || []).forEach(player => {
    const actions = el('div', { class: 'admin-actions' });
    actions.append(el('button', {
      class: 'small-action',
      text: player.is_active ? 'Desactivar' : 'Activar',
      onclick: async () => {
        playerError.textContent = '';
        try { await api.adminToggleActive(player.id); await load(); } catch (e) { playerError.textContent = e.message; }
      },
    }));
    actions.append(el('button', {
      class: `small-action ${player.has_paid ? 'pay-paid' : 'pay-pending'}`,
      text: player.has_paid ? '✓ Pagado' : 'Pendiente',
      onclick: async () => {
        playerError.textContent = '';
        try { await api.adminTogglePaid(player.id); await load(); } catch (e) { playerError.textContent = e.message; }
      },
    }));
    tbody.append(el('tr', {}, [
      el('td', { text: player.name }),
      el('td', {}, [groupChip(player.group_name)]),
      el('td', { text: player.role }),
      el('td', { text: player.is_active ? 'Sí' : 'No' }),
      el('td', { text: player.has_paid ? 'Sí' : 'No' }),
      el('td', {}, [actions]),
    ]));
  });
  table.append(tbody);
  panel.append(table);
  panel.append(playerError);
  return panel;
}

function renderMatchResults(state) {
  const panel = el('article', { class: 'panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: 'Actualizar resultados' }),
  ]));

  const groupMatches = state.matches.filter(m => m.stage === 'GROUP');
  const koMatches = state.matches.filter(m => m.stage === 'KNOCKOUT');

  if (groupMatches.length) {
    panel.append(el('h3', { class: 'results-block-title', text: 'Fase de grupos' }));
    const groupGrid = el('div', { class: 'group-grid' });
    for (const group of state.groups) {
      const matchedGroup = groupMatches.filter(m => m.group_letter === group.letter).sort((a, b) => {
        if (a.kickoff_at && b.kickoff_at) return new Date(a.kickoff_at) - new Date(b.kickoff_at);
        if (a.kickoff_at) return -1;
        if (b.kickoff_at) return 1;
        return 0;
      });
      const gPanel = el('article', { class: `panel group-card group-${group.letter}` });
      gPanel.append(el('div', { class: 'panel-head' }, [
        el('div', { class: 'panel-title', text: `Grupo ${group.letter}` }),
      ]));
      matchedGroup.forEach(match => {
        gPanel.append(renderAdminMatchRow(match));
      });
      groupGrid.append(gPanel);
    }
    panel.append(groupGrid);
  }

  if (koMatches.length) {
    panel.append(el('h3', { class: 'results-block-title', text: 'Eliminatorias' }));
    panel.append(el('p', { class: 'muted-line', text: 'Asigna los equipos de cada cruce y el ganador. Los cruces de mejores terceros (3ABC, 3DEF…) no se calculan solos: usa el cuadro de la BBC como referencia y corrígelos aquí si hace falta.' }));
    koMatches.forEach(match => {
      panel.append(renderAdminKnockoutRow(match, state.teams || []));
    });
  }

  return panel;
}

function teamSelect(teams, selected, fallbackLabel) {
  const sel = el('select', { style: 'flex:1;min-width:0' });
  sel.append(el('option', { value: '', text: fallbackLabel ? `(auto: ${fallbackLabel})` : '(por definir)' }));
  teams.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(t => {
    const opt = el('option', { value: t.id, text: `${t.flag || ''} ${t.name}`.trim() });
    if (selected === t.id) opt.selected = true;
    sel.append(opt);
  });
  return sel;
}

function renderAdminKnockoutRow(match, teams) {
  const row = el('div', { class: 'result-row admin-ko-row', style: 'grid-template-columns: 44px 1fr 50px 50px 1fr 1fr auto; gap:6px; align-items:center' });
  row.append(el('div', { class: 'result-code', text: match.match_number }));

  const homeSel = teamSelect(teams, match.home_team_id, match.home_label);
  const awaySel = teamSelect(teams, match.away_team_id, match.away_label);
  const homeInput = el('input', { type: 'number', min: '0', max: '99', value: match.actual_home_score ?? '', placeholder: '-', style: 'width:46px' });
  const awayInput = el('input', { type: 'number', min: '0', max: '99', value: match.actual_away_score ?? '', placeholder: '-', style: 'width:46px' });

  const statusSelect = el('select', {});
  ['scheduled', 'live', 'finished'].forEach(s => {
    const opt = el('option', { value: s, text: s === 'scheduled' ? 'Programado' : s === 'live' ? 'En vivo' : 'Terminado' });
    if (match.status === s) opt.selected = true;
    statusSelect.append(opt);
  });

  const winnerSel = el('select', {});
  function refreshWinner() {
    const prev = winnerSel.value || match.actual_winner_team_id || '';
    winnerSel.textContent = '';
    winnerSel.append(el('option', { value: '', text: 'Ganador: auto' }));
    [homeSel.value, awaySel.value].forEach(tid => {
      if (!tid) return;
      const t = teams.find(x => x.id === tid);
      const opt = el('option', { value: tid, text: `🏆 ${t ? t.name : tid}` });
      if (prev === tid) opt.selected = true;
      winnerSel.append(opt);
    });
  }
  refreshWinner();
  homeSel.addEventListener('change', refreshWinner);
  awaySel.addEventListener('change', refreshWinner);

  const saveBtn = el('button', {
    class: 'small-action',
    text: '💾',
    onclick: async () => {
      const hs = homeInput.value !== '' ? Number(homeInput.value) : null;
      const as = awayInput.value !== '' ? Number(awayInput.value) : null;
      let winner = winnerSel.value || null;
      // Auto-derive the winner from the score when it is decisive and none was picked.
      if (!winner && hs != null && as != null && hs !== as) {
        winner = hs > as ? (homeSel.value || null) : (awaySel.value || null);
      }
      saveBtn.textContent = '⏳';
      saveBtn.disabled = true;
      try {
        await api.adminUpdateMatch(match.id, {
          home_team_id: homeSel.value || null,
          away_team_id: awaySel.value || null,
          actual_home_score: hs,
          actual_away_score: as,
          actual_winner_team_id: winner,
          status: statusSelect.value,
        });
        await load();
      } catch (e) {
        saveBtn.textContent = '❌';
        setTimeout(() => { saveBtn.textContent = '💾'; saveBtn.disabled = false; }, 2500);
        return;
      }
    },
  });

  row.append(homeSel, homeInput, awayInput, awaySel, winnerSel, statusSelect, saveBtn);
  return row;
}

function renderAdminMatchRow(match) {
  const row = el('div', { class: 'result-row', style: 'grid-template-columns: 44px 1fr 80px 1fr' });
  row.append(el('div', { class: 'result-code', text: match.match_number }));

  const homeInput = el('input', {
    type: 'number', min: '0', max: '99',
    value: match.actual_home_score ?? '',
    placeholder: '-',
    style: 'width:50px',
  });
  const awayInput = el('input', {
    type: 'number', min: '0', max: '99',
    value: match.actual_away_score ?? '',
    placeholder: '-',
    style: 'width:50px',
  });
  const statusSelect = el('select', {});
  ['scheduled', 'live', 'finished'].forEach(s => {
    const opt = el('option', { value: s, text: s === 'scheduled' ? 'Programado' : s === 'live' ? 'En vivo' : 'Terminado' });
    if (match.status === s) opt.selected = true;
    statusSelect.append(opt);
  });
  const saveBtn = el('button', {
    class: 'small-action',
    text: '💾',
    onclick: async () => {
      await api.adminUpdateMatch(match.id, {
        actual_home_score: homeInput.value !== '' ? Number(homeInput.value) : null,
        actual_away_score: awayInput.value !== '' ? Number(awayInput.value) : null,
        status: statusSelect.value,
      });
    },
  });

  row.append(el('span', { text: match.home_team_id || match.home_label || '?' }));
  row.append(homeInput);
  row.append(el('span', { text: '-' }));
  row.append(awayInput);
  row.append(el('span', { text: match.away_team_id || match.away_label || '?' }));
  row.append(statusSelect);
  row.append(saveBtn);
  return row;
}

function toLocalDatetimeString(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderSettingsPanel(state) {
  const panel = el('article', { class: 'panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: 'Configuración' }),
  ]));

  const settings = state.settings || {};

  const deadlineInput = el('input', {
    type: 'datetime-local',
    value: settings.lock_deadline ? toLocalDatetimeString(new Date(settings.lock_deadline)) : '',
  });
  const feeInput = el('input', {
    type: 'number',
    value: (settings.entry_fee_cents || 200) / 100,
    min: '0',
    step: '0.5',
  });
  // Track checkbox state in a variable to survive re-renders from auto-sync
  let lockedValue = settings.locked || false;
  const lockedCheckId = 'chk-locked';
  const lockedCheck = el('input', {
    id: lockedCheckId,
    type: 'checkbox',
    checked: lockedValue,
    onchange: () => { lockedValue = lockedCheck.checked; },
  });
  let koEditableValue = settings.knockout_editable || false;
  const koEditableId = 'chk-ko-editable';
  const koEditableCheck = el('input', {
    id: koEditableId,
    type: 'checkbox',
    checked: koEditableValue,
    onchange: () => { koEditableValue = koEditableCheck.checked; },
  });

  const saveError = el('div', { class: 'error' });
  const saveBtn = el('button', {
    class: 'primary',
    text: 'Guardar configuración',
    onclick: async () => {
      saveError.textContent = '';
      try {
        await api.adminUpdateSettings({
          lock_deadline: deadlineInput.value ? new Date(deadlineInput.value).toISOString() : null,
          locked: lockedValue,
          knockout_editable: koEditableValue,
          entry_fee_cents: Math.round(Number(feeInput.value) * 100),
        });
        await load();
        saveError.textContent = '✓ Guardado';
        saveError.style.color = 'var(--green)';
        setTimeout(() => { saveError.textContent = ''; saveError.style.color = ''; }, 3000);
      } catch (e) {
        saveError.textContent = e.message;
        saveError.style.color = 'var(--red)';
      }
    },
  });

  panel.append(el('div', { class: 'fee-editor' }, [
    el('div', { class: 'fee-row' }, [
      el('label', { class: 'fee-label', text: 'Fecha de cierre:' }),
      deadlineInput,
    ]),
    el('div', { class: 'fee-row' }, [
      el('label', { for: lockedCheckId, class: 'fee-label', style: 'cursor:pointer', text: 'Bloqueada:' }),
      lockedCheck,
    ]),
    el('div', { class: 'fee-row' }, [
      el('label', { for: koEditableId, class: 'fee-label', style: 'cursor:pointer', text: 'Eliminatorias editables:' }),
      koEditableCheck,
    ]),
    saveBtn,
    saveError,
  ]));

  return panel;
}

function renderSyncPanel(state) {
  const panel = el('article', { class: 'panel' });
  panel.append(el('div', { class: 'panel-head' }, [
    el('div', { class: 'panel-title', text: 'Sincronización' }),
    el('span', { class: 'badge', text: state.sync?.last_sync_at ? `Última: ${formatDate(state.sync.last_sync_at)}` : 'Nunca' }),
  ]));

  const syncBtn = el('button', {
    class: 'primary',
    text: '🔄 Sincronizar resultados',
    onclick: async () => {
      syncBtn.textContent = 'Sincronizando...';
      syncBtn.disabled = true;
      try {
        const token = await api.getSessionToken();
        if (!token) throw new Error('No session');
        const { data } = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-results`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        syncBtn.textContent = '✓ Sincronizado';
        setTimeout(() => { syncBtn.textContent = '🔄 Sincronizar resultados'; syncBtn.disabled = false; }, 3000);
      } catch (e) {
        syncBtn.textContent = 'Error: ' + e.message;
        setTimeout(() => { syncBtn.textContent = '🔄 Sincronizar resultados'; syncBtn.disabled = false; }, 3000);
      }
    },
  });
  panel.append(syncBtn);

  return panel;
}
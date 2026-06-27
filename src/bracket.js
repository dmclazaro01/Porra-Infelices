import { computeRealStandings, computeGroupStandings } from './scoring.js';

export function computePartialStandings(letter, groupMatches, ctx) {
  const playedCount = groupMatches.filter(
    m => m.actual_home_score != null && m.actual_away_score != null
  ).length;
  const provisional = playedCount < 6;
  const standings = computeRealStandings(letter, groupMatches);
  return { standings, provisional, playedCount };
}

export function isBracketComplete(state) {
  if (!state || !state.matches) return false;
  const r32 = state.matches.filter(m => m.stage === 'KNOCKOUT' && m.round === 'R32');
  if (r32.length !== 16) return false;
  return r32.every(m => m.home_team_id != null && m.away_team_id != null);
}

function buildRealStandingsMap(state) {
  const map = {};
  for (const group of (state.groups || [])) {
    const groupMatches = state.matches.filter(
      m => m.group_letter === group.letter && m.stage === 'GROUP'
    );
    const computed = computePartialStandings(group.letter, groupMatches, state);
    map[group.letter] = { standings: computed.standings, provisional: computed.provisional };
  }
  return map;
}

function buildPredictedStandingsMap(state) {
  const map = {};
  for (const group of (state.groups || [])) {
    const groupMatches = state.matches.filter(
      m => m.group_letter === group.letter && m.stage === 'GROUP'
    );
    const standings = computeGroupStandings(
      group.letter,
      groupMatches,
      state.predictions || {},
      state.tiebreaks || {}
    );
    map[group.letter] = { standings, provisional: true };
  }
  return map;
}

export function resolveBracket(state, { realMode }) {
  const out = {};
  if (!state || !state.matches) return out;
  const koMatches = state.matches.filter(m => m.stage === 'KNOCKOUT');
  const r32Complete = isBracketComplete(state);
  for (const match of koMatches) {
    const teamA = match.home_team_id || resolveLabel(match.home_label, state, { realMode }).teamId;
    const teamB = match.away_team_id || resolveLabel(match.away_label, state, { realMode }).teamId;
    const winner = realMode ? match.actual_winner_team_id : (state.knockoutPredictions || {})[match.match_number];
    out[match.match_number] = {
      team_a: teamA,
      team_b: teamB,
      winner: winner || null,
      status: match.status || 'scheduled',
      label_a: match.home_label,
      label_b: match.away_label,
      round: match.round,
      isProvisional: !r32Complete,
    };
  }
  return out;
}

export function resolveLabel(label, state, { realMode }) {
  if (!label || !state) return { teamId: null };

  if (label.startsWith('W') && label.length >= 4) {
    const mn = label.substring(1);
    const match = (state.matches || []).find(m => m.match_number === mn);
    if (!match) return { teamId: null };
    const winner = realMode ? match.actual_winner_team_id : (state.knockoutPredictions || {})[mn];
    return { teamId: winner || null };
  }

  if (label.startsWith('L') && label.length >= 4) {
    const mn = label.substring(1);
    const match = (state.matches || []).find(m => m.match_number === mn);
    if (!match) return { teamId: null };
    const winner = realMode ? match.actual_winner_team_id : (state.knockoutPredictions || {})[mn];
    if (!winner) return { teamId: null };
    if (match.home_team_id === winner) return { teamId: match.away_team_id };
    if (match.away_team_id === winner) return { teamId: match.home_team_id };
    return { teamId: null };
  }

  if (/^[12][A-L]$/.test(label)) {
    const pos = label[0];
    const letter = label[1];
    const standingsMap = realMode
      ? buildRealStandingsMap(state)
      : buildPredictedStandingsMap(state);
    const group = standingsMap[letter];
    if (!group) return { teamId: null };
    const idx = pos === '1' ? 0 : 1;
    const entry = group.standings[idx];
    return { teamId: entry ? entry.team_id : null, provisional: group.provisional };
  }

  if (label.startsWith('3')) {
    return { teamId: null, reason: 'third_place_undefined' };
  }

  return { teamId: null };
}

// Parsea una etiqueta de tercero tipo '3ABC' en la lista de letras de grupo
// que componen el cruce. Devuelve [] si la etiqueta no encaja con el formato.
export function parseThirdLabel(label) {
  if (!label || typeof label !== 'string' || !label.startsWith('3')) return [];
  const m = label.match(/^3([A-L]+)$/);
  if (!m) return [];
  return m[1].split('');
}

// Devuelve el team_id del tercer clasificado real de un grupo, o null si el
// grupo aún no se ha jugado completo.
export function getRealThirdForGroup(letter, allMatches) {
  const groupMatches = (allMatches || []).filter(
    m => m.group_letter === letter && m.stage === 'GROUP'
  );
  if (groupMatches.length === 0) return null;
  const allPlayed = groupMatches.every(
    m => m.actual_home_score != null && m.actual_away_score != null
  );
  if (!allPlayed) return null;
  const standings = computeRealStandings(letter, groupMatches);
  const third = standings.find(t => t.position === 3);
  return third ? third.team_id : null;
}

// Para una etiqueta de tercero, devuelve:
//   - teamId: el candidato "principal" (primer grupo con tercero disponible)
//   - candidates: lista con { group, teamId } de los grupos que forman la etiqueta
//     y cuyo tercero ya está calculado. Si ninguno está disponible, teamId será null.
export function suggestThirdForLabel(label, state) {
  const groups = parseThirdLabel(label);
  if (groups.length === 0) return { teamId: null, candidates: [] };
  const candidates = groups
    .map(g => ({ group: g, teamId: getRealThirdForGroup(g, state.matches || []) }))
    .filter(c => c.teamId);
  return { teamId: candidates[0]?.teamId || null, candidates };
}

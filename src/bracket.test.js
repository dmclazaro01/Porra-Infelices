import test from 'node:test';
import assert from 'node:assert';
import { computePartialStandings, isBracketComplete, resolveLabel, resolveBracket } from './bracket.js';

const teamsA = [{ id: 't1', name: 'Alpha' }, { id: 't2', name: 'Bravo' }];
const teamsB = [{ id: 't3', name: 'Charlie' }, { id: 't4', name: 'Delta' }];

const match = (id, home, away, homeGoals, awayGoals) => ({
  id, home_team_id: home, away_team_id: away,
  actual_home_score: homeGoals, actual_away_score: awayGoals,
  group_letter: 'A', stage: 'GROUP',
});

test('computePartialStandings con 0 partidos jugados', () => {
  const matches = [
    match('m1', 't1', 't2', null, null),
  ];
  const result = computePartialStandings('A', matches, { teams: [...teamsA, ...teamsB] });
  assert.strictEqual(result.provisional, true);
  assert.strictEqual(result.standings.length, 2);
  assert.strictEqual(result.standings[0].team_id, 't1');
  assert.strictEqual(result.standings[1].team_id, 't2');
  assert.strictEqual(result.standings[0].points, 0);
});

test('computePartialStandings con 1 partido ganado por t1', () => {
  const matches = [
    match('m1', 't1', 't2', 2, 0),
  ];
  const result = computePartialStandings('A', matches, { teams: [...teamsA, ...teamsB] });
  assert.strictEqual(result.provisional, true);
  assert.strictEqual(result.standings[0].team_id, 't1');
  assert.strictEqual(result.standings[0].points, 3);
  assert.strictEqual(result.standings[1].team_id, 't2');
  assert.strictEqual(result.standings[1].points, 0);
});

test('computePartialStandings con 6 partidos jugados no es provisional', () => {
  const teams = [
    { id: 't1', name: 'A' }, { id: 't2', name: 'B' },
    { id: 't3', name: 'C' }, { id: 't4', name: 'D' },
  ];
  const matches = [
    match('m1', 't1', 't2', 1, 0),
    match('m2', 't3', 't4', 1, 0),
    match('m3', 't1', 't3', 1, 0),
    match('m4', 't2', 't4', 1, 0),
    match('m5', 't1', 't4', 1, 0),
    match('m6', 't2', 't3', 1, 0),
  ];
  const result = computePartialStandings('A', matches, { teams });
  assert.strictEqual(result.provisional, false);
  assert.strictEqual(result.standings.length, 4);
});

const koMatch = (id, round, homeId, awayId) => ({
  id, match_number: id, round, stage: 'KNOCKOUT',
  home_team_id: homeId, away_team_id: awayId,
});

test('isBracketComplete con 0 R32 definidos', () => {
  const matches = [koMatch('M73', 'R32', null, null)];
  assert.strictEqual(isBracketComplete({ matches }), false);
});

test('isBracketComplete con 8 R32 definidos', () => {
  const matches = [
    koMatch('M73', 'R32', 't1', 't2'),
    koMatch('M74', 'R32', 't3', 't4'),
    koMatch('M75', 'R32', 't5', 't6'),
    koMatch('M76', 'R32', 't7', 't8'),
    koMatch('M77', 'R32', 't9', 't10'),
    koMatch('M78', 'R32', 't11', 't12'),
    koMatch('M79', 'R32', null, null),
    koMatch('M80', 'R32', null, null),
  ];
  assert.strictEqual(isBracketComplete({ matches }), false);
});

test('isBracketComplete con 16 R32 definidos', () => {
  const matches = [];
  for (let i = 0; i < 16; i++) {
    matches.push(koMatch(`M${73 + i}`, 'R32', `t${i}a`, `t${i}b`));
  }
  assert.strictEqual(isBracketComplete({ matches }), true);
});

test('isBracketComplete con partidos R32 que tienen solo home_team_id', () => {
  const matches = [koMatch('M73', 'R32', 't1', null)];
  assert.strictEqual(isBracketComplete({ matches }), false);
});

const buildState = (overrides = {}) => ({
  matches: overrides.matches || [],
  teams: overrides.teams || [
    { id: 'es', name: 'España' },
    { id: 'ar', name: 'Argentina' },
    { id: 'br', name: 'Brasil' },
  ],
  groups: overrides.groups || [
    { letter: 'A', teams: [{ team_id: 'es' }, { team_id: 'ar' }] },
  ],
  predictions: overrides.predictions || {},
  tiebreaks: overrides.tiebreaks || {},
  knockoutPredictions: overrides.knockoutPredictions || {},
  ...overrides,
});

test('resolveLabel 1A en realMode con grupo terminado', () => {
  const state = buildState({
    matches: [
      { id: 'm1', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 2, actual_away_score: 0 },
      { id: 'm2', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 1, actual_away_score: 1 },
      { id: 'm3', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 1, actual_away_score: 0 },
      { id: 'm4', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 0, actual_away_score: 1 },
      { id: 'm5', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 2, actual_away_score: 0 },
      { id: 'm6', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 1, actual_away_score: 1 },
    ],
  });
  const result = resolveLabel('1A', state, { realMode: true });
  assert.strictEqual(result.teamId, 'es');
  assert.strictEqual(result.provisional, false);
});

test('resolveLabel 1A en realMode con grupo parcialmente jugado', () => {
  const state = buildState({
    matches: [
      { id: 'm1', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP',
        actual_home_score: 2, actual_away_score: 0 },
    ],
  });
  const result = resolveLabel('1A', state, { realMode: true });
  assert.strictEqual(result.teamId, 'es');
  assert.strictEqual(result.provisional, true);
});

test('resolveLabel WM73 con actual_winner_team_id presente', () => {
  const state = buildState({
    matches: [
      { id: 'M73', match_number: 'M73', stage: 'KNOCKOUT', round: 'R32',
        actual_winner_team_id: 'es', home_team_id: 'ar', away_team_id: 'es' },
    ],
  });
  const result = resolveLabel('WM73', state, { realMode: true });
  assert.strictEqual(result.teamId, 'es');
});

test('resolveLabel WM73 sin actual_winner_team_id devuelve null', () => {
  const state = buildState({
    matches: [
      { id: 'M73', match_number: 'M73', stage: 'KNOCKOUT', round: 'R32',
        home_team_id: 'ar', away_team_id: 'es' },
    ],
  });
  const result = resolveLabel('WM73', state, { realMode: true });
  assert.strictEqual(result.teamId, null);
});

test('resolveLabel 3ABC devuelve null con reason third_place_undefined', () => {
  const state = buildState();
  const result = resolveLabel('3ABC', state, { realMode: true });
  assert.strictEqual(result.teamId, null);
  assert.strictEqual(result.reason, 'third_place_undefined');
});

test('resolveLabel LM101 con actual_winner_team_id presente', () => {
  const state = buildState({
    matches: [
      { id: 'M101', match_number: 'M101', stage: 'KNOCKOUT', round: 'SF',
        actual_winner_team_id: 'ar', home_team_id: 'es', away_team_id: 'ar' },
    ],
  });
  const result = resolveLabel('LM101', state, { realMode: true });
  assert.strictEqual(result.teamId, 'es');
});

test('resolveLabel 2A en realMode false usa predicciones', () => {
  const state = buildState({
    predictions: { m1: '2' },
    tiebreaks: {},
  });
  state.matches = [
    { id: 'm1', home_team_id: 'es', away_team_id: 'ar', group_letter: 'A', stage: 'GROUP' },
  ];
  const result = resolveLabel('1A', state, { realMode: false });
  assert.strictEqual(result.teamId, 'ar');
});

test('resolveBracket encadenado R32->R16 con resultados parciales', () => {
  const matches = [
    { id: 'M73', match_number: 'M73', stage: 'KNOCKOUT', round: 'R32',
      home_team_id: 'es', away_team_id: 'ar', actual_winner_team_id: 'es',
      home_label: '1A', away_label: '2D' },
    { id: 'M89', match_number: 'M89', stage: 'KNOCKOUT', round: 'R16',
      home_label: 'WM73', away_label: 'WM74', home_team_id: null, away_team_id: null },
    { id: 'M74', match_number: 'M74', stage: 'KNOCKOUT', round: 'R32',
      home_label: '1B', away_label: '2C', home_team_id: null, away_team_id: null },
  ];
  const state = { matches, teams: [], groups: [], predictions: {}, tiebreaks: {}, knockoutPredictions: {} };
  const bracket = resolveBracket(state, { realMode: true });
  assert.strictEqual(bracket.M73.team_a, 'es');
  assert.strictEqual(bracket.M73.team_b, 'ar');
  assert.strictEqual(bracket.M73.winner, 'es');
  assert.strictEqual(bracket.M89.team_a, 'es');
  assert.strictEqual(bracket.M89.team_b, null);
});

test('resolveBracket devuelve label_a y label_b originales', () => {
  const matches = [
    { id: 'M73', match_number: 'M73', stage: 'KNOCKOUT', round: 'R32',
      home_label: '1A', away_label: '2D' },
  ];
  const state = { matches, teams: [], groups: [], predictions: {}, tiebreaks: {}, knockoutPredictions: {} };
  const bracket = resolveBracket(state, { realMode: true });
  assert.strictEqual(bracket.M73.label_a, '1A');
  assert.strictEqual(bracket.M73.label_b, '2D');
});

test('resolveBracket marca provisional si R32 no está completo', () => {
  const matches = [
    { id: 'M73', match_number: 'M73', stage: 'KNOCKOUT', round: 'R32',
      home_label: '1A', away_label: '2D' },
  ];
  const state = { matches, teams: [], groups: [], predictions: {}, tiebreaks: {}, knockoutPredictions: {} };
  const bracket = resolveBracket(state, { realMode: true });
  assert.strictEqual(bracket.M73.isProvisional, true);
});

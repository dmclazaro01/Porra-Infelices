import test from 'node:test';
import assert from 'node:assert';
import { computePartialStandings, isBracketComplete } from './bracket.js';

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

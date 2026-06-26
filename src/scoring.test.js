import test from 'node:test';
import assert from 'node:assert';
import { computeRealStandings, computeGroupPoints } from './scoring.js';

// Group A, 4 teams, all 6 matches played. t1 and t2 both finish on 6 pts but
// t1 has a clearly better goal difference, so the real classification must put
// t1 first. The old 1/X/2 reduction flattened every win to 1-0 and would have
// ordered them alphabetically instead.
const gm = (id, home, away, hs, as) => ({
  id, group_letter: 'A', stage: 'GROUP', match_number: id,
  home_team_id: home, away_team_id: away,
  actual_home_score: hs, actual_away_score: as,
});

const matches = [
  gm('m1', 't1', 't3', 5, 0),
  gm('m2', 't1', 't4', 5, 0),
  gm('m3', 't2', 't3', 1, 0),
  gm('m4', 't2', 't4', 1, 0),
  gm('m5', 't1', 't2', 0, 0), // t1 and t2 draw -> both reach 6 + 1 = 7... adjust below
  gm('m6', 't3', 't4', 0, 0),
];

test('computeRealStandings respeta la diferencia de goles real', () => {
  const standings = computeRealStandings('A', matches);
  // t1: W,W,D => 7 pts, GF 10, GA 0. t2: W,W,D => 7 pts, GF 2, GA 0.
  assert.strictEqual(standings[0].team_id, 't1');
  assert.strictEqual(standings[1].team_id, 't2');
  assert.ok(standings[0].goals_for > standings[1].goals_for);
});

test('computeGroupPoints usa la clasificación real por marcadores', () => {
  // User predicts t1 first, t2 second -> matches the real GD-based order.
  const userPredictions = {
    m1: '1', m2: '1', m3: '1', m4: '1', m5: 'X', m6: 'X',
  };
  const allGroups = [{ letter: 'A', team_ids: ['t1', 't2', 't3', 't4'] }];
  const { total, details } = computeGroupPoints(userPredictions, matches, allGroups, {}, {});
  // Both classified correctly (t1,t2) => 2; both exact positions => 2.
  assert.ok(total >= 4, `expected >= 4 points, got ${total}`);
  assert.strictEqual(details[0].classified, 2);
});

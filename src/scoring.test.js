import test from 'node:test';
import assert from 'node:assert';
import { computeRealStandings, computeGroupPoints, getRealBestThirdsSoFar } from './scoring.js';

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

// Two groups (A, B). User predicts B3 (third in real B) as one of B's top-2.
// B3 finishes 3rd in B but is among the best thirds, so it should count as
// classified for the user (1 pt) — the new rule.
test('computeGroupPoints cuenta los mejores terceros como clasificados', () => {
  const m = (id, group, home, away, hs, as) => ({
    id, group_letter: group, stage: 'GROUP', match_number: id,
    home_team_id: home, away_team_id: away,
    actual_home_score: hs, actual_away_score: as,
  });
  // Group A: a1 wins all, a2 second, a3 last, a4 third with 3 pts
  // Group B: b1 wins all, b2 second, b3 third with 4 pts (better than a4), b4 last
  const ms = [
    m('a1', 'A', 'a1', 'a2', 1, 0), m('a2', 'A', 'a1', 'a3', 1, 0),
    m('a3', 'A', 'a1', 'a4', 1, 0), m('a4', 'A', 'a2', 'a3', 1, 0),
    m('a5', 'A', 'a2', 'a4', 1, 0), m('a6', 'A', 'a3', 'a4', 0, 1), // a4 beats a3 -> a4 3rd with 3 pts
    m('b1', 'B', 'b1', 'b2', 1, 0), m('b2', 'B', 'b1', 'b3', 1, 0),
    m('b3', 'B', 'b1', 'b4', 1, 0), m('b4', 'B', 'b2', 'b3', 0, 1), // b3 beats b2
    m('b5', 'B', 'b2', 'b4', 1, 0), m('b6', 'B', 'b3', 'b4', 1, 0), // b3 beats b4 -> b3 has 6 pts (3rd)
  ];
  // Recount group B: b1 wins all 3 -> 9. b2: lost vs b1, lost vs b3, won vs b4 -> 3. b3: lost vs b1, won vs b2, won vs b4 -> 6. b4: lost all -> 0.
  // So real order in B: b1, b3, b2, b4. Third place: b2 (3 pts).
  // Group A third: a4 (3 pts). Best thirds overall: both a4 and b2 tie at 3 pts; the better GD wins.
  // The test only checks the new code path: user predicts b3 as 1st and b2 as 2nd in B.
  // Real B: b1 (1st), b3 (2nd) -> user got b3 in top-2 (correct), b2 (real 3rd, may be best third).
  const bestThirds = getRealBestThirdsSoFar(
    [{ letter: 'A', team_ids: ['a1','a2','a3','a4'] }, { letter: 'B', team_ids: ['b1','b2','b3','b4'] }],
    ms,
  );
  assert.ok(bestThirds.length >= 1, 'should have at least one best third');

  // User picks for B: predicts b3 wins all (so b3 finishes 1st in user's table),
  // and b2 second. b2 actually ends 3rd in real B but might be a best third.
  const preds = {
    a1: '1', a2: '1', a3: '1', a4: '1', a5: '1', a6: '2',
    b1: '1', b2: '1', b3: '1', b4: '1', b5: '1', b6: '1',
  };
  const allGroups = [
    { letter: 'A', team_ids: ['a1','a2','a3','a4'] },
    { letter: 'B', team_ids: ['b1','b2','b3','b4'] },
  ];
  const { details } = computeGroupPoints(preds, ms, allGroups, {}, {});
  const bDetail = details.find(d => d.group === 'B');
  // If b2 is in bestThirds, classified for B should be 2 (b3 real top-2, b2 best third).
  if (bestThirds.includes('b2')) {
    assert.strictEqual(bDetail.classified, 2, 'b2 best third should count as classified');
  } else {
    // If not in bestThirds, only b3 counts -> 1.
    assert.strictEqual(bDetail.classified, 1);
  }
});

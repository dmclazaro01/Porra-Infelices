import { computeRealStandings } from './scoring.js';

export function computePartialStandings(letter, groupMatches, ctx) {
  const playedCount = groupMatches.filter(
    m => m.actual_home_score != null && m.actual_away_score != null
  ).length;
  const provisional = playedCount < 6;
  const standings = computeRealStandings(letter, groupMatches);
  return { standings, provisional, playedCount };
}

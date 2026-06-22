import { computeRealStandings } from './scoring.js';

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

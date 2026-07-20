// Normaliza el nombre de un jugador para comparar el bonus (goleador / mejor
// jugador). Ignora mayúsculas/minúsculas, acentos y espacios sobrantes, de
// modo que "Mbappé", "mbappe" y "  MBAPPE " se consideren el mismo nombre.
// Así cualquiera que escribiera el nombre correcto —con la ortografía que
// fuera— recibe sus puntos.
export function normalizeBonusName(name) {
  if (name == null) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function bonusNamesMatch(a, b) {
  const na = normalizeBonusName(a);
  const nb = normalizeBonusName(b);
  return na !== '' && na === nb;
}

function createTeamStats(teamId) {
  return {
    team_id: teamId,
    position: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
  };
}

function updateTeamStats(home, away, homeGoals, awayGoals) {
  home.played++;
  away.played++;
  home.goals_for += homeGoals;
  home.goals_against += awayGoals;
  away.goals_for += awayGoals;
  away.goals_against += homeGoals;

  if (homeGoals > awayGoals) {
    home.won++;
    home.points += 3;
    away.lost++;
  } else if (homeGoals < awayGoals) {
    away.won++;
    away.points += 3;
    home.lost++;
  } else {
    home.drawn++;
    home.points += 1;
    away.drawn++;
    away.points += 1;
  }
}

function sortWithTiebreak(standings, groupLetter, userTiebreaks) {
  let tiebreakOrder = null;
  if (Array.isArray(userTiebreaks)) {
    // userTiebreaks is an array directly (e.g., from tiebreaks[groupLetter])
    tiebreakOrder = userTiebreaks;
  } else if (userTiebreaks && userTiebreaks[groupLetter]) {
    // userTiebreaks is an object with group letters as keys
    tiebreakOrder = userTiebreaks[groupLetter];
  }

  standings.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdA !== gdB) return gdB - gdA;
    if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for;

    if (tiebreakOrder) {
      const idxA = tiebreakOrder.indexOf(a.team_id);
      const idxB = tiebreakOrder.indexOf(b.team_id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }

    return a.team_id.localeCompare(b.team_id);
  });

  standings.forEach((team, idx) => {
    team.position = idx + 1;
  });

  return standings;
}

export function computeGroupStandings(groupLetter, groupMatches, predictions, userTiebreaks) {
  const teams = {};

  for (const match of groupMatches) {
    if (!teams[match.home_team_id]) {
      teams[match.home_team_id] = createTeamStats(match.home_team_id);
    }
    if (!teams[match.away_team_id]) {
      teams[match.away_team_id] = createTeamStats(match.away_team_id);
    }
  }

  for (const match of groupMatches) {
    const outcome = predictions[match.id];
    if (outcome === undefined || outcome === null) continue;

    let homeGoals, awayGoals;
    if (outcome === "1") {
      homeGoals = 1;
      awayGoals = 0;
    } else if (outcome === "2") {
      homeGoals = 0;
      awayGoals = 1;
    } else {
      homeGoals = 1;
      awayGoals = 1;
    }

    updateTeamStats(
      teams[match.home_team_id],
      teams[match.away_team_id],
      homeGoals,
      awayGoals
    );
  }

  return sortWithTiebreak(Object.values(teams), groupLetter, userTiebreaks);
}

export function computeRealStandings(groupLetter, groupMatches) {
  const teams = {};

  for (const match of groupMatches) {
    if (!teams[match.home_team_id]) {
      teams[match.home_team_id] = createTeamStats(match.home_team_id);
    }
    if (!teams[match.away_team_id]) {
      teams[match.away_team_id] = createTeamStats(match.away_team_id);
    }
  }

  for (const match of groupMatches) {
    if (match.actual_home_score == null || match.actual_away_score == null) continue;

    updateTeamStats(
      teams[match.home_team_id],
      teams[match.away_team_id],
      match.actual_home_score,
      match.actual_away_score
    );
  }

  return sortWithTiebreak(Object.values(teams), groupLetter, null);
}

export function getBestThirds(allGroups, groupMatches, predictionsOrResults) {
  const thirds = [];

  for (const group of allGroups) {
    const matches = groupMatches.filter((m) => m.group_letter === group.letter);
    const standings = computeGroupStandings(group.letter, matches, predictionsOrResults);
    const third = standings.find((t) => t.position === 3);
    if (third) thirds.push(third);
  }

  thirds.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdA !== gdB) return gdB - gdA;
    if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for;
    return a.team_id.localeCompare(b.team_id);
  });

  return thirds.slice(0, 8).map((t) => t.team_id);
}

// Best 8 third-place teams across the 12 groups, based on real scores. Only
// includes groups that are already fully played — partial groups can't have a
// determined 3rd place yet. The list grows as more groups finish.
export function getRealBestThirdsSoFar(allGroups, allMatches) {
  const thirds = [];
  for (const group of allGroups) {
    const matches = allMatches.filter((m) => m.group_letter === group.letter);
    const allPlayed = matches.length > 0 && matches.every(
      (m) => m.actual_home_score != null && m.actual_away_score != null
    );
    if (!allPlayed) continue;
    const standings = computeRealStandings(group.letter, matches);
    const third = standings.find((t) => t.position === 3);
    if (third) thirds.push(third);
  }
  thirds.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdA !== gdB) return gdB - gdA;
    if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for;
    return a.team_id.localeCompare(b.team_id);
  });
  return thirds.slice(0, 8).map((t) => t.team_id);
}

export function computeGroupPoints(
  userPredictions,
  allMatches,
  allGroups,
  userTiebreaks,
  realResults
) {
  let total = 0;
  const details = [];
  const bestThirdsSet = new Set(getRealBestThirdsSoFar(allGroups, allMatches));

  for (const group of allGroups) {
    const groupMatches = allMatches.filter((m) => m.group_letter === group.letter);
    const allPlayed = groupMatches.every(m => m.actual_home_score != null && m.actual_away_score != null);

    let classified = 0, exact = 0, fullOrder = 0;

    if (allPlayed) {
      const userStandings = computeGroupStandings(
        group.letter,
        groupMatches,
        userPredictions,
        userTiebreaks
      );
      // Real standings must use the actual scores (goal difference / goals for
      // count as tiebreakers), not the 1/X/2 reduction which would flatten every
      // result to 1-0 and produce a wrong real classification.
      const realStandings = computeRealStandings(group.letter, groupMatches);

      const userClassified = userStandings
        .filter((t) => t.position <= 2)
        .map((t) => t.team_id);
      const realClassifiedSet = new Set(
        realStandings.filter((t) => t.position <= 2).map((t) => t.team_id)
      );

      // A predicted top-2 counts as classified if the team really finished
      // top-2 OR is among the 8 best thirds (which also advance in WC26).
      for (const teamId of userClassified) {
        if (realClassifiedSet.has(teamId) || bestThirdsSet.has(teamId)) classified++;
      }

      const userFirst = userStandings.find((t) => t.position === 1);
      const realFirst = realStandings.find((t) => t.position === 1);
      if (userFirst && realFirst && userFirst.team_id === realFirst.team_id) exact++;

      const userSecond = userStandings.find((t) => t.position === 2);
      const realSecond = realStandings.find((t) => t.position === 2);
      if (userSecond && realSecond && userSecond.team_id === realSecond.team_id) exact++;

      const userOrder = [...userStandings].sort((a, b) => a.position - b.position).map(t => t.team_id);
      const realOrder = [...realStandings].sort((a, b) => a.position - b.position).map(t => t.team_id);
      if (userOrder.length === realOrder.length && userOrder.every((tid, i) => tid === realOrder[i])) {
        fullOrder = 1;
      }
    }

    total += classified + exact + fullOrder;
    details.push({ group: group.letter, classified, exact, fullOrder });
  }

  return { total, details };
}

export function computeKnockoutPoints(userKnockoutPredictions, realKnockoutResults) {
  let points = 0;
  for (const matchNumber in userKnockoutPredictions) {
    const predictedWinner = userKnockoutPredictions[matchNumber];
    const realResult = realKnockoutResults[matchNumber];
    if (realResult && realResult.winner_team_id === predictedWinner) {
      points += 2;
    }
  }
  return points;
}

export function computeBonusPoints(userBonus, realTopScorer, realBestPlayer) {
  let points = 0;
  if (bonusNamesMatch(userBonus.top_scorer, realTopScorer)) points += 5;
  if (bonusNamesMatch(userBonus.best_player, realBestPlayer)) points += 5;
  return points;
}

export function computePointsBreakdown(userId, state) {
  const {
    allGroupPredictions,
    allTiebreakPredictions,
    allKnockoutPredictions,
    allBonusPredictions,
    matches,
    bonusAnswers,
    groupsT,
  } = state;

  const userGroupPredictions = {};
  for (const pred of allGroupPredictions || []) {
    if (pred.user_id === userId) userGroupPredictions[pred.match_id] = pred.prediction;
  }
  const userTiebreaks = {};
  for (const tb of allTiebreakPredictions || []) {
    if (tb.user_id === userId) userTiebreaks[tb.group_letter] = tb.team_order;
  }

  const realResults = {};
  for (const match of matches) {
    if (match.actual_home_score != null && match.actual_away_score != null && match.group_letter) {
      realResults[match.id] = match.actual_home_score > match.actual_away_score ? '1'
        : match.actual_home_score < match.actual_away_score ? '2' : 'X';
    }
  }

  const allGroups = (groupsT || []).map(g => ({
    letter: g.letter,
    team_ids: (g.teams || []).map(t => t.team_id),
  }));

  const groupBonus = computeGroupPoints(userGroupPredictions, matches, allGroups, userTiebreaks, realResults);

  // Per-group breakdown enriched with played/total counts so the UI can show
  // which groups are already settled vs in progress.
  const groupDetails = groupBonus.details.map(d => {
    const gMatches = matches.filter(m => m.group_letter === d.group);
    const played = gMatches.filter(m => m.actual_home_score != null && m.actual_away_score != null).length;
    return { ...d, played, total: gMatches.length };
  });

  let matchHits = 0, matchPossible = 0;
  for (const match of matches) {
    if (!match.group_letter) continue;
    if (match.actual_home_score == null || match.actual_away_score == null) continue;
    matchPossible++;
    const realResult = match.actual_home_score > match.actual_away_score ? '1'
      : match.actual_home_score < match.actual_away_score ? '2' : 'X';
    if (userGroupPredictions[match.id] === realResult) matchHits++;
  }
  const matchResultPoints = matchHits * 0.25;

  const userKnockoutPredictions = {};
  for (const pred of allKnockoutPredictions || []) {
    if (pred.user_id === userId) userKnockoutPredictions[pred.match_number] = pred.winner_team_id;
  }
  let koHits = 0, koPossible = 0;
  for (const match of matches) {
    if (match.group_letter) continue;
    if (!match.actual_winner_team_id) continue;
    koPossible++;
    if (userKnockoutPredictions[match.match_number] === match.actual_winner_team_id) koHits++;
  }
  const knockoutPoints = koHits * 2;

  const userBonus = (allBonusPredictions || []).find(b => b.user_id === userId) || {};
  const bonus = {
    top_scorer: {
      predicted: userBonus.top_scorer || null,
      correct: !!(bonusAnswers && bonusNamesMatch(userBonus.top_scorer, bonusAnswers.top_scorer)),
      revealed: !!(bonusAnswers && bonusAnswers.top_scorer),
    },
    best_player: {
      predicted: userBonus.best_player || null,
      correct: !!(bonusAnswers && bonusNamesMatch(userBonus.best_player, bonusAnswers.best_player)),
      revealed: !!(bonusAnswers && bonusAnswers.best_player),
    },
  };
  const bonusPoints = (bonus.top_scorer.correct ? 5 : 0) + (bonus.best_player.correct ? 5 : 0);

  return {
    matchResults: { hits: matchHits, possible: matchPossible, points: matchResultPoints },
    groups: { details: groupDetails, points: groupBonus.total },
    knockout: { hits: koHits, possible: koPossible, points: knockoutPoints },
    bonus: { ...bonus, points: bonusPoints },
    total: matchResultPoints + groupBonus.total + knockoutPoints + bonusPoints,
  };
}

export function computeTotalPoints(userId, state) {
  const {
    allGroupPredictions,
    allTiebreakPredictions,
    allKnockoutPredictions,
    allBonusPredictions,
    matches,
    bonusAnswers,
    groupsT,
  } = state;

  const userGroupPredictions = {};
  for (const pred of allGroupPredictions) {
    if (pred.user_id === userId) {
      userGroupPredictions[pred.match_id] = pred.prediction;
    }
  }

  const userTiebreaks = {};
  for (const tb of allTiebreakPredictions) {
    if (tb.user_id === userId) {
      userTiebreaks[tb.group_letter] = tb.team_order;
    }
  }

  const realResults = {};
  for (const match of matches) {
    if (
      match.actual_home_score != null &&
      match.actual_away_score != null &&
      match.group_letter
    ) {
      if (match.actual_home_score > match.actual_away_score) {
        realResults[match.id] = "1";
      } else if (match.actual_home_score < match.actual_away_score) {
        realResults[match.id] = "2";
      } else {
        realResults[match.id] = "X";
      }
    }
  }

  const allGroups = groupsT.map((g) => ({
    letter: g.letter,
    team_ids: g.teams.map((t) => t.team_id),
  }));

  const groupPoints = computeGroupPoints(
    userGroupPredictions,
    matches,
    allGroups,
    userTiebreaks,
    realResults
  );

  // Match result points (0.25 per correct 1X2)
  let matchResultPoints = 0;
  for (const match of matches) {
    if (!match.group_letter) continue;
    if (match.actual_home_score == null || match.actual_away_score == null) continue;
    const realResult = match.actual_home_score > match.actual_away_score ? "1"
      : match.actual_home_score < match.actual_away_score ? "2" : "X";
    const userPred = userGroupPredictions[match.id];
    if (userPred != null && userPred === realResult) {
      matchResultPoints += 0.25;
    }
  }

  const userKnockoutPredictions = {};
  for (const pred of allKnockoutPredictions) {
    if (pred.user_id === userId) {
      userKnockoutPredictions[pred.match_number] = pred.winner_team_id;
    }
  }

  const realKnockoutResults = {};
  for (const match of matches) {
    if (!match.group_letter && match.actual_winner_team_id) {
      realKnockoutResults[match.match_number] = {
        winner_team_id: match.actual_winner_team_id,
      };
    }
  }

  const knockoutPoints = computeKnockoutPoints(
    userKnockoutPredictions,
    realKnockoutResults
  );

  const userBonus =
    allBonusPredictions.find((b) => b.user_id === userId) || {};
  const bonusPoints = computeBonusPoints(
    userBonus,
    bonusAnswers.top_scorer,
    bonusAnswers.best_player
  );

  return groupPoints.total + matchResultPoints + knockoutPoints + bonusPoints;
}
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
  const tiebreakOrder =
    userTiebreaks && userTiebreaks[groupLetter] ? userTiebreaks[groupLetter] : null;

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
    const matches = groupMatches.filter((m) => m.group === group.letter);
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

export function computeGroupPoints(
  userPredictions,
  allMatches,
  allGroups,
  userTiebreaks,
  realResults
) {
  let total = 0;
  const details = [];
  const bestThirds = getBestThirds(allGroups, allMatches, realResults);

  for (const group of allGroups) {
    const groupMatches = allMatches.filter((m) => m.group === group.letter);

    const userStandings = computeGroupStandings(
      group.letter,
      groupMatches,
      userPredictions,
      userTiebreaks
    );
    const realStandings = computeGroupStandings(
      group.letter,
      groupMatches,
      realResults
    );

    const userClassified = userStandings
      .filter((t) => t.position <= 2)
      .map((t) => t.team_id);
    const realClassified = realStandings
      .filter((t) => t.position <= 2)
      .map((t) => t.team_id);

    let classified = 0;
    for (const teamId of userClassified) {
      if (realClassified.includes(teamId)) classified++;
    }

    let exact = 0;
    const userFirst = userStandings.find((t) => t.position === 1);
    const realFirst = realStandings.find((t) => t.position === 1);
    if (userFirst && realFirst && userFirst.team_id === realFirst.team_id) exact++;

    const userSecond = userStandings.find((t) => t.position === 2);
    const realSecond = realStandings.find((t) => t.position === 2);
    if (userSecond && realSecond && userSecond.team_id === realSecond.team_id) exact++;

    const userThird = userStandings.find((t) => t.position === 3);
    const realThird = realStandings.find((t) => t.position === 3);

    let third = 0;
    if (
      userThird &&
      realThird &&
      userThird.team_id === realThird.team_id &&
      bestThirds.includes(realThird.team_id)
    ) {
      third = 1;
    }

    total += classified + exact + third;
    details.push({ group: group.letter, classified, exact, third });
  }

  return { total, details };
}

export function computeKnockoutPoints(userKnockoutPredictions, realKnockoutResults) {
  let points = 0;
  for (const matchNumber in userKnockoutPredictions) {
    const predictedWinner = userKnockoutPredictions[matchNumber];
    const realResult = realKnockoutResults[matchNumber];
    if (realResult && realResult.winner_team_id === predictedWinner) {
      points++;
    }
  }
  return points;
}

export function computeBonusPoints(userBonus, realTopScorer, realBestPlayer) {
  let points = 0;
  if (userBonus.top_scorer && userBonus.top_scorer === realTopScorer) points += 5;
  if (userBonus.best_player && userBonus.best_player === realBestPlayer) points += 5;
  return points;
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
      match.group
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

  const userKnockoutPredictions = {};
  for (const pred of allKnockoutPredictions) {
    if (pred.user_id === userId) {
      userKnockoutPredictions[pred.match_number] = pred.winner_team_id;
    }
  }

  const realKnockoutResults = {};
  for (const match of matches) {
    if (!match.group && match.winner_team_id) {
      realKnockoutResults[match.match_number] = {
        winner_team_id: match.winner_team_id,
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

  return groupPoints.total + knockoutPoints + bonusPoints;
}
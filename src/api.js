import { createClient } from '@supabase/supabase-js';
import { computeTotalPoints } from './scoring.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

export function initSupabase() {
  if (supabase) return supabase;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) return null;
  return session.user;
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, session);
  });
  return subscription;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  if (error) throw error;
  return data;
}

export async function joinGroup(userId, groupName) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ group_name: groupName })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchState() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const profile = await getProfile(user.id);
  const isAdmin = profile.role === 'admin';

  const [playerGroups, teams, groupsT, matches, settings, syncLog, bonusAnswers] = await Promise.all([
    supabase.from('player_groups').select('*').then(r => { if (r.error) throw r.error; return r.data; }),
    supabase.from('teams').select('*').then(r => { if (r.error) throw r.error; return r.data; }),
    supabase.from('groups_t').select('*').then(r => { if (r.error) throw r.error; return r.data.map(g => ({ ...g, teams: (g.team_ids || []).map(tid => ({ team_id: tid })) })); }),
    supabase.from('matches').select('*').order('match_number').then(r => { if (r.error) throw r.error; return r.data; }),
    supabase.from('settings').select('*').single().then(r => { if (r.error) throw r.error; return r.data; }),
    supabase.from('sync_log').select('*').limit(1).single().then(r => { if (r.error) throw r.error; return r.data; }),
    supabase.from('bonus_answers').select('*').limit(1).single().then(r => { if (r.error) throw r.error; return r.data; }),
  ]);

  const isLocked = settings.locked;

  let groupPredictions = [];
  let tiebreakPredictions = [];
  let knockoutPredictions = [];
  let bonusPredictions = [];
  let allGroupPredictions = [];
  let allTiebreakPredictions = [];
  let allKnockoutPredictions = [];
  let allBonusPredictions = [];

  if (!isLocked || isAdmin) {
    const ownPreds = Promise.all([
      supabase.from('group_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('tiebreak_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('knockout_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('bonus_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
    ]);
    [groupPredictions, tiebreakPredictions, knockoutPredictions, bonusPredictions] = await ownPreds;
  } else {
    const ownPreds = await Promise.all([
      supabase.from('group_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('tiebreak_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('knockout_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('bonus_predictions').select('*').eq('user_id', user.id).then(r => { if (r.error) throw r.error; return r.data; }),
    ]);
    [groupPredictions, tiebreakPredictions, knockoutPredictions, bonusPredictions] = ownPreds;
  }

  if (isLocked || isAdmin) {
    const allPreds = await Promise.all([
      supabase.from('group_predictions').select('*').then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('tiebreak_predictions').select('*').then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('knockout_predictions').select('*').then(r => { if (r.error) throw r.error; return r.data; }),
      supabase.from('bonus_predictions').select('*').then(r => { if (r.error) throw r.error; return r.data; }),
    ]);
    [allGroupPredictions, allTiebreakPredictions, allKnockoutPredictions, allBonusPredictions] = allPreds;
  }

  // Convert arrays to objects for picks view
  const all_predictions = {};
  for (const pred of allGroupPredictions) {
    if (!all_predictions[pred.user_id]) all_predictions[pred.user_id] = {};
    all_predictions[pred.user_id][pred.match_id] = pred.prediction;
  }
  const all_tiebreaks = {};
  for (const tb of allTiebreakPredictions) {
    if (!all_tiebreaks[tb.user_id]) all_tiebreaks[tb.user_id] = {};
    all_tiebreaks[tb.user_id][tb.group_letter] = tb.team_order;
  }
  const all_knockout = {};
  for (const pred of allKnockoutPredictions) {
    if (!all_knockout[pred.user_id]) all_knockout[pred.user_id] = {};
    all_knockout[pred.user_id][pred.match_number] = pred.winner_team_id;
  }
  const all_bonus = {};
  for (const pred of allBonusPredictions) {
    all_bonus[pred.user_id] = { top_scorer: pred.top_scorer, best_player: pred.best_player };
  }

  const allProfiles = await getAllProfiles();

  const all_profiles_map = {};
  for (const p of allProfiles) {
    all_profiles_map[p.id] = p;
  }

  // Build enriched entries for picks view
  const publicEntries = [];
  if (isLocked || isAdmin) {
    const userIds = new Set([
      ...Object.keys(all_predictions),
      ...Object.keys(all_tiebreaks),
      ...Object.keys(all_knockout),
      ...Object.keys(all_bonus),
    ]);
    for (const uid of userIds) {
      const player = all_profiles_map[uid];
      if (!player || !player.is_active) continue;

      const groupDetails = [];
      const userPreds = all_predictions[uid] || {};
      const groupMatches = matches.filter(m => m.group_letter).sort((a, b) => {
        if (a.kickoff_at && b.kickoff_at) return new Date(a.kickoff_at) - new Date(b.kickoff_at);
        if (a.kickoff_at) return -1;
        if (b.kickoff_at) return 1;
        return 0;
      });
      for (const match of groupMatches) {
        const predicted = userPreds[match.id];
        let status = 'missing', points = 0;
        let realResult = null;
        if (match.actual_home_score != null && match.actual_away_score != null) {
          realResult = match.actual_home_score > match.actual_away_score ? "1"
            : match.actual_home_score < match.actual_away_score ? "2" : "X";
        }
        if (predicted != null) {
          if (realResult != null) {
            status = predicted === realResult ? 'correct' : 'wrong';
            points = status === 'correct' ? 0.25 : 0;
          } else {
            status = 'pending';
          }
        }
        groupDetails.push({
          match_id: match.id,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          predicted,
          actual_home_score: match.actual_home_score,
          actual_away_score: match.actual_away_score,
          real_result: realResult,
          status,
          points,
        });
      }

      const knockoutDetails = [];
      const userKnockout = all_knockout[uid] || {};
      for (const match of matches) {
        if (match.group_letter) continue;
        const predictedWinner = userKnockout[match.match_number];
        let status = 'missing', points = 0;
        if (predictedWinner != null) {
          if (match.winner_team_id) {
            status = predictedWinner === match.winner_team_id ? 'correct' : 'wrong';
            points = status === 'correct' ? 1 : 0;
          } else {
            status = 'pending';
          }
        }
        knockoutDetails.push({ match_number: match.match_number, predicted_winner: predictedWinner, round: match.round, status, points });
      }

      const bonusDetails = [];
      const userBonus = all_bonus[uid] || {};
      const bonusItems = [
        { label: 'Máx. goleador', key: 'top_scorer' },
        { label: 'Mejor jugador', key: 'best_player' },
      ];
      for (const item of bonusItems) {
        const predicted = userBonus[item.key];
        let status = 'missing', points = 0;
        if (predicted != null) {
          if (bonusAnswers && bonusAnswers[item.key]) {
            status = predicted === bonusAnswers[item.key] ? 'correct' : 'wrong';
            points = status === 'correct' ? 5 : 0;
          } else {
            status = 'pending';
          }
        }
        bonusDetails.push({ label: item.label, predicted, status, points });
      }

      publicEntries.push({
        participant: { id: player.id, name: player.name, is_active: player.is_active, group_name: player.group_name, has_paid: player.has_paid },
        details: { groups: groupDetails, knockout: knockoutDetails, bonus: bonusDetails },
      });
    }
  }

  let leaderboard = [];
  if (isLocked || isAdmin) {
    const activePlayers = allProfiles.filter(p => p.is_active);
    leaderboard = activePlayers.map(player => {
      const total = computeTotalPoints(player.id, {
        allGroupPredictions,
        allTiebreakPredictions,
        allKnockoutPredictions,
        allBonusPredictions,
        matches,
        bonusAnswers,
        groupsT,
        teams,
      });
      return {
        id: player.id,
        name: player.name,
        group_name: player.group_name,
        has_paid: player.has_paid,
        points: total,
      };
    }).sort((a, b) => b.points - a.points);
  }

  // Map to the state schema expected by render files
  const predictions = Object.fromEntries(groupPredictions.map(p => [p.match_id, p.prediction]));
  const tiebreaks = Object.fromEntries(tiebreakPredictions.map(t => [t.group_letter, t.team_order]));
  const knockout_predictions = Object.fromEntries(knockoutPredictions.map(k => [k.match_number, k.winner_team_id]));
  const bonus = bonusPredictions.length > 0 ? { top_scorer: bonusPredictions[0].top_scorer, best_player: bonusPredictions[0].best_player } : {};

  const leaderboardWithRank = leaderboard.map((row, index) => ({
    ...row,
    participant_id: row.id,
    total: row.points,
    rank: index + 1,
    prize: 0,
  }));

  const prize_pool = {
    groups: playerGroups.map(pg => {
      const groupPlayers = allProfiles.filter(p => p.group_name === pg.name && p.is_active);
      const paidCount = groupPlayers.filter(p => p.has_paid).length;
      return {
        name: pg.name,
        pot: paidCount * (settings.entry_fee_cents || 200),
        paid_count: paidCount,
        active_count: groupPlayers.length,
        entry_fee: (settings.entry_fee_cents || 200) / 100,
      };
    }),
  };

  return {
    profile,
    participant: profile,
    playerGroups,
    teams,
    groups: groupsT,
    groupsT,
    groups: groupsT,
    matches,
    settings,
    syncLog,
    sync: syncLog,
    bonusAnswers,
    bonus_answers: bonusAnswers,
    // Object versions for renderers
    predictions,
    tiebreaks,
    knockout_predictions,
    bonus,
    // Array versions for scoring
    groupPredictions,
    tiebreakPredictions,
    knockoutPredictions,
    bonusPredictions,
    allGroupPredictions: (isLocked || isAdmin) ? allGroupPredictions : [],
    allTiebreakPredictions: (isLocked || isAdmin) ? allTiebreakPredictions : [],
    allKnockoutPredictions: (isLocked || isAdmin) ? allKnockoutPredictions : [],
    allBonusPredictions: (isLocked || isAdmin) ? allBonusPredictions : [],
    // Object versions for picks view
    public_predictions: publicEntries,
    public_tiebreaks: all_tiebreaks,
    public_knockout: all_knockout,
    public_bonus: all_bonus,
    all_profiles: all_profiles_map,
    allProfiles,
    players: allProfiles,
    leaderboard: leaderboardWithRank,
    prize_pool,
  };
}

export async function saveGroupPrediction(matchId, prediction) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('group_predictions')
    .upsert({
      user_id: user.id,
      match_id: matchId,
      prediction,
    }, { onConflict: 'user_id,match_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveTiebreak(groupLetter, teamOrder) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('tiebreak_predictions')
    .upsert({
      user_id: user.id,
      group_letter: groupLetter,
      team_order: teamOrder,
    }, { onConflict: 'user_id,group_letter' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveKnockoutPrediction(matchNumber, winnerTeamId) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('knockout_predictions')
    .upsert({
      user_id: user.id,
      match_number: matchNumber,
      winner_team_id: winnerTeamId,
    }, { onConflict: 'user_id,match_number' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveBonus(topScorer, bestPlayer) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('bonus_predictions')
    .upsert({
      user_id: user.id,
      top_scorer: topScorer,
      best_player: bestPlayer,
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateMatch(matchId, data) {
  const { data: result, error } = await supabase
    .from('matches')
    .update(data)
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function adminTogglePaid(userId) {
  const profile = await getProfile(userId);
  const { data, error } = await supabase
    .from('profiles')
    .update({ has_paid: !profile.has_paid })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminToggleActive(userId) {
  const profile = await getProfile(userId);
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: !profile.is_active })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminCreateGroup(name) {
  const { data, error } = await supabase
    .from('player_groups')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateSettings(updates) {
  const { data, error } = await supabase
    .from('settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateBonusAnswers(topScorer, bestPlayer) {
  const { data, error } = await supabase
    .from('bonus_answers')
    .upsert({
      id: 1,
      top_scorer: topScorer,
      best_player: bestPlayer,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminCreatePlayer(email, password, name, groupName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (groupName && data?.user?.id) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ group_name: groupName })
      .eq('id', data.user.id);
    if (updateError) throw updateError;
  }
  return data;
}

export async function adminSetRole(userId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API_BASE = 'https://worldcup26.ir';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  if (!SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate caller's JWT — only authenticated users may trigger sync
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const jwt = authHeader.slice(7);
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || '');
  const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Fetch team code mapping from our DB
    const { data: teams } = await supabase.from('teams').select('id, code');
    if (!teams) throw new Error('No teams found');

    const codeToId = {};
    for (const t of teams) {
      codeToId[t.code] = t.id;
    }

    // Fetch all our matches
    const { data: ourMatches } = await supabase
      .from('matches')
      .select('id, match_number, home_team_id, away_team_id, status, actual_home_score, actual_away_score, actual_winner_team_id');

    if (!ourMatches) throw new Error('No matches found in DB');

    // Fetch matches from worldcup26.ir
    const response = await fetch(`${API_BASE}/get/games`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const apiGames = data.games || [];
    let matchesUpdated = 0;

    // Build fifa_code lookup from API teams
    const teamsResponse = await fetch(`${API_BASE}/get/teams`);
    const teamsData = await teamsResponse.json();
    const apiTeams = teamsData.teams || [];
    const fifaCodeById = {};
    for (const t of apiTeams) {
      fifaCodeById[t.id] = t.fifa_code;
    }

    for (const game of apiGames) {
      const homeCode = fifaCodeById[game.home_team_id];
      const awayCode = fifaCodeById[game.away_team_id];
      if (!homeCode || !awayCode) continue;

      const homeId = codeToId[homeCode];
      const awayId = codeToId[awayCode];
      if (!homeId || !awayId) {
        console.warn(`Unknown team codes: ${homeCode} (${game.home_team_id}) vs ${awayCode} (${game.away_team_id})`);
        continue;
      }

      // Find match in our DB by home/away team IDs
      const ourMatch = ourMatches.find(m =>
        m.home_team_id?.toLowerCase() === homeId?.toLowerCase() &&
        m.away_team_id?.toLowerCase() === awayId?.toLowerCase()
      );

      if (!ourMatch) {
        console.warn(`No match found for ${homeCode} vs ${awayCode}`);
        continue;
      }

      const updates = {};

      if (game.finished === 'TRUE') {
        updates.status = 'finished';
        const homeScore = parseInt(game.home_score, 10);
        const awayScore = parseInt(game.away_score, 10);
        if (!isNaN(homeScore)) updates.actual_home_score = homeScore;
        if (!isNaN(awayScore)) updates.actual_away_score = awayScore;
        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          if (homeScore > awayScore) updates.actual_winner_team_id = homeId;
          else if (awayScore > homeScore) updates.actual_winner_team_id = awayId;
        }
      } else if (game.time_elapsed && game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'finished') {
        updates.status = 'live';
        const homeScore = parseInt(game.home_score, 10);
        const awayScore = parseInt(game.away_score, 10);
        if (!isNaN(homeScore)) updates.actual_home_score = homeScore;
        if (!isNaN(awayScore)) updates.actual_away_score = awayScore;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('matches')
          .update(updates)
          .eq('id', ourMatch.id);

        if (updateError) {
          console.error(`Error updating match ${ourMatch.id}:`, updateError);
        } else {
          matchesUpdated++;
        }
      }
    }

    // Update sync log
    await supabase
      .from('sync_log')
      .update({ last_sync_at: new Date().toISOString(), sync_status: 'success' })
      .eq('id', 1);

    return new Response(JSON.stringify({ matchesUpdated, syncAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    try {
      await supabase
        .from('sync_log')
        .update({ sync_status: `error: ${error.message}` })
        .eq('id', 1);
    } catch (_) {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

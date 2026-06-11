import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FOOTBALL_DATA_API = 'https://api.football-data.org/v4';
const COMPETITION_CODE = 'WC';
const API_TOKEN = Deno.env.get('FOOTBALL_DATA_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  if (!API_TOKEN) {
    return new Response(JSON.stringify({ error: 'FOOTBALL_DATA_API_TOKEN not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const results = {};

    // Fetch matches from football-data.org
    const matchesResponse = await fetch(`${FOOTBALL_DATA_API}/competitions/${COMPETITION_CODE}/matches`, {
      headers: { 'X-Auth-Token': API_TOKEN },
    });

    if (!matchesResponse.ok) {
      throw new Error(`Football Data API error: ${matchesResponse.status} ${matchesResponse.statusText}`);
    }

    const matchesData = await matchesResponse.json();
    let matchesUpdated = 0;

    for (const match of matchesData.matches || []) {
      if (match.status === 'FINISHED' || match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'TIMED') {
        const matchUpdates = {
          status: match.status === 'FINISHED' ? 'finished' : match.status === 'IN_PLAY' || match.status === 'PAUSED' ? 'live' : 'scheduled',
          actual_home_score: match.score?.fullTime?.homeTeam ?? null,
          actual_away_score: match.score?.fullTime?.awayTeam ?? null,
          kickoff_at: match.utcDate,
        };

        if (match.score?.winner === 'HOME_TEAM') {
          const homeTeam = match.homeTeam?.id;
          if (homeTeam) matchUpdates.actual_winner_team_id = String(homeTeam);
        } else if (match.score?.winner === 'AWAY_TEAM') {
          const awayTeam = match.awayTeam?.id;
          if (awayTeam) matchUpdates.actual_winner_team_id = String(awayTeam);
        }

        // Map football-data.org match to our match ID if possible
        // We match by kickoff time and teams, since IDs won't match
        const existingMatch = await findMatchByApiData(supabase, match);
        if (existingMatch) {
          const { error } = await supabase
            .from('matches')
            .update(matchUpdates)
            .eq('id', existingMatch.id);
          if (!error) matchesUpdated++;
        }
      }
    }

    // Fetch standings
    const standingsResponse = await fetch(`${FOOTBALL_DATA_API}/competitions/${COMPETITION_CODE}/standings`, {
      headers: { 'X-Auth-Token': API_TOKEN },
    });

    let standingsUpdated = 0;
    if (standingsResponse.ok) {
      const standingsData = await standingsResponse.json();
      for (const standing of standingsData.standings || []) {
        if (standing.type === 'TOTAL' && standing.stage === 'GROUP_STAGE') {
          const groupLetter = standing.group?.replace('Group ', '');
          if (!groupLetter) continue;

          for (const entry of standing.table || []) {
            const teamId = String(entry.team?.id);
            const teamData = {
              id: teamId,
              name: entry.team?.name || '',
              code: entry.team?.tla || entry.team?.ShortName || '',
              flag: entry.team?.crest || '',
            };

            const { error: teamError } = await supabase
              .from('teams')
              .upsert(teamData, { onConflict: 'id' });
            if (!teamError) standingsUpdated++;
          }
        }
      }
    }

    // Update sync log
    await supabase
      .from('sync_log')
      .update({ last_sync_at: new Date().toISOString(), sync_status: 'success' })
      .eq('id', 1);

    results.matchesUpdated = matchesUpdated;
    results.standingsUpdated = standingsUpdated;
    results.syncAt = new Date().toISOString();

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    await supabase
      .from('sync_log')
      .update({ sync_status: `error: ${error.message}` })
      .eq('id', 1);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function findMatchByApiData(supabase, apiMatch) {
  const kickoffDate = apiMatch.utcDate?.substring(0, 10);
  const homeId = String(apiMatch.homeTeam?.id || '');
  const awayId = String(apiMatch.awayTeam?.id || '');

  if (!homeId && !awayId) return null;

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, kickoff_at')
    .eq('stage', 'GROUP');

  if (!matches) return null;

  for (const m of matches) {
    if (m.home_team_id === homeId && m.away_team_id === awayId) {
      return m;
    }
  }

  // Fallback: match by kickoff date if teams don't match
  const { data: dateMatches } = await supabase
    .from('matches')
    .select('id, kickoff_at, home_team_id, away_team_id')
    .gte('kickoff_at', kickoffDate + 'T00:00:00')
    .lte('kickoff_at', kickoffDate + 'T23:59:59')
    .eq('stage', 'GROUP');

  if (dateMatches && dateMatches.length === 1) {
    return dateMatches[0];
  }

  return null;
}
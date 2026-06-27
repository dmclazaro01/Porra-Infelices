import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API_BASE = 'https://worldcup26.ir';
const BBC_SCHEDULE_URL = 'https://www.bbc.com/sport/football/world-cup/schedule#KnockoutStage';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Round names used by the BBC -> our internal round codes
const BBC_ROUND_MAP: Record<string, string> = {
  'Last 32': 'R32',
  'Last 16': 'R16',
  'Quarter-finals': 'QF',
  'Semi-finals': 'SF',
  'Third place': 'THIRD',
  'Final': 'FINAL',
};

Deno.serve(async (req) => {
  if (!SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Fetch team code mapping from our DB
    const { data: teams } = await supabase.from('teams').select('id, code');
    if (!teams) throw new Error('No teams found');

    const codeToId: Record<string, string> = {};
    const idToCode: Record<string, string> = {};
    for (const t of teams) {
      codeToId[t.code] = t.id;
      idToCode[t.id] = t.code;
    }

    // Fetch all our matches
    const { data: ourMatches } = await supabase
      .from('matches')
      .select('id, match_number, round, stage, home_team_id, away_team_id, home_label, away_label, status, actual_home_score, actual_away_score, actual_winner_team_id');

    if (!ourMatches) throw new Error('No matches found in DB');

    let groupUpdates = 0;
    let knockoutUpdates = 0;
    let bbcError: string | null = null;
    let apiError: string | null = null;

    // ============================================================
    // 1. Group stage sync from worldcup26.ir (existing source)
    // ============================================================
    try {
      const response = await fetch(`${API_BASE}/get/games`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const apiGames = data.games || [];

      const teamsResponse = await fetch(`${API_BASE}/get/teams`);
      const teamsData = await teamsResponse.json();
      const apiTeams = teamsData.teams || [];
      const fifaCodeById: Record<string, string> = {};
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

        const ourMatch = ourMatches.find(m =>
          m.stage === 'GROUP' &&
          m.home_team_id?.toLowerCase() === homeId?.toLowerCase() &&
          m.away_team_id?.toLowerCase() === awayId?.toLowerCase()
        );

        if (!ourMatch) {
          console.warn(`No group match found for ${homeCode} vs ${awayCode}`);
          continue;
        }

        const updates: Record<string, unknown> = {};

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
            groupUpdates++;
          }
        }
      }
    } catch (error) {
      console.error('Group sync error:', error);
      apiError = error.message;
    }

    // ============================================================
    // 2. Knockout stage sync from BBC Sport
    // ============================================================
    try {
      const bbcResponse = await fetch(BBC_SCHEDULE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
      });
      if (!bbcResponse.ok) throw new Error(`BBC HTTP ${bbcResponse.status}`);

      const html = await bbcResponse.text();
      const bbcMatches = parseBBCKnockoutMatches(html);

      const knockoutMatches = ourMatches.filter(m => m.stage === 'KNOCKOUT');

      for (const bm of bbcMatches) {
        const roundCode = BBC_ROUND_MAP[bm.roundName];
        if (!roundCode) {
          console.warn(`Unknown BBC round: ${bm.roundName}`);
          continue;
        }

        // Resolve BBC teams to our team IDs or labels
        const homeInfo = resolveBBCTeam(bm.home, codeToId);
        const awayInfo = resolveBBCTeam(bm.away, codeToId);

        let ourMatch = findKnockoutMatch(
          knockoutMatches,
          roundCode,
          homeInfo,
          awayInfo
        );

        if (!ourMatch) {
          console.warn(`No knockout match found for ${bm.roundName}: ${homeInfo.label || homeInfo.teamId} vs ${awayInfo.label || awayInfo.teamId}`);
          continue;
        }

        const updates: Record<string, unknown> = {};

        // Update team IDs if they were revealed by the BBC
        if (homeInfo.teamId && !ourMatch.home_team_id) updates.home_team_id = homeInfo.teamId;
        if (awayInfo.teamId && !ourMatch.away_team_id) updates.away_team_id = awayInfo.teamId;

        // Update scores and status
        const homeScore = bm.home.totalScore;
        const awayScore = bm.away.totalScore;

        if (bm.status === 'PostEvent') {
          updates.status = 'finished';
          if (homeScore !== null) updates.actual_home_score = homeScore;
          if (awayScore !== null) updates.actual_away_score = awayScore;

          if (bm.winner === 'home') updates.actual_winner_team_id = homeInfo.teamId || ourMatch.home_team_id;
          else if (bm.winner === 'away') updates.actual_winner_team_id = awayInfo.teamId || ourMatch.away_team_id;
          else if (homeScore !== null && awayScore !== null) {
            if (homeScore > awayScore) updates.actual_winner_team_id = homeInfo.teamId || ourMatch.home_team_id;
            else if (awayScore > homeScore) updates.actual_winner_team_id = awayInfo.teamId || ourMatch.away_team_id;
          }
        } else if (bm.status === 'MidEvent') {
          updates.status = 'live';
          if (homeScore !== null) updates.actual_home_score = homeScore;
          if (awayScore !== null) updates.actual_away_score = awayScore;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('matches')
            .update(updates)
            .eq('id', ourMatch.id);

          if (updateError) {
            console.error(`Error updating knockout match ${ourMatch.id}:`, updateError);
          } else {
            knockoutUpdates++;
          }
        }
      }
    } catch (error) {
      console.error('BBC knockout sync error:', error);
      bbcError = error.message;
    }

    // Update sync log
    const syncStatus = apiError || bbcError
      ? `partial: groups=${groupUpdates}, ko=${knockoutUpdates}, apiErr=${apiError || '-'}, bbcErr=${bbcError || '-'}`
      : 'success';

    await supabase
      .from('sync_log')
      .upsert({ id: 1, last_sync_at: new Date().toISOString(), sync_status: syncStatus });

    return new Response(JSON.stringify({
      groupUpdates,
      knockoutUpdates,
      apiError,
      bbcError,
      syncAt: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    try {
      await supabase
        .from('sync_log')
        .upsert({ id: 1, sync_status: `error: ${error.message}` });
    } catch (_) {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================
// BBC parsing helpers
// ============================================================

interface BBCTeam {
  fullName: string;
  code: string;
  placeholder: string | null;
  fulltimeScore: number | null;
  extratimeScore: number | null;
  penaltyShootoutScore: number | null;
  totalScore: number | null;
}

interface BBCMatch {
  eventId: string;
  roundName: string;
  status: string; // PreEvent, MidEvent, PostEvent
  statusText: string;
  winner: 'home' | 'away' | null;
  home: BBCTeam;
  away: BBCTeam;
  dateIso: string;
}

interface ResolvedTeam {
  teamId: string | null;
  label: string | null;
}

function parseBBCKnockoutMatches(html: string): BBCMatch[] {
  const prefix = 'window.__INITIAL_DATA__="';
  const start = html.indexOf(prefix);
  if (start === -1) throw new Error('BBC initial data not found');

  const end = html.indexOf('";</script>', start);
  if (end === -1) throw new Error('BBC initial data end not found');

  const raw = html.slice(start + prefix.length, end);
  // The content is a JSON string literal that has been escaped for inclusion
  // in the HTML. Parse it as a JSON string to unescape, then parse the result.
  const unescaped = JSON.parse(`"${raw}"`);
  const data = JSON.parse(unescaped);

  // Find the tournament data block
  const tournamentData = Object.values(data.data || {}).find(
    (v: any) => v?.name === 'football-world-cup-2022' && v?.data?.knockoutStage
  ) as any;

  if (!tournamentData?.data?.knockoutStage) {
    throw new Error('BBC knockout stage data not found');
  }

  const ks = tournamentData.data.knockoutStage;
  const out: BBCMatch[] = [];

  for (const round of ks.preFinalRounds || []) {
    for (const m of round.matches || []) {
      const evt = m.event;
      if (!evt) continue;
      const parsed = parseBBCEvent(evt, round.roundName);
      if (parsed) out.push(parsed);
    }
  }

  if (ks.thirdPlacePlayoff?.event) {
    const parsed = parseBBCEvent(ks.thirdPlacePlayoff.event, 'Third place');
    if (parsed) out.push(parsed);
  }

  if (ks.final?.event) {
    const parsed = parseBBCEvent(ks.final.event, 'Final');
    if (parsed) out.push(parsed);
  }

  return out;
}

function parseBBCEvent(evt: any, roundName: string): BBCMatch | null {
  const teams = evt.teams || [];
  if (teams.length !== 2) return null;

  const homeTeam = teams.find((t: any) => t.alignment === 'home') || teams[0];
  const awayTeam = teams.find((t: any) => t.alignment === 'away') || teams[1];

  const winner = evt.winner === 'home' || evt.winner === 'away' ? evt.winner : null;

  return {
    eventId: evt.id,
    roundName,
    status: evt.status,
    statusText: evt.statusComment?.value || '',
    winner,
    home: parseBBCTeam(homeTeam),
    away: parseBBCTeam(awayTeam),
    dateIso: evt.date?.iso,
  };
}

function parseBBCTeam(t: any): BBCTeam {
  const fulltimeScore = parseScore(t.fulltimeScore);
  const extratimeScore = parseScore(t.extratimeScore);
  const penaltyShootoutScore = parseScore(t.penaltyShootoutScore);

  const totalScore = fulltimeScore !== null && extratimeScore !== null
    ? fulltimeScore + extratimeScore
    : fulltimeScore;

  return {
    fullName: t.name?.fullName || '',
    code: t.name?.code || '',
    placeholder: t.knockoutGroupPlaceholder || null,
    fulltimeScore,
    extratimeScore,
    penaltyShootoutScore,
    totalScore,
  };
}

function parseScore(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

function resolveBBCTeam(team: BBCTeam, codeToId: Record<string, string>): ResolvedTeam {
  if (team.code) {
    const id = codeToId[team.code];
    if (id) return { teamId: id, label: null };
  }

  // Convert BBC placeholder like "E1" to our label "1E"
  if (team.placeholder) {
    const label = normalizePlaceholder(team.placeholder);
    if (label) return { teamId: null, label };
  }

  return { teamId: null, label: null };
}

function normalizePlaceholder(placeholder: string): string | null {
  if (!placeholder) return null;

  // Simple position placeholders: "E1", "2B" -> "1E", "2B"
  // BBC seems to use letter-first for winners (E1) and digit-first for runners-up (2B)
  const letterFirst = /^([A-L])([12])$/.exec(placeholder);
  if (letterFirst) return `${letterFirst[2]}${letterFirst[1]}`;

  const digitFirst = /^([12])([A-L])$/.exec(placeholder);
  if (digitFirst) return placeholder;

  // Third-place placeholders: e.g. "ABCDF3" -> try to map to our 3XXX labels
  // Our labels are: 3ABC, 3DEF, 3GHI, 3JKL, 3ABCD, 3EFGH, 3IJKL, 3EFGH2
  const thirdMatch = /^([A-L]+)(3)$/.exec(placeholder);
  if (thirdMatch) {
    const letters = thirdMatch[1];
    const digit = thirdMatch[2];
    // Return the letters as they appear so we can attempt fuzzy matching later
    return `${digit}${letters}`;
  }

  return null;
}

function findKnockoutMatch(
  matches: any[],
  roundCode: string,
  home: ResolvedTeam,
  away: ResolvedTeam
): any | null {
  // Strategy 1: both teams resolved to real IDs
  if (home.teamId && away.teamId) {
    const exact = matches.find(m =>
      m.round === roundCode &&
      m.home_team_id?.toLowerCase() === home.teamId?.toLowerCase() &&
      m.away_team_id?.toLowerCase() === away.teamId?.toLowerCase()
    );
    if (exact) return exact;

    const reversed = matches.find(m =>
      m.round === roundCode &&
      m.home_team_id?.toLowerCase() === away.teamId?.toLowerCase() &&
      m.away_team_id?.toLowerCase() === home.teamId?.toLowerCase()
    );
    if (reversed) return reversed;
  }

  // Strategy 2: at least one team resolved to ID; try to match single side
  if (home.teamId || away.teamId) {
    const byOneTeam = matches.find(m =>
      m.round === roundCode &&
      ((home.teamId && m.home_team_id?.toLowerCase() === home.teamId?.toLowerCase()) ||
       (away.teamId && m.away_team_id?.toLowerCase() === away.teamId?.toLowerCase()))
    );
    if (byOneTeam) return byOneTeam;
  }

  // Strategy 3: match by labels (placeholders)
  if (home.label || away.label) {
    const byLabels = matches.find(m =>
      m.round === roundCode &&
      labelsMatch(m.home_label, home.label) &&
      labelsMatch(m.away_label, away.label)
    );
    if (byLabels) return byLabels;

    const byLabelsReversed = matches.find(m =>
      m.round === roundCode &&
      labelsMatch(m.home_label, away.label) &&
      labelsMatch(m.away_label, home.label)
    );
    if (byLabelsReversed) return byLabelsReversed;

    // Strategy 4: fuzzy match for third-place placeholders
    const fuzzy = matches.find(m =>
      m.round === roundCode &&
      fuzzyLabelsMatch(m.home_label, home.label, m.away_label, away.label)
    );
    if (fuzzy) return fuzzy;
  }

  return null;
}

function labelsMatch(dbLabel: string | null, bbcLabel: string | null): boolean {
  if (!dbLabel || !bbcLabel) return false;
  return dbLabel.toLowerCase() === bbcLabel.toLowerCase();
}

function fuzzyLabelsMatch(
  homeLabel: string | null,
  homeBbc: string | null,
  awayLabel: string | null,
  awayBbc: string | null
): boolean {
  // Example: BBC "3ABCDF" vs our "3ABC" / "3DEF"
  // If one of our labels is a subset of the BBC placeholder, consider it a match.
  if (!homeBbc || !awayBbc) return false;

  const homeFuzzy = isThirdPlaceholderSubset(homeLabel, homeBbc);
  const awayFuzzy = isThirdPlaceholderSubset(awayLabel, awayBbc);

  return homeFuzzy && awayFuzzy;
}

function isThirdPlaceholderSubset(dbLabel: string | null, bbcLabel: string | null): boolean {
  if (!dbLabel || !bbcLabel) return false;
  const db = dbLabel.toLowerCase();
  const bbc = bbcLabel.toLowerCase();
  if (!db.startsWith('3') || !bbc.startsWith('3')) return false;
  const dbLetters = db.slice(1);
  const bbcLetters = bbc.slice(1);
  // Our label letters should all appear in the BBC placeholder letters
  return [...dbLetters].every(c => bbcLetters.includes(c));
}

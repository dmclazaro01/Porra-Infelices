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
  '3rd Place Final': 'THIRD',
  'Final': 'FINAL',
};

// BBC team codes that differ from our internal team codes.
const BBC_CODE_MAP: Record<string, string> = {
  'SA': 'RSA',
  'MOR': 'MAR',
  'SPA': 'ESP',
  'SWI': 'SUI',
};

// Official 2026 World Cup knockout bracket.
// M73-M88 are the Round of 32 matches; M89-M96 Round of 16; M97-M100 QF; M101-M102 SF.
const KNOCKOUT_SLOTS = [
  { id: 'M73',  round: 'R32',  home_label: '1E',    away_label: '3ABCDF' },
  { id: 'M74',  round: 'R32',  home_label: '1I',    away_label: '3CDFGH' },
  { id: 'M75',  round: 'R32',  home_label: '2A',    away_label: '2B' },
  { id: 'M76',  round: 'R32',  home_label: '1F',    away_label: '2C' },
  { id: 'M77',  round: 'R32',  home_label: '2K',    away_label: '2L' },
  { id: 'M78',  round: 'R32',  home_label: '1H',    away_label: '2J' },
  { id: 'M79',  round: 'R32',  home_label: '1D',    away_label: '3BEFIJ' },
  { id: 'M80',  round: 'R32',  home_label: '1G',    away_label: '3AEHIJ' },
  { id: 'M81',  round: 'R32',  home_label: '1C',    away_label: '2F' },
  { id: 'M82',  round: 'R32',  home_label: '2E',    away_label: '2I' },
  { id: 'M83',  round: 'R32',  home_label: '1A',    away_label: '3CEFHI' },
  { id: 'M84',  round: 'R32',  home_label: '1L',    away_label: '3EHIJK' },
  { id: 'M85',  round: 'R32',  home_label: '1J',    away_label: '2H' },
  { id: 'M86',  round: 'R32',  home_label: '2D',    away_label: '2G' },
  { id: 'M87',  round: 'R32',  home_label: '1B',    away_label: '3EFGIJ' },
  { id: 'M88',  round: 'R32',  home_label: '1K',    away_label: '3DEIJL' },
  { id: 'M89',  round: 'R16',  home_label: 'WM73',  away_label: 'WM74' },
  { id: 'M90',  round: 'R16',  home_label: 'WM75',  away_label: 'WM76' },
  { id: 'M91',  round: 'R16',  home_label: 'WM77',  away_label: 'WM78' },
  { id: 'M92',  round: 'R16',  home_label: 'WM79',  away_label: 'WM80' },
  { id: 'M93',  round: 'R16',  home_label: 'WM81',  away_label: 'WM82' },
  { id: 'M94',  round: 'R16',  home_label: 'WM83',  away_label: 'WM84' },
  { id: 'M95',  round: 'R16',  home_label: 'WM85',  away_label: 'WM86' },
  { id: 'M96',  round: 'R16',  home_label: 'WM87',  away_label: 'WM88' },
  { id: 'M97',  round: 'QF',   home_label: 'WM89',  away_label: 'WM90' },
  { id: 'M98',  round: 'QF',   home_label: 'WM91',  away_label: 'WM92' },
  { id: 'M99',  round: 'QF',   home_label: 'WM93',  away_label: 'WM94' },
  { id: 'M100', round: 'QF',   home_label: 'WM95',  away_label: 'WM96' },
  { id: 'M101', round: 'SF',   home_label: 'WM97',  away_label: 'WM98' },
  { id: 'M102', round: 'SF',   home_label: 'WM99',  away_label: 'WM100' },
  { id: 'M103', round: 'THIRD', home_label: 'LM101', away_label: 'LM102' },
  { id: 'M104', round: 'FINAL', home_label: 'WM101', away_label: 'WM102' },
];

async function ensureKnockoutSlots(supabase: any) {
  // Do NOT set status here: the upsert runs on every sync, and forcing
  // status='scheduled' would flip a live/finished match back to scheduled
  // between this call and the BBC parse below if BBC fails to return it.
  const rows = KNOCKOUT_SLOTS.map(s => ({
    id: s.id,
    match_number: s.id,
    round: s.round,
    stage: 'KNOCKOUT',
    home_label: s.home_label,
    away_label: s.away_label,
  }));

  const { error } = await supabase.from('matches').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`Failed to seed knockout slots: ${error.message}`);
  console.log(`Ensured ${rows.length} knockout slots`);
  return rows.length;
}

Deno.serve(async (req) => {
  if (!SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const debug = {
      knockoutMatchCount: 0,
      bbcMatchCount: 0,
      seededSlots: 0,
      r32Status: [] as { id: string; home_team_id: string | null; away_team_id: string | null; home_label: string; away_label: string }[],
    };

    // Ensure knockout match slots exist (seed once)
    debug.seededSlots = await ensureKnockoutSlots(supabase);

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
      debug.bbcMatchCount = bbcMatches.length;

      const knockoutMatches = ourMatches.filter(m => m.stage === 'KNOCKOUT');
      debug.knockoutMatchCount = knockoutMatches.length;

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

    // Re-read final knockout state for debugging
    const { data: finalMatches } = await supabase
      .from('matches')
      .select('id, match_number, round, stage, home_team_id, away_team_id, home_label, away_label')
      .eq('stage', 'KNOCKOUT')
      .eq('round', 'R32');
    debug.r32Status = (finalMatches || [])
      .sort((a: any, b: any) => a.id.localeCompare(b.id))
      .map((m: any) => ({
        id: m.id,
        home_team_id: m.home_team_id || null,
        away_team_id: m.away_team_id || null,
        home_label: m.home_label,
        away_label: m.away_label,
      }));

    return new Response(JSON.stringify({
      groupUpdates,
      knockoutUpdates,
      apiError,
      bbcError,
      debug,
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

  // BBC uses different property names depending on the response; support both.
  const rounds = ks.preFinalRounds || ks.rounds || [];
  for (const round of rounds) {
    for (const m of round.matches || []) {
      const evt = m.event;
      if (!evt) continue;
      const parsed = parseBBCEvent(evt, round.roundName);
      if (parsed) out.push(parsed);
    }
  }

  const thirdPlaceEvent = ks.thirdPlacePlayoff?.match?.event || ks.thirdPlacePlayoff?.event;
  if (thirdPlaceEvent) {
    const parsed = parseBBCEvent(thirdPlaceEvent, '3rd Place Final');
    if (parsed) out.push(parsed);
  }

  const finalEvent = ks.final?.match?.event || ks.final?.event;
  if (finalEvent) {
    const parsed = parseBBCEvent(finalEvent, 'Final');
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
  const mappedCode = team.code ? (BBC_CODE_MAP[team.code] || team.code) : '';
  const teamId = mappedCode ? codeToId[mappedCode] || null : null;

  // Convert BBC placeholder like "E1" to our label "1E"
  const label = team.placeholder ? normalizePlaceholder(team.placeholder) : null;

  return { teamId, label };
}

function normalizePlaceholder(placeholder: string): string | null {
  if (!placeholder) return null;

  // Simple position placeholders: "E1", "2B" -> "1E", "2B"
  // BBC seems to use letter-first for winners (E1) and digit-first for runners-up (2B)
  const letterFirst = /^([A-L])([12])$/.exec(placeholder);
  if (letterFirst) return `${letterFirst[2]}${letterFirst[1]}`;

  const digitFirst = /^([12])([A-L])$/.exec(placeholder);
  if (digitFirst) return placeholder;

  // Third-place placeholders: e.g. "ABCDF3" -> "3ABCDF"
  const thirdMatch = /^([A-L]+)(3)$/.exec(placeholder);
  if (thirdMatch) {
    const letters = thirdMatch[1];
    const digit = thirdMatch[2];
    return `${digit}${letters}`;
  }

  // BBC winner/loser placeholders mapped to our match-number labels.
  // Slots are seeded in the exact order BBC returns them.
  const winner32 = /^W-32-(\d+)$/.exec(placeholder);
  if (winner32) {
    const n = parseInt(winner32[1], 10);
    if (n >= 1 && n <= 16) return `WM${72 + n}`;
  }

  const winner16 = /^W-16-(\d+)$/.exec(placeholder);
  if (winner16) {
    const n = parseInt(winner16[1], 10);
    if (n >= 1 && n <= 8) return `WM${88 + n}`;
  }

  const winnerQF = /^W-QF-(\d+)$/.exec(placeholder);
  if (winnerQF) {
    const n = parseInt(winnerQF[1], 10);
    if (n >= 1 && n <= 4) return `WM${96 + n}`;
  }

  const winnerSF = /^W-SF-(\d+)$/.exec(placeholder);
  if (winnerSF) {
    const n = parseInt(winnerSF[1], 10);
    if (n >= 1 && n <= 2) return `WM${100 + n}`;
  }

  const loserSF = /^L-SF-(\d+)$/.exec(placeholder);
  if (loserSF) {
    const n = parseInt(loserSF[1], 10);
    if (n >= 1 && n <= 2) return `LM${100 + n}`;
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

  // Strategy 3: match by labels (placeholders). Also used as a fallback when
  // BBC already shows real team names but our DB still has placeholder labels.
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

-- Update teams with real 2026 World Cup data
-- First, delete placeholder teams if they exist, but only if no matches reference them
-- If you have existing data with FK references, this will need manual cleanup

-- Clear existing teams (only if empty or you want to replace all)
DELETE FROM teams WHERE id NOT IN (
  SELECT DISTINCT home_team_id FROM matches WHERE home_team_id IS NOT NULL
  UNION
  SELECT DISTINCT away_team_id FROM matches WHERE away_team_id IS NOT NULL
);

-- Insert all 48 real teams for the 2026 FIFA World Cup
INSERT INTO teams (id, name, code, flag) VALUES
('mex', 'Mexico', 'MEX', '🇲🇽'),
('kor', 'South Korea', 'KOR', '🇰🇷'),
('cze', 'Czech Republic', 'CZE', '🇨🇿'),
('rsa', 'South Africa', 'RSA', '🇿🇦'),
('can', 'Canada', 'CAN', '🇨🇦'),
('bih', 'Bosnia-Herzegovina', 'BIH', '🇧🇦'),
('qat', 'Qatar', 'QAT', '🇶🇦'),
('sui', 'Switzerland', 'SUI', '🇨🇭'),
('bra', 'Brazil', 'BRA', '🇧🇷'),
('mar', 'Morocco', 'MAR', '🇲🇦'),
('hai', 'Haiti', 'HAI', '🇭🇹'),
('sco', 'Scotland', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
('usa', 'United States', 'USA', '🇺🇸'),
('par', 'Paraguay', 'PAR', '🇵🇾'),
('aus', 'Australia', 'AUS', '🇦🇺'),
('tur', 'Turkey', 'TUR', '🇹🇷'),
('ger', 'Germany', 'GER', '🇩🇪'),
('cuw', 'Curaçao', 'CUW', '🇨🇼'),
('civ', 'Ivory Coast', 'CIV', '🇨🇮'),
('ecu', 'Ecuador', 'ECU', '🇪🇨'),
('ned', 'Netherlands', 'NED', '🇳🇱'),
('jpn', 'Japan', 'JPN', '🇯🇵'),
('swe', 'Sweden', 'SWE', '🇸🇪'),
('tun', 'Tunisia', 'TUN', '🇹🇳'),
('bel', 'Belgium', 'BEL', '🇧🇪'),
('egy', 'Egypt', 'EGY', '🇪🇬'),
('irn', 'Iran', 'IRN', '🇮🇷'),
('nzl', 'New Zealand', 'NZL', '🇳🇿'),
('esp', 'Spain', 'ESP', '🇪🇸'),
('cpv', 'Cape Verde', 'CPV', '🇨🇻'),
('ksa', 'Saudi Arabia', 'KSA', '🇸🇦'),
('uru', 'Uruguay', 'URU', '🇺🇾'),
('fra', 'France', 'FRA', '🇫🇷'),
('sen', 'Senegal', 'SEN', '🇸🇳'),
('irq', 'Iraq', 'IRQ', '🇮🇶'),
('nor', 'Norway', 'NOR', '🇳🇴'),
('arg', 'Argentina', 'ARG', '🇦🇷'),
('alg', 'Algeria', 'ALG', '🇩🇿'),
('aut', 'Austria', 'AUT', '🇦🇹'),
('jor', 'Jordan', 'JOR', '🇯🇴'),
('por', 'Portugal', 'POR', '🇵🇹'),
('cod', 'Congo DR', 'COD', '🇨🇩'),
('uzb', 'Uzbekistan', 'UZB', '🇺🇿'),
('col', 'Colombia', 'COL', '🇨🇴'),
('eng', 'England', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
('cro', 'Croatia', 'CRO', '🇭🇷'),
('gha', 'Ghana', 'GHA', '🇬🇭'),
('pan', 'Panama', 'PAN', '🇵🇦')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  flag = EXCLUDED.flag;

-- Update all 12 groups with real team assignments
UPDATE groups_t SET team_ids = ARRAY['mex', 'kor', 'cze', 'rsa'] WHERE letter = 'A';
UPDATE groups_t SET team_ids = ARRAY['can', 'bih', 'qat', 'sui'] WHERE letter = 'B';
UPDATE groups_t SET team_ids = ARRAY['bra', 'mar', 'hai', 'sco'] WHERE letter = 'C';
UPDATE groups_t SET team_ids = ARRAY['usa', 'par', 'aus', 'tur'] WHERE letter = 'D';
UPDATE groups_t SET team_ids = ARRAY['ger', 'cuw', 'civ', 'ecu'] WHERE letter = 'E';
UPDATE groups_t SET team_ids = ARRAY['ned', 'jpn', 'swe', 'tun'] WHERE letter = 'F';
UPDATE groups_t SET team_ids = ARRAY['bel', 'egy', 'irn', 'nzl'] WHERE letter = 'G';
UPDATE groups_t SET team_ids = ARRAY['esp', 'cpv', 'ksa', 'uru'] WHERE letter = 'H';
UPDATE groups_t SET team_ids = ARRAY['fra', 'sen', 'irq', 'nor'] WHERE letter = 'I';
UPDATE groups_t SET team_ids = ARRAY['arg', 'alg', 'aut', 'jor'] WHERE letter = 'J';
UPDATE groups_t SET team_ids = ARRAY['por', 'cod', 'uzb', 'col'] WHERE letter = 'K';
UPDATE groups_t SET team_ids = ARRAY['eng', 'cro', 'gha', 'pan'] WHERE letter = 'L';

-- Update group stage matches with real teams and dates
-- Group A matches
UPDATE matches SET 
  home_team_id = 'mex', away_team_id = 'kor', 
  home_label = 'Mexico', away_label = 'South Korea',
  kickoff_at = '2026-06-11T19:00:00Z', match_number = 'M1'
WHERE id = 'M1';

UPDATE matches SET 
  home_team_id = 'cze', away_team_id = 'rsa', 
  home_label = 'Czech Republic', away_label = 'South Africa',
  kickoff_at = '2026-06-12T01:00:00Z', match_number = 'M2'
WHERE id = 'M2';

UPDATE matches SET 
  home_team_id = 'mex', away_team_id = 'cze', 
  home_label = 'Mexico', away_label = 'Czech Republic',
  kickoff_at = '2026-06-18T19:00:00Z', match_number = 'M3'
WHERE id = 'M3';

UPDATE matches SET 
  home_team_id = 'kor', away_team_id = 'rsa', 
  home_label = 'South Korea', away_label = 'South Africa',
  kickoff_at = '2026-06-18T19:00:00Z', match_number = 'M4'
WHERE id = 'M4';

UPDATE matches SET 
  home_team_id = 'mex', away_team_id = 'rsa', 
  home_label = 'Mexico', away_label = 'South Africa',
  kickoff_at = '2026-06-24T19:00:00Z', match_number = 'M5'
WHERE id = 'M5';

UPDATE matches SET 
  home_team_id = 'kor', away_team_id = 'cze', 
  home_label = 'South Korea', away_label = 'Czech Republic',
  kickoff_at = '2026-06-24T19:00:00Z', match_number = 'M6'
WHERE id = 'M6';

-- Group B matches
UPDATE matches SET 
  home_team_id = 'can', away_team_id = 'bih', 
  home_label = 'Canada', away_label = 'Bosnia-Herzegovina',
  kickoff_at = '2026-06-12T19:00:00Z', match_number = 'M7'
WHERE id = 'M7';

UPDATE matches SET 
  home_team_id = 'qat', away_team_id = 'sui', 
  home_label = 'Qatar', away_label = 'Switzerland',
  kickoff_at = '2026-06-13T19:00:00Z', match_number = 'M8'
WHERE id = 'M8';

UPDATE matches SET 
  home_team_id = 'sui', away_team_id = 'bih', 
  home_label = 'Switzerland', away_label = 'Bosnia-Herzegovina',
  kickoff_at = '2026-06-18T19:00:00Z', match_number = 'M9'
WHERE id = 'M9';

UPDATE matches SET 
  home_team_id = 'can', away_team_id = 'qat', 
  home_label = 'Canada', away_label = 'Qatar',
  kickoff_at = '2026-06-18T22:00:00Z', match_number = 'M10'
WHERE id = 'M10';

UPDATE matches SET 
  home_team_id = 'bih', away_team_id = 'qat', 
  home_label = 'Bosnia-Herzegovina', away_label = 'Qatar',
  kickoff_at = '2026-06-24T19:00:00Z', match_number = 'M11'
WHERE id = 'M11';

UPDATE matches SET 
  home_team_id = 'sui', away_team_id = 'can', 
  home_label = 'Switzerland', away_label = 'Canada',
  kickoff_at = '2026-06-24T19:00:00Z', match_number = 'M12'
WHERE id = 'M12';

-- Group C matches
UPDATE matches SET 
  home_team_id = 'bra', away_team_id = 'mar', 
  home_label = 'Brazil', away_label = 'Morocco',
  kickoff_at = '2026-06-13T22:00:00Z', match_number = 'M13'
WHERE id = 'M13';

UPDATE matches SET 
  home_team_id = 'hai', away_team_id = 'sco', 
  home_label = 'Haiti', away_label = 'Scotland',
  kickoff_at = '2026-06-14T01:00:00Z', match_number = 'M14'
WHERE id = 'M14';

UPDATE matches SET 
  home_team_id = 'sco', away_team_id = 'mar', 
  home_label = 'Scotland', away_label = 'Morocco',
  kickoff_at = '2026-06-19T22:00:00Z', match_number = 'M15'
WHERE id = 'M15';

UPDATE matches SET 
  home_team_id = 'bra', away_team_id = 'hai', 
  home_label = 'Brazil', away_label = 'Haiti',
  kickoff_at = '2026-06-20T00:30:00Z', match_number = 'M16'
WHERE id = 'M16';

UPDATE matches SET 
  home_team_id = 'mar', away_team_id = 'hai', 
  home_label = 'Morocco', away_label = 'Haiti',
  kickoff_at = '2026-06-24T22:00:00Z', match_number = 'M17'
WHERE id = 'M17';

UPDATE matches SET 
  home_team_id = 'sco', away_team_id = 'bra', 
  home_label = 'Scotland', away_label = 'Brazil',
  kickoff_at = '2026-06-24T22:00:00Z', match_number = 'M18'
WHERE id = 'M18';

-- Group D matches
UPDATE matches SET 
  home_team_id = 'usa', away_team_id = 'par', 
  home_label = 'United States', away_label = 'Paraguay',
  kickoff_at = '2026-06-13T01:00:00Z', match_number = 'M19'
WHERE id = 'M19';

UPDATE matches SET 
  home_team_id = 'aus', away_team_id = 'tur', 
  home_label = 'Australia', away_label = 'Turkey',
  kickoff_at = '2026-06-14T04:00:00Z', match_number = 'M20'
WHERE id = 'M20';

UPDATE matches SET 
  home_team_id = 'usa', away_team_id = 'aus', 
  home_label = 'United States', away_label = 'Australia',
  kickoff_at = '2026-06-19T19:00:00Z', match_number = 'M21'
WHERE id = 'M21';

UPDATE matches SET 
  home_team_id = 'tur', away_team_id = 'par', 
  home_label = 'Turkey', away_label = 'Paraguay',
  kickoff_at = '2026-06-20T04:00:00Z', match_number = 'M22'
WHERE id = 'M22';

UPDATE matches SET 
  home_team_id = 'par', away_team_id = 'aus', 
  home_label = 'Paraguay', away_label = 'Australia',
  kickoff_at = '2026-06-26T01:00:00Z', match_number = 'M23'
WHERE id = 'M23';

UPDATE matches SET 
  home_team_id = 'tur', away_team_id = 'usa', 
  home_label = 'Turkey', away_label = 'United States',
  kickoff_at = '2026-06-26T01:00:00Z', match_number = 'M24'
WHERE id = 'M24';

-- Group E matches
UPDATE matches SET 
  home_team_id = 'ger', away_team_id = 'cuw', 
  home_label = 'Germany', away_label = 'Curaçao',
  kickoff_at = '2026-06-14T17:00:00Z', match_number = 'M25'
WHERE id = 'M25';

UPDATE matches SET 
  home_team_id = 'civ', away_team_id = 'ecu', 
  home_label = 'Ivory Coast', away_label = 'Ecuador',
  kickoff_at = '2026-06-15T00:00:00Z', match_number = 'M26'
WHERE id = 'M26';

UPDATE matches SET 
  home_team_id = 'ger', away_team_id = 'civ', 
  home_label = 'Germany', away_label = 'Ivory Coast',
  kickoff_at = '2026-06-20T19:00:00Z', match_number = 'M27'
WHERE id = 'M27';

UPDATE matches SET 
  home_team_id = 'ecu', away_team_id = 'cuw', 
  home_label = 'Ecuador', away_label = 'Curaçao',
  kickoff_at = '2026-06-21T01:00:00Z', match_number = 'M28'
WHERE id = 'M28';

UPDATE matches SET 
  home_team_id = 'cuw', away_team_id = 'civ', 
  home_label = 'Curaçao', away_label = 'Ivory Coast',
  kickoff_at = '2026-06-25T19:00:00Z', match_number = 'M29'
WHERE id = 'M29';

UPDATE matches SET 
  home_team_id = 'ecu', away_team_id = 'ger', 
  home_label = 'Ecuador', away_label = 'Germany',
  kickoff_at = '2026-06-25T19:00:00Z', match_number = 'M30'
WHERE id = 'M30';

-- Group F matches
UPDATE matches SET 
  home_team_id = 'ned', away_team_id = 'jpn', 
  home_label = 'Netherlands', away_label = 'Japan',
  kickoff_at = '2026-06-14T19:00:00Z', match_number = 'M31'
WHERE id = 'M31';

UPDATE matches SET 
  home_team_id = 'swe', away_team_id = 'tun', 
  home_label = 'Sweden', away_label = 'Tunisia',
  kickoff_at = '2026-06-15T01:00:00Z', match_number = 'M32'
WHERE id = 'M32';

UPDATE matches SET 
  home_team_id = 'ned', away_team_id = 'swe', 
  home_label = 'Netherlands', away_label = 'Sweden',
  kickoff_at = '2026-06-20T17:00:00Z', match_number = 'M33'
WHERE id = 'M33';

UPDATE matches SET 
  home_team_id = 'tun', away_team_id = 'jpn', 
  home_label = 'Tunisia', away_label = 'Japan',
  kickoff_at = '2026-06-21T04:00:00Z', match_number = 'M34'
WHERE id = 'M34';

UPDATE matches SET 
  home_team_id = 'jpn', away_team_id = 'swe', 
  home_label = 'Japan', away_label = 'Sweden',
  kickoff_at = '2026-06-26T01:00:00Z', match_number = 'M35'
WHERE id = 'M35';

UPDATE matches SET 
  home_team_id = 'tun', away_team_id = 'ned', 
  home_label = 'Tunisia', away_label = 'Netherlands',
  kickoff_at = '2026-06-26T01:00:00Z', match_number = 'M36'
WHERE id = 'M36';

-- Group G matches
UPDATE matches SET 
  home_team_id = 'bel', away_team_id = 'egy', 
  home_label = 'Belgium', away_label = 'Egypt',
  kickoff_at = '2026-06-15T19:00:00Z', match_number = 'M37'
WHERE id = 'M37';

UPDATE matches SET 
  home_team_id = 'irn', away_team_id = 'nzl', 
  home_label = 'Iran', away_label = 'New Zealand',
  kickoff_at = '2026-06-16T01:00:00Z', match_number = 'M38'
WHERE id = 'M38';

UPDATE matches SET 
  home_team_id = 'bel', away_team_id = 'irn', 
  home_label = 'Belgium', away_label = 'Iran',
  kickoff_at = '2026-06-21T19:00:00Z', match_number = 'M39'
WHERE id = 'M39';

UPDATE matches SET 
  home_team_id = 'nzl', away_team_id = 'egy', 
  home_label = 'New Zealand', away_label = 'Egypt',
  kickoff_at = '2026-06-22T01:00:00Z', match_number = 'M40'
WHERE id = 'M40';

UPDATE matches SET 
  home_team_id = 'egy', away_team_id = 'irn', 
  home_label = 'Egypt', away_label = 'Iran',
  kickoff_at = '2026-06-27T01:00:00Z', match_number = 'M41'
WHERE id = 'M41';

UPDATE matches SET 
  home_team_id = 'nzl', away_team_id = 'bel', 
  home_label = 'New Zealand', away_label = 'Belgium',
  kickoff_at = '2026-06-27T01:00:00Z', match_number = 'M42'
WHERE id = 'M42';

-- Group H matches
UPDATE matches SET 
  home_team_id = 'esp', away_team_id = 'cpv', 
  home_label = 'Spain', away_label = 'Cape Verde',
  kickoff_at = '2026-06-15T16:00:00Z', match_number = 'M43'
WHERE id = 'M43';

UPDATE matches SET 
  home_team_id = 'ksa', away_team_id = 'uru', 
  home_label = 'Saudi Arabia', away_label = 'Uruguay',
  kickoff_at = '2026-06-15T22:00:00Z', match_number = 'M44'
WHERE id = 'M44';

UPDATE matches SET 
  home_team_id = 'esp', away_team_id = 'ksa', 
  home_label = 'Spain', away_label = 'Saudi Arabia',
  kickoff_at = '2026-06-21T16:00:00Z', match_number = 'M45'
WHERE id = 'M45';

UPDATE matches SET 
  home_team_id = 'uru', away_team_id = 'cpv', 
  home_label = 'Uruguay', away_label = 'Cape Verde',
  kickoff_at = '2026-06-21T22:00:00Z', match_number = 'M46'
WHERE id = 'M46';

UPDATE matches SET 
  home_team_id = 'cpv', away_team_id = 'ksa', 
  home_label = 'Cape Verde', away_label = 'Saudi Arabia',
  kickoff_at = '2026-06-27T01:00:00Z', match_number = 'M47'
WHERE id = 'M47';

UPDATE matches SET 
  home_team_id = 'uru', away_team_id = 'esp', 
  home_label = 'Uruguay', away_label = 'Spain',
  kickoff_at = '2026-06-27T01:00:00Z', match_number = 'M48'
WHERE id = 'M48';

-- Group I matches
UPDATE matches SET 
  home_team_id = 'fra', away_team_id = 'sen', 
  home_label = 'France', away_label = 'Senegal',
  kickoff_at = '2026-06-16T19:00:00Z', match_number = 'M49'
WHERE id = 'M49';

UPDATE matches SET 
  home_team_id = 'irq', away_team_id = 'nor', 
  home_label = 'Iraq', away_label = 'Norway',
  kickoff_at = '2026-06-16T22:00:00Z', match_number = 'M50'
WHERE id = 'M50';

UPDATE matches SET 
  home_team_id = 'fra', away_team_id = 'irq', 
  home_label = 'France', away_label = 'Iraq',
  kickoff_at = '2026-06-22T19:00:00Z', match_number = 'M51'
WHERE id = 'M51';

UPDATE matches SET 
  home_team_id = 'nor', away_team_id = 'sen', 
  home_label = 'Norway', away_label = 'Senegal',
  kickoff_at = '2026-06-23T01:00:00Z', match_number = 'M52'
WHERE id = 'M52';

UPDATE matches SET 
  home_team_id = 'nor', away_team_id = 'fra', 
  home_label = 'Norway', away_label = 'France',
  kickoff_at = '2026-06-26T19:00:00Z', match_number = 'M53'
WHERE id = 'M53';

UPDATE matches SET 
  home_team_id = 'sen', away_team_id = 'irq', 
  home_label = 'Senegal', away_label = 'Iraq',
  kickoff_at = '2026-06-26T19:00:00Z', match_number = 'M54'
WHERE id = 'M54';

-- Group J matches
UPDATE matches SET 
  home_team_id = 'arg', away_team_id = 'alg', 
  home_label = 'Argentina', away_label = 'Algeria',
  kickoff_at = '2026-06-17T01:00:00Z', match_number = 'M55'
WHERE id = 'M55';

UPDATE matches SET 
  home_team_id = 'aut', away_team_id = 'jor', 
  home_label = 'Austria', away_label = 'Jordan',
  kickoff_at = '2026-06-17T04:00:00Z', match_number = 'M56'
WHERE id = 'M56';

UPDATE matches SET 
  home_team_id = 'arg', away_team_id = 'aut', 
  home_label = 'Argentina', away_label = 'Austria',
  kickoff_at = '2026-06-22T17:00:00Z', match_number = 'M57'
WHERE id = 'M57';

UPDATE matches SET 
  home_team_id = 'jor', away_team_id = 'alg', 
  home_label = 'Jordan', away_label = 'Algeria',
  kickoff_at = '2026-06-23T01:00:00Z', match_number = 'M58'
WHERE id = 'M58';

UPDATE matches SET 
  home_team_id = 'alg', away_team_id = 'aut', 
  home_label = 'Algeria', away_label = 'Austria',
  kickoff_at = '2026-06-28T01:00:00Z', match_number = 'M59'
WHERE id = 'M59';

UPDATE matches SET 
  home_team_id = 'jor', away_team_id = 'arg', 
  home_label = 'Jordan', away_label = 'Argentina',
  kickoff_at = '2026-06-28T01:00:00Z', match_number = 'M60'
WHERE id = 'M60';

-- Group K matches
UPDATE matches SET 
  home_team_id = 'por', away_team_id = 'cod', 
  home_label = 'Portugal', away_label = 'Congo DR',
  kickoff_at = '2026-06-17T17:00:00Z', match_number = 'M61'
WHERE id = 'M61';

UPDATE matches SET 
  home_team_id = 'uzb', away_team_id = 'col', 
  home_label = 'Uzbekistan', away_label = 'Colombia',
  kickoff_at = '2026-06-18T01:00:00Z', match_number = 'M62'
WHERE id = 'M62';

UPDATE matches SET 
  home_team_id = 'por', away_team_id = 'uzb', 
  home_label = 'Portugal', away_label = 'Uzbekistan',
  kickoff_at = '2026-06-23T17:00:00Z', match_number = 'M63'
WHERE id = 'M63';

UPDATE matches SET 
  home_team_id = 'col', away_team_id = 'cod', 
  home_label = 'Colombia', away_label = 'Congo DR',
  kickoff_at = '2026-06-24T01:00:00Z', match_number = 'M64'
WHERE id = 'M64';

UPDATE matches SET 
  home_team_id = 'col', away_team_id = 'por', 
  home_label = 'Colombia', away_label = 'Portugal',
  kickoff_at = '2026-06-28T01:00:00Z', match_number = 'M65'
WHERE id = 'M65';

UPDATE matches SET 
  home_team_id = 'cod', away_team_id = 'uzb', 
  home_label = 'Congo DR', away_label = 'Uzbekistan',
  kickoff_at = '2026-06-28T01:00:00Z', match_number = 'M66'
WHERE id = 'M66';

-- Group L matches
UPDATE matches SET 
  home_team_id = 'eng', away_team_id = 'cro', 
  home_label = 'England', away_label = 'Croatia',
  kickoff_at = '2026-06-17T19:00:00Z', match_number = 'M67'
WHERE id = 'M67';

UPDATE matches SET 
  home_team_id = 'gha', away_team_id = 'pan', 
  home_label = 'Ghana', away_label = 'Panama',
  kickoff_at = '2026-06-18T01:00:00Z', match_number = 'M68'
WHERE id = 'M68';

UPDATE matches SET 
  home_team_id = 'eng', away_team_id = 'gha', 
  home_label = 'England', away_label = 'Ghana',
  kickoff_at = '2026-06-23T19:00:00Z', match_number = 'M69'
WHERE id = 'M69';

UPDATE matches SET 
  home_team_id = 'pan', away_team_id = 'cro', 
  home_label = 'Panama', away_label = 'Croatia',
  kickoff_at = '2026-06-24T01:00:00Z', match_number = 'M70'
WHERE id = 'M70';

UPDATE matches SET 
  home_team_id = 'cro', away_team_id = 'gha', 
  home_label = 'Croatia', away_label = 'Ghana',
  kickoff_at = '2026-06-27T01:00:00Z', match_number = 'M71'
WHERE id = 'M71';

UPDATE matches SET 
  home_team_id = 'pan', away_team_id = 'eng', 
  home_label = 'Panama', away_label = 'England',
  kickoff_at = '2026-06-27T01:00:00Z', match_number = 'M72'
WHERE id = 'M72';

-- Update settings to 2026 World Cup
-- IMPORTANT: Deadline must be in the future for the admin to be able to unlock
UPDATE settings SET 
  lock_deadline = '2026-06-14T20:00:00Z',
  locked = false,
  entry_fee_cents = 200
WHERE id = 1;

-- Update sync log
UPDATE sync_log SET 
  last_sync_at = NOW(),
  sync_status = 'manual_seed'
WHERE id = 1;

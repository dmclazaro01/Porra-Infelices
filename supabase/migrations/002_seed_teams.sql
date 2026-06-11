-- Seed teams for World Cup 2026
-- 48 teams in 12 groups (A-L)

INSERT INTO public.teams (id, name, code, flag) VALUES
  ('arg', 'Argentina', 'ARG', '🇦🇷'),
  ('aus', 'Australia', 'AUS', '🇦🇺'),
  ('aut', 'Austria', 'AUT', '🇦🇹'),
  ('bel', 'Belgium', 'BEL', '🇧🇪'),
  ('bih', 'Bosnia and Herzegovina', 'BIH', '🇧🇦'),
  ('bra', 'Brazil', 'BRA', '🇧🇷'),
  ('can', 'Canada', 'CAN', '🇨🇦'),
  ('cpv', 'Cape Verde', 'CPV', '🇨🇻'),
  ('chi', 'Chile', 'CHI', '🇨🇱'),
  ('col', 'Colombia', 'COL', '🇨🇴'),
  ('cro', 'Croatia', 'CRO', '🇭🇷'),
  ('cze', 'Czech Republic', 'CZE', '🇨🇿'),
  ('den', 'Denmark', 'DEN', '🇩🇰'),
  ('ecu', 'Ecuador', 'ECU', '🇪🇨'),
  ('egy', 'Egypt', 'EGY', '🇪🇬'),
  ('eng', 'England', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('fra', 'France', 'FRA', '🇫🇷'),
  ('ger', 'Germany', 'GER', '🇩🇪'),
  ('gha', 'Ghana', 'GHA', '🇬🇭'),
  ('irn', 'Iran', 'IRN', '🇮🇷'),
  ('irq', 'Iraq', 'IRQ', '🇮🇶'),
  ('ita', 'Italy', 'ITA', '🇮🇹'),
  ('jpn', 'Japan', 'JPN', '🇯🇵'),
  ('jor', 'Jordan', 'JOR', '🇯🇴'),
  ('kor', 'South Korea', 'KOR', '🇰🇷'),
  ('mar', 'Morocco', 'MAR', '🇲🇦'),
  ('mex', 'Mexico', 'MEX', '🇲🇽'),
  ('ned', 'Netherlands', 'NED', '🇳🇱'),
  ('nzl', 'New Zealand', 'NZL', '🇳🇿'),
  ('ngr', 'Nigeria', 'NGR', '🇳🇬'),
  ('nor', 'Norway', 'NOR', '🇳🇴'),
  ('pan', 'Panama', 'PAN', '🇵🇦'),
  ('par', 'Paraguay', 'PAR', '🇵🇾'),
  ('per', 'Peru', 'PER', '🇵🇪'),
  ('pol', 'Poland', 'POL', '🇵🇱'),
  ('por', 'Portugal', 'POR', '🇵🇹'),
  ('qat', 'Qatar', 'QAT', '🇶🇦'),
  ('rou', 'Romania', 'ROU', '🇷🇴'),
  ('rus', 'Russia', 'RUS', '🇷🇺'),
  ('ksa', 'Saudi Arabia', 'KSA', '🇸🇦'),
  ('sen', 'Senegal', 'SEN', '🇸🇳'),
  ('srb', 'Serbia', 'SRB', '🇷🇸'),
  ('esp', 'Spain', 'ESP', '🇪🇸'),
  ('swe', 'Sweden', 'SWE', '🇸🇪'),
  ('sui', 'Switzerland', 'SUI', '🇨🇭'),
  ('tun', 'Tunisia', 'TUN', '🇹🇳'),
  ('tur', 'Turkey', 'TUR', '🇹🇷'),
  ('ukr', 'Ukraine', 'UKR', '🇺🇦'),
  ('uru', 'Uruguay', 'URU', '🇺🇾'),
  ('usa', 'United States', 'USA', '🇺🇸'),
  ('wal', 'Wales', 'WAL', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'),
  ('zam', 'Zambia', 'ZAM', '🇿🇲')
ON CONFLICT (id) DO NOTHING;

-- Update groups with team assignments
UPDATE public.groups_t SET team_ids = ARRAY['arg', 'aus', 'aut', 'bel'] WHERE letter = 'A';
UPDATE public.groups_t SET team_ids = ARRAY['bih', 'bra', 'can', 'cpv'] WHERE letter = 'B';
UPDATE public.groups_t SET team_ids = ARRAY['chi', 'col', 'cro', 'cze'] WHERE letter = 'C';
UPDATE public.groups_t SET team_ids = ARRAY['den', 'ecu', 'egy', 'eng'] WHERE letter = 'D';
UPDATE public.groups_t SET team_ids = ARRAY['fra', 'ger', 'gha', 'irn'] WHERE letter = 'E';
UPDATE public.groups_t SET team_ids = ARRAY['irq', 'ita', 'jpn', 'jor'] WHERE letter = 'F';
UPDATE public.groups_t SET team_ids = ARRAY['kor', 'mar', 'mex', 'ned'] WHERE letter = 'G';
UPDATE public.groups_t SET team_ids = ARRAY['nzl', 'ngr', 'nor', 'pan'] WHERE letter = 'H';
UPDATE public.groups_t SET team_ids = ARRAY['par', 'per', 'pol', 'por'] WHERE letter = 'I';
UPDATE public.groups_t SET team_ids = ARRAY['qat', 'rou', 'rus', 'ksa'] WHERE letter = 'J';
UPDATE public.groups_t SET team_ids = ARRAY['sen', 'srb', 'esp', 'swe'] WHERE letter = 'K';
UPDATE public.groups_t SET team_ids = ARRAY['sui', 'tun', 'tur', 'ukr'] WHERE letter = 'L';

-- Update matches with team IDs for group stage
-- Group A matches
UPDATE public.matches SET home_team_id = 'arg', away_team_id = 'aus' WHERE id = 'M1';
UPDATE public.matches SET home_team_id = 'aut', away_team_id = 'bel' WHERE id = 'M2';
UPDATE public.matches SET home_team_id = 'arg', away_team_id = 'aut' WHERE id = 'M3';
UPDATE public.matches SET home_team_id = 'aus', away_team_id = 'bel' WHERE id = 'M4';
UPDATE public.matches SET home_team_id = 'arg', away_team_id = 'bel' WHERE id = 'M5';
UPDATE public.matches SET home_team_id = 'aus', away_team_id = 'aut' WHERE id = 'M6';

-- Group B matches
UPDATE public.matches SET home_team_id = 'bih', away_team_id = 'bra' WHERE id = 'M7';
UPDATE public.matches SET home_team_id = 'can', away_team_id = 'cpv' WHERE id = 'M8';
UPDATE public.matches SET home_team_id = 'bih', away_team_id = 'can' WHERE id = 'M9';
UPDATE public.matches SET home_team_id = 'bra', away_team_id = 'cpv' WHERE id = 'M10';
UPDATE public.matches SET home_team_id = 'bih', away_team_id = 'cpv' WHERE id = 'M11';
UPDATE public.matches SET home_team_id = 'bra', away_team_id = 'can' WHERE id = 'M12';

-- Group C matches
UPDATE public.matches SET home_team_id = 'chi', away_team_id = 'col' WHERE id = 'M13';
UPDATE public.matches SET home_team_id = 'cro', away_team_id = 'cze' WHERE id = 'M14';
UPDATE public.matches SET home_team_id = 'chi', away_team_id = 'cro' WHERE id = 'M15';
UPDATE public.matches SET home_team_id = 'col', away_team_id = 'cze' WHERE id = 'M16';
UPDATE public.matches SET home_team_id = 'chi', away_team_id = 'cze' WHERE id = 'M17';
UPDATE public.matches SET home_team_id = 'col', away_team_id = 'cro' WHERE id = 'M18';

-- Group D matches
UPDATE public.matches SET home_team_id = 'den', away_team_id = 'ecu' WHERE id = 'M19';
UPDATE public.matches SET home_team_id = 'egy', away_team_id = 'eng' WHERE id = 'M20';
UPDATE public.matches SET home_team_id = 'den', away_team_id = 'egy' WHERE id = 'M21';
UPDATE public.matches SET home_team_id = 'ecu', away_team_id = 'eng' WHERE id = 'M22';
UPDATE public.matches SET home_team_id = 'den', away_team_id = 'eng' WHERE id = 'M23';
UPDATE public.matches SET home_team_id = 'ecu', away_team_id = 'egy' WHERE id = 'M24';

-- Group E matches
UPDATE public.matches SET home_team_id = 'fra', away_team_id = 'ger' WHERE id = 'M25';
UPDATE public.matches SET home_team_id = 'gha', away_team_id = 'irn' WHERE id = 'M26';
UPDATE public.matches SET home_team_id = 'fra', away_team_id = 'gha' WHERE id = 'M27';
UPDATE public.matches SET home_team_id = 'ger', away_team_id = 'irn' WHERE id = 'M28';
UPDATE public.matches SET home_team_id = 'fra', away_team_id = 'irn' WHERE id = 'M29';
UPDATE public.matches SET home_team_id = 'ger', away_team_id = 'gha' WHERE id = 'M30';

-- Group F matches
UPDATE public.matches SET home_team_id = 'irq', away_team_id = 'ita' WHERE id = 'M31';
UPDATE public.matches SET home_team_id = 'jpn', away_team_id = 'jor' WHERE id = 'M32';
UPDATE public.matches SET home_team_id = 'irq', away_team_id = 'jpn' WHERE id = 'M33';
UPDATE public.matches SET home_team_id = 'ita', away_team_id = 'jor' WHERE id = 'M34';
UPDATE public.matches SET home_team_id = 'irq', away_team_id = 'jor' WHERE id = 'M35';
UPDATE public.matches SET home_team_id = 'ita', away_team_id = 'jpn' WHERE id = 'M36';

-- Group G matches
UPDATE public.matches SET home_team_id = 'kor', away_team_id = 'mar' WHERE id = 'M37';
UPDATE public.matches SET home_team_id = 'mex', away_team_id = 'ned' WHERE id = 'M38';
UPDATE public.matches SET home_team_id = 'kor', away_team_id = 'mex' WHERE id = 'M39';
UPDATE public.matches SET home_team_id = 'mar', away_team_id = 'ned' WHERE id = 'M40';
UPDATE public.matches SET home_team_id = 'kor', away_team_id = 'ned' WHERE id = 'M41';
UPDATE public.matches SET home_team_id = 'mar', away_team_id = 'mex' WHERE id = 'M42';

-- Group H matches
UPDATE public.matches SET home_team_id = 'nzl', away_team_id = 'ngr' WHERE id = 'M43';
UPDATE public.matches SET home_team_id = 'nor', away_team_id = 'pan' WHERE id = 'M44';
UPDATE public.matches SET home_team_id = 'nzl', away_team_id = 'nor' WHERE id = 'M45';
UPDATE public.matches SET home_team_id = 'ngr', away_team_id = 'pan' WHERE id = 'M46';
UPDATE public.matches SET home_team_id = 'nzl', away_team_id = 'pan' WHERE id = 'M47';
UPDATE public.matches SET home_team_id = 'ngr', away_team_id = 'nor' WHERE id = 'M48';

-- Group I matches
UPDATE public.matches SET home_team_id = 'par', away_team_id = 'per' WHERE id = 'M49';
UPDATE public.matches SET home_team_id = 'pol', away_team_id = 'por' WHERE id = 'M50';
UPDATE public.matches SET home_team_id = 'par', away_team_id = 'pol' WHERE id = 'M51';
UPDATE public.matches SET home_team_id = 'per', away_team_id = 'por' WHERE id = 'M52';
UPDATE public.matches SET home_team_id = 'par', away_team_id = 'por' WHERE id = 'M53';
UPDATE public.matches SET home_team_id = 'per', away_team_id = 'pol' WHERE id = 'M54';

-- Group J matches
UPDATE public.matches SET home_team_id = 'qat', away_team_id = 'rou' WHERE id = 'M55';
UPDATE public.matches SET home_team_id = 'rus', away_team_id = 'ksa' WHERE id = 'M56';
UPDATE public.matches SET home_team_id = 'qat', away_team_id = 'rus' WHERE id = 'M57';
UPDATE public.matches SET home_team_id = 'rou', away_team_id = 'ksa' WHERE id = 'M58';
UPDATE public.matches SET home_team_id = 'qat', away_team_id = 'ksa' WHERE id = 'M59';
UPDATE public.matches SET home_team_id = 'rou', away_team_id = 'rus' WHERE id = 'M60';

-- Group K matches
UPDATE public.matches SET home_team_id = 'sen', away_team_id = 'srb' WHERE id = 'M61';
UPDATE public.matches SET home_team_id = 'esp', away_team_id = 'swe' WHERE id = 'M62';
UPDATE public.matches SET home_team_id = 'sen', away_team_id = 'esp' WHERE id = 'M63';
UPDATE public.matches SET home_team_id = 'srb', away_team_id = 'swe' WHERE id = 'M64';
UPDATE public.matches SET home_team_id = 'sen', away_team_id = 'swe' WHERE id = 'M65';
UPDATE public.matches SET home_team_id = 'srb', away_team_id = 'esp' WHERE id = 'M66';

-- Group L matches
UPDATE public.matches SET home_team_id = 'sui', away_team_id = 'tun' WHERE id = 'M67';
UPDATE public.matches SET home_team_id = 'tur', away_team_id = 'ukr' WHERE id = 'M68';
UPDATE public.matches SET home_team_id = 'sui', away_team_id = 'tur' WHERE id = 'M69';
UPDATE public.matches SET home_team_id = 'tun', away_team_id = 'ukr' WHERE id = 'M70';
UPDATE public.matches SET home_team_id = 'sui', away_team_id = 'ukr' WHERE id = 'M71';
UPDATE public.matches SET home_team_id = 'tun', away_team_id = 'tur' WHERE id = 'M72';

-- Verify and update all team flags for 2026 World Cup
-- This script ensures all flags are correctly set even if previous insert failed

UPDATE teams SET flag = '🇲🇽' WHERE id = 'mex';
UPDATE teams SET flag = '🇰🇷' WHERE id = 'kor';
UPDATE teams SET flag = '🇨🇿' WHERE id = 'cze';
UPDATE teams SET flag = '🇿🇦' WHERE id = 'rsa';
UPDATE teams SET flag = '🇨🇦' WHERE id = 'can';
UPDATE teams SET flag = '🇧🇦' WHERE id = 'bih';
UPDATE teams SET flag = '🇶🇦' WHERE id = 'qat';
UPDATE teams SET flag = '🇨🇭' WHERE id = 'sui';
UPDATE teams SET flag = '🇧🇷' WHERE id = 'bra';
UPDATE teams SET flag = '🇲🇦' WHERE id = 'mar';
UPDATE teams SET flag = '🇭🇹' WHERE id = 'hai';
UPDATE teams SET flag = '🏴󠁧󠁢󠁳󠁣󠁴󠁿' WHERE id = 'sco';
UPDATE teams SET flag = '🇺🇸' WHERE id = 'usa';
UPDATE teams SET flag = '🇵🇾' WHERE id = 'par';
UPDATE teams SET flag = '🇦🇺' WHERE id = 'aus';
UPDATE teams SET flag = '🇹🇷' WHERE id = 'tur';
UPDATE teams SET flag = '🇩🇪' WHERE id = 'ger';
UPDATE teams SET flag = '🇨🇼' WHERE id = 'cuw';
UPDATE teams SET flag = '🇨🇮' WHERE id = 'civ';
UPDATE teams SET flag = '🇪🇨' WHERE id = 'ecu';
UPDATE teams SET flag = '🇳🇱' WHERE id = 'ned';
UPDATE teams SET flag = '🇯🇵' WHERE id = 'jpn';
UPDATE teams SET flag = '🇸🇪' WHERE id = 'swe';
UPDATE teams SET flag = '🇹🇳' WHERE id = 'tun';
UPDATE teams SET flag = '🇧🇪' WHERE id = 'bel';
UPDATE teams SET flag = '🇪🇬' WHERE id = 'egy';
UPDATE teams SET flag = '🇮🇷' WHERE id = 'irn';
UPDATE teams SET flag = '🇳🇿' WHERE id = 'nzl';
UPDATE teams SET flag = '🇪🇸' WHERE id = 'esp';
UPDATE teams SET flag = '🇨🇻' WHERE id = 'cpv';
UPDATE teams SET flag = '🇸🇦' WHERE id = 'ksa';
UPDATE teams SET flag = '🇺🇾' WHERE id = 'uru';
UPDATE teams SET flag = '🇫🇷' WHERE id = 'fra';
UPDATE teams SET flag = '🇸🇳' WHERE id = 'sen';
UPDATE teams SET flag = '🇮🇶' WHERE id = 'irq';
UPDATE teams SET flag = '🇳🇴' WHERE id = 'nor';
UPDATE teams SET flag = '🇦🇷' WHERE id = 'arg';
UPDATE teams SET flag = '🇩🇿' WHERE id = 'alg';
UPDATE teams SET flag = '🇦🇹' WHERE id = 'aut';
UPDATE teams SET flag = '🇯🇴' WHERE id = 'jor';
UPDATE teams SET flag = '🇵🇹' WHERE id = 'por';
UPDATE teams SET flag = '🇨🇩' WHERE id = 'cod';
UPDATE teams SET flag = '🇺🇿' WHERE id = 'uzb';
UPDATE teams SET flag = '🇨🇴' WHERE id = 'col';
UPDATE teams SET flag = '🏴󠁧󠁢󠁥󠁮󠁧󠁿' WHERE id = 'eng';
UPDATE teams SET flag = '🇭🇷' WHERE id = 'cro';
UPDATE teams SET flag = '🇬🇭' WHERE id = 'gha';
UPDATE teams SET flag = '🇵🇦' WHERE id = 'pan';

-- Verify count
SELECT id, name, code, flag FROM teams ORDER BY name;

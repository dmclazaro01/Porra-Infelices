-- One-time migration to align the knockout bracket with the official FIFA 2026 layout.
-- Run this in the Supabase SQL Editor before redeploying sync-results and the frontend.

-- 1. Reset existing knockout predictions (only Dani had any at the time of this change).
DELETE FROM public.knockout_predictions;

-- 2. Update Round of 16 labels to the official consecutive bracket.
UPDATE matches SET home_label = 'WM73', away_label = 'WM74' WHERE id = 'M89';
UPDATE matches SET home_label = 'WM75', away_label = 'WM76' WHERE id = 'M90';
UPDATE matches SET home_label = 'WM77', away_label = 'WM78' WHERE id = 'M91';
UPDATE matches SET home_label = 'WM79', away_label = 'WM80' WHERE id = 'M92';
UPDATE matches SET home_label = 'WM81', away_label = 'WM82' WHERE id = 'M93';
UPDATE matches SET home_label = 'WM83', away_label = 'WM84' WHERE id = 'M94';
UPDATE matches SET home_label = 'WM85', away_label = 'WM86' WHERE id = 'M95';
UPDATE matches SET home_label = 'WM87', away_label = 'WM88' WHERE id = 'M96';

-- 3. Fix QF pairings order to match the simple bracket flow.
UPDATE matches SET home_label = 'WM89', away_label = 'WM90' WHERE id = 'M97';
UPDATE matches SET home_label = 'WM91', away_label = 'WM92' WHERE id = 'M98';
UPDATE matches SET home_label = 'WM93', away_label = 'WM94' WHERE id = 'M99';
UPDATE matches SET home_label = 'WM95', away_label = 'WM96' WHERE id = 'M100';

-- 4. SF / 3rd / Final already follow WM97 vs WM98 etc. but ensure they are correct.
UPDATE matches SET home_label = 'WM97', away_label = 'WM98' WHERE id = 'M101';
UPDATE matches SET home_label = 'WM99', away_label = 'WM100' WHERE id = 'M102';
UPDATE matches SET home_label = 'LM101', away_label = 'LM102' WHERE id = 'M103';
UPDATE matches SET home_label = 'WM101', away_label = 'WM102' WHERE id = 'M104';

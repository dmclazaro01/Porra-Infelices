-- Reafirma los labels correctos del bracket de eliminatorias y añade soporte
-- para editar predicciones puntuales aunque las eliminatorias estén cerradas.
--
-- Contexto: los labels correctos ya viven en KNOCKOUT_SLOTS de la edge
-- function sync-results, pero deploys anteriores dejaron un estado donde el
-- ganador de M79/M80 saltaba a M98 sin pasar por M92, y el perdedor de M83
-- aparecía en M92. Este UPDATE fuerza el flujo estándar:
--   R32 (M73–M88) → R16 (M89–M96) → QF (M97–M100) → SF (M101–M102) → Final.

UPDATE public.matches SET home_label = 'WM73',  away_label = 'WM74'  WHERE id = 'M89';
UPDATE public.matches SET home_label = 'WM75',  away_label = 'WM76'  WHERE id = 'M90';
UPDATE public.matches SET home_label = 'WM77',  away_label = 'WM78'  WHERE id = 'M91';
UPDATE public.matches SET home_label = 'WM79',  away_label = 'WM80'  WHERE id = 'M92';
UPDATE public.matches SET home_label = 'WM81',  away_label = 'WM82'  WHERE id = 'M93';
UPDATE public.matches SET home_label = 'WM83',  away_label = 'WM84'  WHERE id = 'M94';
UPDATE public.matches SET home_label = 'WM85',  away_label = 'WM86'  WHERE id = 'M95';
UPDATE public.matches SET home_label = 'WM87',  away_label = 'WM88'  WHERE id = 'M96';

UPDATE public.matches SET home_label = 'WM89',  away_label = 'WM90'  WHERE id = 'M97';
UPDATE public.matches SET home_label = 'WM91',  away_label = 'WM92'  WHERE id = 'M98';
UPDATE public.matches SET home_label = 'WM93',  away_label = 'WM94'  WHERE id = 'M99';
UPDATE public.matches SET home_label = 'WM95',  away_label = 'WM96'  WHERE id = 'M100';

UPDATE public.matches SET home_label = 'WM97',  away_label = 'WM98'  WHERE id = 'M101';
UPDATE public.matches SET home_label = 'WM99',  away_label = 'WM100' WHERE id = 'M102';
UPDATE public.matches SET home_label = 'LM101', away_label = 'LM102' WHERE id = 'M103';
UPDATE public.matches SET home_label = 'WM101', away_label = 'WM102' WHERE id = 'M104';

-- Purga referencias huérfanas: si alguna predicción se guardó apuntando a un
-- equipo que ya no juega su M** correspondiente, el UI no puede remaparearla y
-- solo trae confusión. Este DELETE se limita a los M** afectados por el bug.
DELETE FROM public.knockout_predictions
WHERE match_number IN ('M89', 'M90', 'M91', 'M92', 'M97', 'M98', 'M103');

-- Lista opcional de match_numbers editables aunque las eliminatorias globales
-- estén cerradas. Uso: admin la rellena con ['M92', 'M98'] o similar y los
-- jugadores pueden volver a tocar solo esos cruces desde el UI.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS editable_ko_matches TEXT[] NOT NULL DEFAULT '{}';

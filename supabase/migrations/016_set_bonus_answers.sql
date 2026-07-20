-- Fija las respuestas oficiales del bonus del torneo:
--   · Máximo goleador (pichichi): Mbappé
--   · Mejor jugador (MVP):        Rodri
-- El scoring compara estos valores con lo que cada jugador escribió, ignorando
-- mayúsculas, acentos y espacios (ver normalizeBonusName en src/scoring.js), de
-- modo que cualquiera que acertara el nombre suma +5 por cada uno.
INSERT INTO public.bonus_answers (id, top_scorer, best_player)
VALUES (1, 'Mbappé', 'Rodri')
ON CONFLICT (id) DO UPDATE
  SET top_scorer  = EXCLUDED.top_scorer,
      best_player = EXCLUDED.best_player;

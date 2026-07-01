-- Limpia los team_id "quemados" en los slots de R16+ que fueron rellenados por
-- un sync-results anterior contra el bracket incorrecto. Sin este DELETE, el
-- frontend usa match.home_team_id || resolveLabel(...), por lo que un id viejo
-- (p.ej. MEX en M92) cortocircuita la resolución vía WM79/WM80 aunque el
-- label ya sea el correcto.
--
-- Solo tocamos partidos:
--   - de round R16, QF, SF, THIRD o FINAL (M89-M104)
--   - que aún NO se hayan jugado (actual_home_score / actual_away_score NULL)
--     así los que estén finished/live no se corrompen bajo ninguna condición.
UPDATE public.matches
SET home_team_id = NULL,
    away_team_id = NULL,
    actual_winner_team_id = NULL,
    status = 'scheduled'
WHERE stage = 'KNOCKOUT'
  AND round IN ('R16', 'QF', 'SF', 'THIRD', 'FINAL')
  AND (actual_home_score IS NULL OR actual_away_score IS NULL);

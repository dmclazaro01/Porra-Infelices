-- Interruptor manual para ocultar la sección Eliminatorias de la pestaña
-- Quinielas independientemente del estado de knockout_editable. Útil cuando
-- el admin habilita edición parcial temporal (settings.editable_ko_matches)
-- para arreglar cruces y no quiere que los picks de KO de otros jugadores
-- queden visibles mientras dura.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS hide_knockout_from_picks BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- World Cup 2026 Prediction Pool – Initial Schema
-- ============================================================

-- -----------------------------------------------------------
-- ENUMS / CUSTOM TYPES
-- -----------------------------------------------------------
-- (Using TEXT + CHECK constraints instead of custom ENUMs for flexibility.)

-- -----------------------------------------------------------
-- TABLES
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_groups (
  name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  group_name  TEXT REFERENCES public.player_groups(name) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'player',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  has_paid    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role IN ('player', 'admin'))
);

CREATE TABLE IF NOT EXISTS public.teams (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  code  TEXT NOT NULL,
  flag  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.groups_t (
  letter   CHAR(1) PRIMARY KEY,
  team_ids TEXT[] NOT NULL DEFAULT '{}',
  CHECK (letter ~ '^[A-L]$')
);

CREATE TABLE IF NOT EXISTS public.matches (
  id                   TEXT PRIMARY KEY,
  group_letter         CHAR(1),
  round                TEXT,
  stage                TEXT NOT NULL DEFAULT 'GROUP',
  match_number         TEXT NOT NULL,
  home_team_id         TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id         TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  home_label           TEXT,
  away_label           TEXT,
  kickoff_at           TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'scheduled',
  actual_home_score    INTEGER,
  actual_away_score    INTEGER,
  actual_winner_team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  odds_home_decimal    NUMERIC,
  odds_draw_decimal    NUMERIC,
  odds_away_decimal    NUMERIC,
  CHECK (stage IN ('GROUP', 'KNOCKOUT')),
  CHECK (status IN ('scheduled', 'live', 'finished')),
  CHECK (round IN ('GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL') OR round IS NULL)
);

CREATE TABLE IF NOT EXISTS public.group_predictions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id   TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL,
  CHECK (prediction IN ('1', 'X', '2')),
  UNIQUE (user_id, match_id)
);

CREATE TABLE IF NOT EXISTS public.tiebreak_predictions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_letter CHAR(1) NOT NULL,
  team_order   TEXT[] NOT NULL,
  UNIQUE (user_id, group_letter)
);

CREATE TABLE IF NOT EXISTS public.knockout_predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_number     TEXT NOT NULL,
  winner_team_id   TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  UNIQUE (user_id, match_number)
);

CREATE TABLE IF NOT EXISTS public.bonus_predictions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  top_scorer TEXT,
  best_player TEXT,
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lock_deadline    TIMESTAMPTZ,
  locked           BOOLEAN NOT NULL DEFAULT false,
  entry_fee_cents  INTEGER NOT NULL DEFAULT 200
);

CREATE TABLE IF NOT EXISTS public.sync_log (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sync_at    TIMESTAMPTZ,
  sync_status     TEXT NOT NULL DEFAULT 'never'
);

CREATE TABLE IF NOT EXISTS public.bonus_answers (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  top_scorer   TEXT,
  best_player  TEXT
);

-- -----------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------
CREATE INDEX idx_profiles_group ON public.profiles(group_name);
CREATE INDEX idx_matches_group_letter ON public.matches(group_letter);
CREATE INDEX idx_matches_round ON public.matches(round);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_kickoff ON public.matches(kickoff_at);
CREATE INDEX idx_group_predictions_user ON public.group_predictions(user_id);
CREATE INDEX idx_knockout_predictions_user ON public.knockout_predictions(user_id);
CREATE INDEX idx_tiebreak_predictions_user ON public.tiebreak_predictions(user_id);
CREATE INDEX idx_bonus_predictions_user ON public.bonus_predictions(user_id);

-- -----------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------
ALTER TABLE public.player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups_t ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiebreak_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_answers ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- --- player_groups ---
CREATE POLICY "player_groups_select_authenticated"
  ON public.player_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "player_groups_insert_admin"
  ON public.player_groups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- --- profiles ---
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_authenticated"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- --- teams ---
CREATE POLICY "teams_select_authenticated"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teams_update_admin"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "teams_insert_admin"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- --- groups_t ---
CREATE POLICY "groups_t_select_authenticated"
  ON public.groups_t FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "groups_t_update_admin"
  ON public.groups_t FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "groups_t_insert_admin"
  ON public.groups_t FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- --- matches ---
CREATE POLICY "matches_select_authenticated"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_update_admin"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "matches_insert_admin"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- --- group_predictions ---
CREATE POLICY "group_predictions_select_authenticated"
  ON public.group_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "group_predictions_insert_self"
  ON public.group_predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "group_predictions_update_self"
  ON public.group_predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "group_predictions_delete_self"
  ON public.group_predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- --- tiebreak_predictions ---
CREATE POLICY "tiebreak_predictions_select_authenticated"
  ON public.tiebreak_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tiebreak_predictions_insert_self"
  ON public.tiebreak_predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tiebreak_predictions_update_self"
  ON public.tiebreak_predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tiebreak_predictions_delete_self"
  ON public.tiebreak_predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- --- knockout_predictions ---
CREATE POLICY "knockout_predictions_select_authenticated"
  ON public.knockout_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "knockout_predictions_insert_self"
  ON public.knockout_predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "knockout_predictions_update_self"
  ON public.knockout_predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "knockout_predictions_delete_self"
  ON public.knockout_predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- --- bonus_predictions ---
CREATE POLICY "bonus_predictions_select_authenticated"
  ON public.bonus_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bonus_predictions_insert_self"
  ON public.bonus_predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bonus_predictions_update_self"
  ON public.bonus_predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bonus_predictions_delete_self"
  ON public.bonus_predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- --- settings ---
CREATE POLICY "settings_select_authenticated"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "settings_update_admin"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --- sync_log ---
CREATE POLICY "sync_log_select_authenticated"
  ON public.sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sync_log_update_admin"
  ON public.sync_log FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --- bonus_answers ---
CREATE POLICY "bonus_answers_select_authenticated"
  ON public.bonus_answers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bonus_answers_update_admin"
  ON public.bonus_answers FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------
-- SEED DATA
-- -----------------------------------------------------------

-- Player groups
INSERT INTO public.player_groups (name) VALUES
  ('Amigos'),
  ('Familia'),
  ('Trabajo')
ON CONFLICT DO NOTHING;

-- Groups (A through L)
INSERT INTO public.groups_t (letter, team_ids) VALUES
  ('A', '{}'),
  ('B', '{}'),
  ('C', '{}'),
  ('D', '{}'),
  ('E', '{}'),
  ('F', '{}'),
  ('G', '{}'),
  ('H', '{}'),
  ('I', '{}'),
  ('J', '{}'),
  ('K', '{}'),
  ('L', '{}')
ON CONFLICT DO NOTHING;

-- Group stage match slots (M1–M72)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status)
SELECT
  'M' || gs.n::text,
  chr(65 + ((gs.n - 1) / 6)::int),  -- A-L, 6 matches per group
  'GROUP',
  'GROUP',
  'M' || gs.n::text,
  'TBD',
  'TBD',
  'scheduled'
FROM generate_series(1, 72) AS gs(n)
ON CONFLICT (id) DO NOTHING;

-- Knockout stage match slots (M73–M104)
-- Round of 32 (M73–M88, 16 matches)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status) VALUES
  ('M73',  NULL, 'R32', 'KNOCKOUT', 'M73',  '1A', '2D', 'scheduled'),
  ('M74',  NULL, 'R32', 'KNOCKOUT', 'M74',  '1B', '2C', 'scheduled'),
  ('M75',  NULL, 'R32', 'KNOCKOUT', 'M75',  '1C', '2B', 'scheduled'),
  ('M76',  NULL, 'R32', 'KNOCKOUT', 'M76',  '1D', '2A', 'scheduled'),
  ('M77',  NULL, 'R32', 'KNOCKOUT', 'M77',  '1E', '2H', 'scheduled'),
  ('M78',  NULL, 'R32', 'KNOCKOUT', 'M78',  '1F', '2E', 'scheduled'),
  ('M79',  NULL, 'R32', 'KNOCKOUT', 'M79',  '1G', '2F', 'scheduled'),
  ('M80',  NULL, 'R32', 'KNOCKOUT', 'M80',  '1H', '2G', 'scheduled'),
  ('M81',  NULL, 'R32', 'KNOCKOUT', 'M81',  '1I', '2L', 'scheduled'),
  ('M82',  NULL, 'R32', 'KNOCKOUT', 'M82',  '1J', '2I', 'scheduled'),
  ('M83',  NULL, 'R32', 'KNOCKOUT', 'M83',  '1K', '2J', 'scheduled'),
  ('M84',  NULL, 'R32', 'KNOCKOUT', 'M84',  '1L', '2K', 'scheduled'),
  ('M85',  NULL, 'R32', 'KNOCKOUT', 'M85',  '3ABC', '3DEF', 'scheduled'),
  ('M86',  NULL, 'R32', 'KNOCKOUT', 'M86',  '3GHI', '3JKL', 'scheduled'),
  ('M87',  NULL, 'R32', 'KNOCKOUT', 'M87',  '3ABCD', '3EFGH', 'scheduled'),
  ('M88',  NULL, 'R32', 'KNOCKOUT', 'M88',  '3IJKL', '3EFGH2', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Round of 16 (M89–M96, 8 matches)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status) VALUES
  ('M89',  NULL, 'R16', 'KNOCKOUT', 'M89',  'WM73', 'WM74', 'scheduled'),
  ('M90',  NULL, 'R16', 'KNOCKOUT', 'M90',  'WM75', 'WM76', 'scheduled'),
  ('M91',  NULL, 'R16', 'KNOCKOUT', 'M91',  'WM77', 'WM78', 'scheduled'),
  ('M92',  NULL, 'R16', 'KNOCKOUT', 'M92',  'WM79', 'WM80', 'scheduled'),
  ('M93',  NULL, 'R16', 'KNOCKOUT', 'M93',  'WM81', 'WM82', 'scheduled'),
  ('M94',  NULL, 'R16', 'KNOCKOUT', 'M94',  'WM83', 'WM84', 'scheduled'),
  ('M95',  NULL, 'R16', 'KNOCKOUT', 'M95',  'WM85', 'WM86', 'scheduled'),
  ('M96',  NULL, 'R16', 'KNOCKOUT', 'M96',  'WM87', 'WM88', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Quarter-finals (M97–M100, 4 matches)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status) VALUES
  ('M97',  NULL, 'QF', 'KNOCKOUT', 'M97',  'WM89', 'WM90', 'scheduled'),
  ('M98',  NULL, 'QF', 'KNOCKOUT', 'M98',  'WM91', 'WM92', 'scheduled'),
  ('M99',  NULL, 'QF', 'KNOCKOUT', 'M99',  'WM93', 'WM94', 'scheduled'),
  ('M100', NULL, 'QF', 'KNOCKOUT', 'M100', 'WM95', 'WM96', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Semi-finals (M101–M102, 2 matches)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status) VALUES
  ('M101', NULL, 'SF', 'KNOCKOUT', 'M101', 'WM97', 'WM98', 'scheduled'),
  ('M102', NULL, 'SF', 'KNOCKOUT', 'M102', 'WM99', 'WM100', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Third place (M103, 1 match)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status) VALUES
  ('M103', NULL, 'THIRD', 'KNOCKOUT', 'M103', 'LM101', 'LM102', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Final (M104, 1 match)
INSERT INTO public.matches (id, group_letter, round, stage, match_number, home_label, away_label, status) VALUES
  ('M104', NULL, 'FINAL', 'KNOCKOUT', 'M104', 'WM101', 'WM102', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Settings seed
INSERT INTO public.settings (id, lock_deadline, locked, entry_fee_cents) VALUES
  (1, '2026-06-11T17:00:00Z', false, 200)
ON CONFLICT (id) DO NOTHING;

-- Sync log seed
INSERT INTO public.sync_log (id, last_sync_at, sync_status) VALUES
  (1, NULL, 'never')
ON CONFLICT (id) DO NOTHING;

-- Bonus answers seed
INSERT INTO public.bonus_answers (id, top_scorer, best_player) VALUES
  (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------
-- TRIGGER: Auto-create profile on signup
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
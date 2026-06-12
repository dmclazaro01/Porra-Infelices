-- Server-side security fixes
-- 1. is_pool_locked() function
-- 2. Lock enforcement on prediction tables via RLS
-- 3. Profile role change prevention

-- 1. Function to check if the pool is locked (deadline passed or locked flag)
CREATE OR REPLACE FUNCTION public.is_pool_locked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT locked OR lock_deadline <= NOW()
     FROM public.settings
     WHERE id = 1),
    false
  );
$$;

-- 2. Add lock check to all prediction table INSERT/UPDATE policies
ALTER POLICY group_predictions_insert_self ON group_predictions
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY group_predictions_update_self ON group_predictions
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY tiebreak_predictions_insert_self ON tiebreak_predictions
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY tiebreak_predictions_update_self ON tiebreak_predictions
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY knockout_predictions_insert_self ON knockout_predictions
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY knockout_predictions_update_self ON knockout_predictions
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY bonus_predictions_insert_self ON bonus_predictions
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

ALTER POLICY bonus_predictions_update_self ON bonus_predictions
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_pool_locked());

-- 3. Prevent regular users from changing their own role
-- Admin can still change roles via profiles_update_admin policy (OR'd with this one)
ALTER POLICY profiles_update_self ON profiles
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

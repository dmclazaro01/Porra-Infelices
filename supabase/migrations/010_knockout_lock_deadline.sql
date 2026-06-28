-- Add a separate lock deadline for knockout predictions.
-- Groups/bonus remain controlled by settings.locked / settings.lock_deadline.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS knockout_lock_deadline TIMESTAMPTZ;

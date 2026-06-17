-- Add knockout_editable column to settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS knockout_editable BOOLEAN NOT NULL DEFAULT false;

-- Admin can update this column via the existing settings_update_admin policy

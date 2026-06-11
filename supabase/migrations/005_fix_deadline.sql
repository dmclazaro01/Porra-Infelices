-- Fix deadline to be in the future so admin can unlock the pool
-- This is critical: if deadline is in the past, the pool is automatically locked
UPDATE settings SET 
  lock_deadline = '2026-06-14T20:00:00Z',
  locked = false
WHERE id = 1;

-- Verify the change
SELECT lock_deadline, locked FROM settings WHERE id = 1;
